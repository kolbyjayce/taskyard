import fs from "fs/promises";
import path from "path";
import type { FileStore } from "../store.js";
import type { Config } from "../config.js";

export class Watchdog {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private store: FileStore,
    private config: Config
  ) {}

  start() {
    // Run every 2× the heartbeat interval
    const interval = this.config.heartbeat_interval_seconds * 2 * 1000;
    this.timer = setInterval(() => this.sweep(), interval);
    console.error(`Watchdog started — sweep every ${interval / 1000}s`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep() {
    const projects = await this.listProjects();

    for (const project of projects) {
      const tasks = await this.store.listTasks(project, { status: "in-progress" });

      for (const task of tasks) {
        const lockInfo = await this.store.getLockInfo(project, task.id);

        // ── Case 1: Lock exists but heartbeat is expired ────────────────────
        if (lockInfo) {
          const lastBeat = new Date(lockInfo.last_heartbeat).getTime();
          const elapsed = Date.now() - lastBeat;
          const timeout = this.config.lock_timeout_seconds * 1000;

          if (elapsed > timeout) {
            await this.reclaim(project, task.id, lockInfo.agent_id, "heartbeat_expired");
            continue;
          }
        }

        // ── Case 2: No lock but task is in-progress (crash with no lock) ───
        if (!lockInfo && !task.needs_handoff) {
          await this.reclaim(project, task.id, task.assigned_to ?? "unknown", "no_lock");
          continue;
        }

        // ── Case 3: Stalled — heartbeat alive but no progress ───────────────
        if (task.last_progress_at) {
          const lastProgress = new Date(task.last_progress_at).getTime();
          const stallTime = this.config.stall_threshold_seconds * 1000;

          if (Date.now() - lastProgress > stallTime) {
            await this.flagStalled(project, task.id);
          }
        }

        // ── Case 4: Too many attempts — escalate to human ───────────────────
        if (task.attempt_count >= this.config.max_attempts_before_escalation) {
          await this.escalate(project, task.id);
        }
      }
    }
  }

  private async reclaim(project: string, taskId: string, agentId: string, reason: string) {
    console.error(`[watchdog] Reclaiming ${taskId} from ${agentId} — reason: ${reason}`);
    await this.store.releaseLock(project, taskId);
    await this.store.updateTask(project, taskId, {
      status: "backlog",
      assigned_to: null,
      needs_handoff: false,
    });
    await this.store.appendLog(
      project, taskId, "watchdog",
      `[WATCHDOG] Lock expired (${reason}) — task requeued to backlog. Previous agent: ${agentId}`
    );
    await this.store.appendChangelog(
      `WATCHDOG_RECLAIM ${taskId} from ${agentId} (${reason})`
    );
  }

  private async flagStalled(project: string, taskId: string) {
    const task = await this.store.readTask(project, taskId);
    if (task.status === "blocked") return; // already flagged

    console.error(`[watchdog] Flagging ${taskId} as stalled`);
    await this.store.appendLog(
      project, taskId, "watchdog",
      `[WATCHDOG] No progress detected in ${this.config.stall_threshold_seconds / 60} minutes. ` +
      `Task may be stalled. Human review recommended.`
    );
    // Dashboard will surface stalled tasks via get_status
  }

  private async escalate(project: string, taskId: string) {
    const task = await this.store.readTask(project, taskId);
    console.error(`[watchdog] Escalating ${taskId} — attempt_count: ${task.attempt_count}`);
    await this.store.updateTask(project, taskId, { status: "blocked" });
    await this.store.appendLog(
      project, taskId, "watchdog",
      `[WATCHDOG] Task has failed ${task.attempt_count} times — escalating to human review.`
    );
    await this.store.appendChangelog(`WATCHDOG_ESCALATE ${taskId} after ${task.attempt_count} attempts`);
  }

  private async listProjects(): Promise<string[]> {
    const projectsDir = path.join(this.store.root, "projects");
    const entries = await fs.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  }
}
