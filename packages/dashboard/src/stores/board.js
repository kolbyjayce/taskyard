"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBoardStore = void 0;
const zustand_1 = require("zustand");
// The MCP server exposes an HTTP adapter on localhost:3456/api
// This keeps the dashboard fully local without needing a separate REST server
const API = "/api";
async function mcpCall(tool, args) {
    const res = await fetch(`${API}/tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args }),
    });
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}
exports.useBoardStore = (0, zustand_1.create)((set, get) => ({
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
        }
        catch (e) {
            set({ error: String(e), loading: false });
        }
    },
    updateTask: async (taskId, patch) => {
        const { project, tasks } = get();
        // Optimistic update
        set({ tasks: tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) });
        try {
            await mcpCall("update_task", { project, task_id: taskId, ...patch });
        }
        catch (e) {
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
//# sourceMappingURL=board.js.map