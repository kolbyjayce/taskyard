export type TaskStatus = "backlog" | "in-progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  depends_on: string[];
  created_by: string;
  due_date: string | null;
  context: string | null;
  project: string;
}

export interface TaskWithBody extends Task {
  body: string;
}

export interface Project {
  name: string;
  taskCount: number;
  icon?: string;
  color?: string;
}

export interface TaskFilter {
  project?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  context?: string;
  tag?: string;
  excludeDone?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateTaskInput {
  project: string;
  title: string;
  priority?: TaskPriority;
  tags?: string[];
  depends_on?: string[];
  due_date?: string | null;
  context?: string | null;
  notes?: string;
}
