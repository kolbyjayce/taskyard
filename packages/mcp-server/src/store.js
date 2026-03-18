import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { TaskFrontmatter, isValidTransition } from "./schema.js";
export class FileStore {
    root;
    config;
    constructor(root, config) {
        this.root = root;
        this.config = config;
    }
    // ── Task ID generation ────────────────────────────────────────────────────
    async nextTaskId(project) {
        const dir = this.taskDir(project);
        const files = await fs.readdir(dir).catch(() => []);
        const ids = files
            .filter(f => f.match(/^TASK-\d+\.md$/))
            .map(f => parseInt(f.replace("TASK-", "").replace(".md", ""), 10));
        const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
        return `TASK-${String(next).padStart(3, "0")}`;
    }
    // ── Reading ───────────────────────────────────────────────────────────────
    async readTask(project, taskId) {
        const filePath = this.taskPath(project, taskId);
        const raw = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(raw);
        const task = TaskFrontmatter.parse(data);
        return { ...task, body: content };
    }
    async listTasks(project, filter) {
        const dir = this.taskDir(project);
        const files = await fs.readdir(dir).catch(() => []);
        const tasks = [];
        for (const file of files.filter(f => f.endsWith(".md"))) {
            const raw = await fs.readFile(path.join(dir, file), "utf-8");
            const { data } = matter(raw);
            const task = TaskFrontmatter.safeParse(data);
            if (!task.success)
                continue;
            if (filter?.status && task.data.status !== filter.status)
                continue;
            if (filter?.priority && task.data.priority !== filter.priority)
                continue;
            tasks.push(task.data);
        }
        return tasks;
    }
    // ── Writing ───────────────────────────────────────────────────────────────
    async createTask(project, fields) {
        const id = await this.nextTaskId(project);
        const task = TaskFrontmatter.parse({
            id,
            project,
            status: "backlog",
            ...fields,
        });
        const content = matter.stringify(taskBodyTemplate(task), task);
        const filePath = this.taskPath(project, id);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content);
        await this.appendChangelog(`CREATE ${id} "${task.title}" by ${task.created_by}`);
        return task;
    }
    async updateTask(project, taskId, patch) {
        const existing = await this.readTask(project, taskId);
        // Enforce valid status transitions
        if (patch.status && patch.status !== existing.status) {
            if (!isValidTransition(existing.status, patch.status)) {
                throw new Error(`Invalid transition: ${existing.status} → ${patch.status}`);
            }
        }
        const updated = { ...existing, ...patch };
        const { body, ...frontmatter } = updated;
        const raw = matter.stringify(body, frontmatter);
        await fs.writeFile(this.taskPath(project, taskId), raw);
        return updated;
    }
    // ── Locking (atomic via O_EXCL) ───────────────────────────────────────────
    async acquireLock(project, taskId, agentId) {
        const lockPath = this.lockPath(project, taskId);
        const lockData = JSON.stringify({
            agent_id: agentId,
            claimed_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
        });
        try {
            // O_EXCL = fail if file already exists — atomic
            await fs.writeFile(lockPath, lockData, { flag: "wx" });
            return true;
        }
        catch {
            return false; // already locked
        }
    }
    async releaseLock(project, taskId) {
        await fs.unlink(this.lockPath(project, taskId)).catch(() => { });
    }
    async touchHeartbeat(project, taskId) {
        const lockPath = this.lockPath(project, taskId);
        const raw = await fs.readFile(lockPath, "utf-8").catch(() => null);
        if (!raw)
            return;
        const lock = JSON.parse(raw);
        lock.last_heartbeat = new Date().toISOString();
        await fs.writeFile(lockPath, JSON.stringify(lock, null, 2));
        // Also update task frontmatter so watchdog sees it
        await this.updateTask(project, taskId, {
            last_heartbeat: lock.last_heartbeat,
        });
    }
    async getLockInfo(project, taskId) {
        const lockPath = this.lockPath(project, taskId);
        const raw = await fs.readFile(lockPath, "utf-8").catch(() => null);
        return raw ? JSON.parse(raw) : null;
    }
    // ── Log / changelog ───────────────────────────────────────────────────────
    async appendLog(project, taskId, agentId, message) {
        const task = await this.readTask(project, taskId);
        const entry = `\n<!-- log:${new Date().toISOString()} agent:${agentId} -->\n**${agentId}** — ${message}\n`;
        const { body, ...frontmatter } = task;
        const updated = matter.stringify(body + entry, { ...frontmatter, last_progress_at: new Date().toISOString() });
        await fs.writeFile(this.taskPath(project, taskId), updated);
    }
    async appendChangelog(entry) {
        const logPath = path.join(this.root, "CHANGELOG.md");
        const line = `\n${new Date().toISOString()} — ${entry}\n`;
        await fs.appendFile(logPath, line);
    }
    // ── Checkpoint / handoff ──────────────────────────────────────────────────
    async writeCheckpoint(project, taskId, checkpoint) {
        const handoffPath = path.join(this.taskDir(project), taskId, "HANDOFF.md");
        await fs.mkdir(path.dirname(handoffPath), { recursive: true });
        const content = `---
checkpoint_by: ${checkpoint.agent_id}
checkpoint_at: ${new Date().toISOString()}
completion_estimate: ${checkpoint.completion_estimate}%
---

## Work completed
${checkpoint.work_completed.map(l => `- ${l}`).join("\n")}

## Work remaining
${checkpoint.work_remaining.map(l => `- ${l}`).join("\n")}

## Known issues
${checkpoint.known_issues.map(l => `- ${l}`).join("\n")}

## Files modified
${checkpoint.files_modified.map(l => `- ${l}`).join("\n")}

## Notes for next agent
${checkpoint.notes}
`;
        await fs.writeFile(handoffPath, content);
        await this.appendLog(project, taskId, checkpoint.agent_id, `Wrote checkpoint (${checkpoint.completion_estimate}% complete)`);
    }
    // ── Path helpers ──────────────────────────────────────────────────────────
    taskDir(project) {
        return path.join(this.root, "projects", project, "tasks");
    }
    taskPath(project, taskId) {
        return path.join(this.taskDir(project), `${taskId}.md`);
    }
    lockPath(project, taskId) {
        return path.join(this.taskDir(project), `${taskId}.lock`);
    }
}
function taskBodyTemplate(task) {
    return `
## Objective
_Describe the goal of this task._

## Acceptance criteria
- [ ] _Add criteria here_

## Agent log
<!-- The MCP server appends entries here via append_log -->
`;
}
//# sourceMappingURL=store.js.map