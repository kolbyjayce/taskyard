import { z } from "zod";
export function registerTaskTools(server, store) {
    // ── list_tasks ─────────────────────────────────────────────────────────────
    server.tool("list_tasks", "List tasks for a project, optionally filtered by status or priority.", {
        project: z.string().describe("Project name"),
        status: z.enum(["backlog", "in-progress", "review", "done", "blocked"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    }, async ({ project, status, priority }) => {
        const tasks = await store.listTasks(project, { status, priority });
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(tasks, null, 2),
                }],
        };
    });
    // ── read_task ──────────────────────────────────────────────────────────────
    server.tool("read_task", "Read the full contents of a task file including its agent log.", {
        project: z.string(),
        task_id: z.string().describe("e.g. TASK-001"),
    }, async ({ project, task_id }) => {
        const task = await store.readTask(project, task_id);
        return {
            content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
    });
    // ── claim_task ─────────────────────────────────────────────────────────────
    server.tool("claim_task", "Atomically claim a task. Fails if another agent already holds it.", {
        project: z.string(),
        task_id: z.string(),
        agent_id: z.string().describe("Unique identifier for this agent instance"),
    }, async ({ project, task_id, agent_id }) => {
        const acquired = await store.acquireLock(project, task_id, agent_id);
        if (!acquired) {
            const lock = await store.getLockInfo(project, task_id);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            reason: "Task already claimed",
                            held_by: lock?.agent_id,
                            since: lock?.claimed_at,
                        }),
                    }],
                isError: true,
            };
        }
        await store.updateTask(project, task_id, {
            status: "in-progress",
            assigned_to: agent_id,
            claimed_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
            attempt_count: (await store.readTask(project, task_id)).attempt_count + 1,
        });
        await store.appendChangelog(`CLAIM ${task_id} by ${agent_id}`);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, task_id }) }],
        };
    });
    // ── heartbeat ──────────────────────────────────────────────────────────────
    server.tool("heartbeat", "Update the heartbeat timestamp for a claimed task. Call every 5 minutes.", {
        project: z.string(),
        task_id: z.string(),
        agent_id: z.string(),
    }, async ({ project, task_id, agent_id }) => {
        const lock = await store.getLockInfo(project, task_id);
        if (!lock || lock.agent_id !== agent_id) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, reason: "Not your lock" }) }],
                isError: true,
            };
        }
        await store.touchHeartbeat(project, task_id);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
    });
    // ── append_log ─────────────────────────────────────────────────────────────
    server.tool("append_log", "Append a timestamped entry to the task's agent log. Updates last_progress_at.", {
        project: z.string(),
        task_id: z.string(),
        agent_id: z.string(),
        message: z.string().describe("What you just did or observed"),
    }, async ({ project, task_id, agent_id, message }) => {
        await store.appendLog(project, task_id, agent_id, message);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
    });
    // ── write_checkpoint ───────────────────────────────────────────────────────
    server.tool("write_checkpoint", "Write a HANDOFF.md for this task. Call when approaching context limit before release_task.", {
        project: z.string(),
        task_id: z.string(),
        agent_id: z.string(),
        completion_estimate: z.number().min(0).max(100),
        work_completed: z.array(z.string()),
        work_remaining: z.array(z.string()),
        known_issues: z.array(z.string()).default([]),
        files_modified: z.array(z.string()).default([]),
        notes: z.string().default(""),
    }, async (args) => {
        await store.writeCheckpoint(args.project, args.task_id, args);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
    });
    // ── release_task ───────────────────────────────────────────────────────────
    server.tool("release_task", "Gracefully release a task back to the pool (e.g. context limit reached). Write a checkpoint first.", {
        project: z.string(),
        task_id: z.string(),
        agent_id: z.string(),
    }, async ({ project, task_id, agent_id }) => {
        await store.updateTask(project, task_id, {
            status: "in-progress", // stays in-progress, needs_handoff flags it
            assigned_to: null,
            needs_handoff: true,
            previous_agents: [
                ...(await store.readTask(project, task_id)).previous_agents,
                agent_id,
            ],
        });
        await store.releaseLock(project, task_id);
        await store.appendChangelog(`RELEASE ${task_id} by ${agent_id} (needs handoff)`);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
    });
    // ── complete_task ──────────────────────────────────────────────────────────
    server.tool("complete_task", "Mark a task as done. Releases the lock and records a summary.", {
        project: z.string(),
        task_id: z.string(),
        agent_id: z.string(),
        summary: z.string().describe("2–3 sentence summary of what was accomplished"),
    }, async ({ project, task_id, agent_id, summary }) => {
        await store.appendLog(project, task_id, agent_id, `**Completed:** ${summary}`);
        await store.updateTask(project, task_id, {
            status: "done",
            assigned_to: null,
            needs_handoff: false,
        });
        await store.releaseLock(project, task_id);
        await store.appendChangelog(`COMPLETE ${task_id} by ${agent_id}: ${summary}`);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
    });
    // ── create_task ────────────────────────────────────────────────────────────
    server.tool("create_task", "Create a new task in the backlog.", {
        project: z.string(),
        title: z.string(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        tags: z.array(z.string()).default([]),
        depends_on: z.array(z.string()).default([]),
        created_by: z.string().default("human"),
        recovery_strategy: z.enum(["resume", "restart"]).default("restart"),
    }, async (args) => {
        const task = await store.createTask(args.project, args);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, task }) }],
        };
    });
    // ── get_status ─────────────────────────────────────────────────────────────
    server.tool("get_status", "Get a summary of the current board — counts by status, stalled tasks, recent activity.", {
        project: z.string(),
    }, async ({ project }) => {
        const tasks = await store.listTasks(project);
        const counts = tasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] ?? 0) + 1;
            return acc;
        }, {});
        const now = Date.now();
        const stalled = tasks.filter(t => {
            if (t.status !== "in-progress")
                return false;
            if (!t.last_progress_at)
                return false;
            return now - new Date(t.last_progress_at).getTime() > 30 * 60 * 1000;
        });
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ counts, stalled: stalled.map(t => t.id) }, null, 2),
                }],
        };
    });
}
//# sourceMappingURL=tasks.js.map