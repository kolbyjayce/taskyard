import { create } from "zustand";

export type TaskStatus = "backlog" | "in-progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  claimed_at: string | null;
  last_heartbeat: string | null;
  last_progress_at: string | null;
  needs_handoff: boolean;
  attempt_count: number;
  previous_agents: string[];
  tags: string[];
  project: string;
}

interface BoardStore {
  tasks: Task[];
  project: string;
  selectedTaskId: string | null;
  loading: boolean;
  error: string | null;

  setProject: (project: string) => void;
  selectTask: (taskId: string | null) => void;
  fetchTasks: () => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  createTask: (fields: Pick<Task, "title" | "priority" | "tags">) => Promise<void>;
}

// The MCP server exposes an HTTP adapter on localhost:3456/api
// This keeps the dashboard fully local without needing a separate REST server
const API = "/api";

async function mcpCall(tool: string, args: Record<string, unknown>) {
  const res = await fetch(`${API}/tool`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, args }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  tasks: [],
  project: "default",
  selectedTaskId: null,
  loading: false,
  error: null,

  setProject: (project) => {
    set({ project });
    get().fetchTasks();
  },

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  fetchTasks: async () => {
    const { project } = get();
    set({ loading: true, error: null });
    try {
      const result = await mcpCall("list_tasks", { project });
      set({ tasks: result, loading: false });
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  updateTask: async (taskId, patch) => {
    const { project, tasks } = get();
    // Optimistic update
    set({ tasks: tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) });
    try {
      await mcpCall("update_task", { project, task_id: taskId, ...patch });
    } catch (e) {
      // Revert on failure
      await get().fetchTasks();
      throw e;
    }
  },

  createTask: async (fields) => {
    const { project } = get();
    await mcpCall("create_task", { project, ...fields, created_by: "human" });
    await get().fetchTasks();
  },
}));
