import { Task, TaskStatus } from "./schema.js";

/**
 * Common interface for task stores
 * Both FileStore (single project) and MultiProjectStore (multiple projects) implement this
 */
export interface TaskStore {
  // Task operations
  listTasks(status?: TaskStatus): Promise<Task[]>;
  getTask?(taskId: string): Promise<Task | null>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null>;
  createTask(task: Omit<Task, "id">): Promise<Task>;

  // Agent operations
  claimTask?(taskId: string, agentId: string): Promise<Task | null>;
  releaseTask?(taskId: string, agentId: string): Promise<Task | null>;
  appendLog?(taskId: string, message: string, agentId: string): Promise<void>;

  // Status operations
  getStatusCounts?(): Promise<Record<TaskStatus, number>>;
}

/**
 * Adapter to make FileStore compatible with TaskStore interface
 */
export class FileStoreAdapter implements TaskStore {
  constructor(
    private fileStore: import("./store.js").FileStore,
    private defaultProject: string = "default"
  ) {}

  async listTasks(status?: TaskStatus): Promise<Task[]> {
    return this.fileStore.listTasks(this.defaultProject, status ? { status } : undefined);
  }

  async getTask(taskId: string): Promise<Task | null> {
    try {
      const task = await this.fileStore.readTask(this.defaultProject, taskId);
      return task;
    } catch {
      return null;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      return await this.fileStore.updateTask(this.defaultProject, taskId, updates);
    } catch {
      return null;
    }
  }

  async createTask(task: Omit<Task, "id">): Promise<Task> {
    return this.fileStore.createTask(this.defaultProject, {
      title: task.title,
      ...task,
    });
  }

  async claimTask(taskId: string, agentId: string): Promise<Task | null> {
    const acquired = await this.fileStore.acquireLock(this.defaultProject, taskId, agentId);
    if (!acquired) return null;
    return this.getTask(taskId);
  }

  async releaseTask(taskId: string, agentId: string): Promise<Task | null> {
    await this.fileStore.releaseLock(this.defaultProject, taskId);
    return this.getTask(taskId);
  }

  async appendLog(taskId: string, message: string, agentId: string): Promise<void> {
    return this.fileStore.appendLog(this.defaultProject, taskId, agentId, message);
  }

  async getStatusCounts(): Promise<Record<TaskStatus, number>> {
    const tasks = await this.listTasks();
    const counts: Record<TaskStatus, number> = {
      backlog: 0,
      "in-progress": 0,
      review: 0,
      done: 0,
      blocked: 0,
    };

    for (const task of tasks) {
      counts[task.status]++;
    }

    return counts;
  }
}