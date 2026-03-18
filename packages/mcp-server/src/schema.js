import { z } from "zod";
export const TaskStatus = z.enum([
    "backlog",
    "in-progress",
    "review",
    "done",
    "blocked",
]);
export const TaskPriority = z.enum(["low", "medium", "high", "critical"]);
export const RecoveryStrategy = z.enum(["resume", "restart"]);
// The frontmatter schema for every TASK-NNN.md file
export const TaskFrontmatter = z.object({
    id: z.string(), // "TASK-001"
    title: z.string(),
    status: TaskStatus,
    priority: TaskPriority.default("medium"),
    assigned_to: z.string().nullable().default(null),
    claimed_at: z.string().nullable().default(null),
    last_heartbeat: z.string().nullable().default(null),
    last_progress_at: z.string().nullable().default(null),
    heartbeat_interval: z.number().default(300), // seconds
    needs_handoff: z.boolean().default(false),
    attempt_count: z.number().default(0),
    previous_agents: z.array(z.string()).default([]),
    depends_on: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    created_by: z.string().default("human"),
    recovery_strategy: RecoveryStrategy.default("restart"),
    project: z.string(),
});
// Valid status transitions — enforced by update_task
export const VALID_TRANSITIONS = {
    backlog: ["in-progress"],
    "in-progress": ["review", "blocked", "done"],
    review: ["in-progress", "done", "blocked"],
    blocked: ["backlog", "in-progress"],
    done: [], // terminal
};
export function isValidTransition(from, to) {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
//# sourceMappingURL=schema.js.map