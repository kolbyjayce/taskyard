import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileStore } from "../store.js";

export function registerTaskTools(server: McpServer, store: FileStore) {

  // ── list_projects ───────────────────────────────────────────────────────────
  server.registerTool(
    "list_projects",
    {
      description: "List all projects and their task counts.",
    },
    async () => {
      const projects = await store.listProjects();
      return {
        content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      };
    }
  );

  // ── list_tasks ──────────────────────────────────────────────────────────────
  server.registerTool(
    "list_tasks",
    {
      description: "List tasks filtered by project, status, priority, context, or tag. Pass project=\"all\" to query across all projects.",
      inputSchema: {
        project: z.string().default("default").describe("Project name, or \"all\" to query every project"),
        status: z.enum(["backlog", "in-progress", "done", "blocked"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        context: z.string().optional(),
        tag: z.string().optional(),
        due_date: z.string().optional(),
      },
    },
    async ({ project, status, priority, context, tag, due_date }) => {
      const tasks = await store.listTasks(project, { status, priority, context, tag, due_date });
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      };
    }
  );

  // ── read_task ───────────────────────────────────────────────────────────────
  server.registerTool(
    "read_task",
    {
      description: "Read the full contents of a task file.",
      inputSchema: {
        project: z.string().default("default"),
        task_id: z.string().describe("e.g. TASK-001"),
      },
    },
    async ({ project, task_id }) => {
      const task = await store.readTask(project, task_id);
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    }
  );

  // ── create_task ─────────────────────────────────────────────────────────────
  server.registerTool(
    "create_task",
    {
      description: "Create a new task. The agent should infer priority, context, and due_date from the intent.",
      inputSchema: {
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
    },
    async (args) => {
      const task = await store.createTask(args.project, args);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, task }) }],
      };
    }
  );

  // ── update_task ─────────────────────────────────────────────────────────────
  server.registerTool(
    "update_task",
    {
      description: "Update task metadata. Use this to reprioritize, reschedule, or change status.",
      inputSchema: {
        project: z.string().default("default"),
        task_id: z.string(),
        title: z.string().optional(),
        status: z.enum(["backlog", "in-progress", "done", "blocked"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        tags: z.array(z.string()).optional(),
        due_date: z.string().nullable().optional(),
        context: z.string().nullable().optional(),
      },
    },
    async (args) => {
      const { project, task_id, ...updates } = args;
      await store.updateTask(project, task_id, updates);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  // ── move_task ───────────────────────────────────────────────────────────────
  server.registerTool(
    "move_task",
    {
      description: "Move a task to a different project. The task gets a new ID in the destination project.",
      inputSchema: {
        from_project: z.string().default("default"),
        task_id: z.string(),
        to_project: z.string(),
      },
    },
    async ({ from_project, task_id, to_project }) => {
      const moved = await store.moveTask(from_project, task_id, to_project);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, task: moved }) }],
      };
    }
  );

  // ── delete_task ─────────────────────────────────────────────────────────────
  server.registerTool(
    "delete_task",
    {
      description: "Permanently delete a task. Use when a task is cancelled or no longer relevant.",
      inputSchema: {
        project: z.string().default("default"),
        task_id: z.string(),
      },
    },
    async ({ project, task_id }) => {
      await store.deleteTask(project, task_id);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  // ── get_status ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_status",
    {
      description: "Get task counts by status. Pass project=\"all\" for a cross-project summary.",
      inputSchema: {
        project: z.string().default("default").describe("Project name, or \"all\" for all projects"),
      },
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
