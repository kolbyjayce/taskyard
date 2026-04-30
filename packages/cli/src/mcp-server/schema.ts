import { z } from "zod";

export const TaskStatus = z.enum([
  "backlog",
  "in-progress",
  "done",
  "blocked",
]);

export const TaskPriority = z.enum(["low", "medium", "high", "critical"]);

export const TaskFrontmatter = z.object({
  id: z.string(),
  title: z.string(),
  status: TaskStatus,
  priority: TaskPriority.default("medium"),
  tags: z.array(z.string()).default([]),
  depends_on: z.array(z.string()).default([]),
  created_by: z.string().default("human"),
  due_date: z.string().nullable().default(null),   // ISO date string, e.g. "2026-05-10"
  context: z.string().nullable().default(null),    // e.g. "work", "home", "health"
  project: z.string(),
});

export type Task = z.infer<typeof TaskFrontmatter>;
export type TaskStatusType = z.infer<typeof TaskStatus>;
