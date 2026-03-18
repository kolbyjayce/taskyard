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
export declare const useBoardStore: import("zustand").UseBoundStore<import("zustand").StoreApi<BoardStore>>;
export {};
//# sourceMappingURL=board.d.ts.map