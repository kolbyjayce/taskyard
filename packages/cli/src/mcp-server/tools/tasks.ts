import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileStore } from "../store.js";

export function registerTaskTools(server: McpServer, store: FileStore) {

  // ── list_tasks ──────────────────────────────────────────────────────────────
  server.tool(
    "list_tasks",
    "List tasks, optionally filtered by project, status, priority, context, or tag.",
    {
      project: z.string().default("default"),
      status: z.enum(["backlog", "in-progress", "done", "blocked"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      context: z.string().optional(),
      tag: z.string().optional(),
    },
    async ({ project, status, priority, context, tag }) => {
      const tasks = await store.listTasks(project, { status, priority, context, tag });
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      };
    }
  );

  // ── read_task ───────────────────────────────────────────────────────────────
  server.tool(
    "read_task",
    "Read the full contents of a task file.",
    {
      project: z.string().default("default"),
      task_id: z.string().describe("e.g. TASK-001"),
    },
    async ({ project, task_id }) => {
      const task = await store.readTask(project, task_id);
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    }
  );

  // ── create_task ─────────────────────────────────────────────────────────────
  server.tool(
    "create_task",
    "Create a new task. The agent should infer priority, context, and due_date from the intent.",
    {
      project: z.string().default("default"),
      title: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      tags: z.array(z.string()).default([]),
      depends_on: z.array(z.string()).default([]),
      created_by: z.string().default("agent"),
      due_date: z.string().nullable().default(null).describe("ISO date, e.g. 2026-05-10"),
      context: z.string().nullable().default(null).describe("Area of life, e.g. work, home, health"),
      notes: z.string().default("").describe("Any additional detail to include in the task body"),
    },
    async (args) => {
      const task = await store.createTask(args.project, args);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, task }) }],
      };
    }
  );

  // ── update_task ─────────────────────────────────────────────────────────────
  server.tool(
    "update_task",
    "Update task metadata. Use this to reprioritize, reschedule, or change status.",
    {
      project: z.string().default("default"),
      task_id: z.string(),
      title: z.string().optional(),
      status: z.enum(["backlog", "in-progress", "done", "blocked"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      tags: z.array(z.string()).optional(),
      due_date: z.string().nullable().optional(),
      context: z.string().nullable().optional(),
    },
    async (args) => {
      const { project, task_id, ...updates } = args;
      await store.updateTask(project, task_id, updates);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  // ── delete_task ─────────────────────────────────────────────────────────────
  server.tool(
    "delete_task",
    "Permanently delete a task. Use when a task is cancelled or no longer relevant.",
    {
      project: z.string().default("default"),
      task_id: z.string(),
    },
    async ({ project, task_id }) => {
      await store.deleteTask(project, task_id);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  // ── get_status ──────────────────────────────────────────────────────────────
  server.tool(
    "get_status",
    "Get a count of tasks by status across a project. Useful for daily briefings.",
    {
      project: z.string().default("default"),
    },
    async ({ project }) => {
      const tasks = await store.listTasks(project);
      const counts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return {
        content: [{ type: "text", text: JSON.stringify({ project, counts, total: tasks.length }, null, 2) }],
      };
    }
  );
}
