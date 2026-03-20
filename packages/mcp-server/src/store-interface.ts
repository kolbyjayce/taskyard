import { Task, TaskStatusType } from "./schema.js";

/**
 * Common interface for task stores
 * Both FileStore (single project) and MultiProjectStore (multiple projects) implement this
 */
export interface TaskStore {
  // Task operations
  listTasks(projectId: string, status?: TaskStatusType): Promise<Task[]>;
  getTask?(projectId: string, taskId: string): Promise<Task | null>;
  updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task | null>;
  createTask(projectId: string, task: Omit<Task, "id">): Promise<Task>;

  // Agent operations
  claimTask?(projectId: string, taskId: string, agentId: string): Promise<Task | null>;
  releaseTask?(projectId: string, taskId: string, agentId: string): Promise<Task | null>;
  appendLog?(projectId: string, taskId: string, message: string, agentId: string): Promise<void>;

  // Status operations
  getStatusCounts?(projectId: string): Promise<Record<TaskStatusType, number>>;
}

/**
 * Adapter to make FileStore compatible with TaskStore interface
 */
export class FileStoreAdapter implements TaskStore {
  constructor(
    private fileStore: import("./store.js").FileStore,
    private defaultProject: string = "default"
  ) {}

  async listTasks(projectId: string, status?: TaskStatusType): Promise<Task[]> {
    return this.fileStore.listTasks(projectId, status ? { status } : undefined);
  }

  async getTask(projectId: string, taskId: string): Promise<Task | null> {
    try {
      const task = await this.fileStore.readTask(projectId, taskId);
      return task;
    } catch {
      return null;
    }
  }

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      return await this.fileStore.updateTask(projectId, taskId, updates);
    } catch {
      return null;
    }
  }

  async createTask(projectId: string, task: Omit<Task, "id">): Promise<Task> {
    return this.fileStore.createTask(projectId, task);
  }

  async claimTask(projectId: string, taskId: string, agentId: string): Promise<Task | null> {
    const acquired = await this.fileStore.acquireLock(projectId, taskId, agentId);
    if (!acquired) return null;
    return this.getTask(projectId, taskId);
  }

  async releaseTask(projectId: string, taskId: string, agentId: string): Promise<Task | null> {
    await this.fileStore.releaseLock(projectId, taskId);
    return this.getTask(projectId, taskId);
  }

  async appendLog(projectId: string, taskId: string, message: string, agentId: string): Promise<void> {
    return this.fileStore.appendLog(projectId, taskId, agentId, message);
  }

  async getStatusCounts(projectId: string): Promise<Record<TaskStatusType, number>> {
    const tasks = await this.listTasks(projectId);
    const counts: Record<TaskStatusType, number> = {
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

/**
 * Adapter to make MultiProjectStore compatible with TaskStore interface
 */
export class MultiProjectStoreAdapter implements TaskStore {
  constructor(
    private multiStore: import("./multi-project-store.js").MultiProjectStore
  ) {}

  async listTasks(projectId: string, status?: TaskStatusType): Promise<Task[]> {
    const tasksWithProject = await this.multiStore.listTasks(projectId, status);
    // Strip project metadata to return plain Task objects
    return tasksWithProject.map(({ projectPath, projectName, ...task }) => task);
  }

  async getTask(projectId: string, taskId: string): Promise<Task | null> {
    const taskWithProject = await this.multiStore.getTask(taskId, projectId);
    if (!taskWithProject) return null;
    // Strip project metadata
    const { projectPath, projectName, ...task } = taskWithProject;
    return task;
  }

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
    return this.multiStore.updateTask(projectId, taskId, updates);
  }

  async createTask(projectId: string, task: Omit<Task, "id">): Promise<Task> {
    return this.multiStore.createTask(task, projectId);
  }

  async claimTask(projectId: string, taskId: string, agentId: string): Promise<Task | null> {
    return this.multiStore.claimTask(projectId, taskId, agentId);
  }

  async releaseTask(projectId: string, taskId: string, agentId: string): Promise<Task | null> {
    return this.multiStore.releaseTask(projectId, taskId, agentId);
  }

  async appendLog(projectId: string, taskId: string, message: string, agentId: string): Promise<void> {
    return this.multiStore.appendLog(projectId, taskId, message, agentId);
  }

  async getStatusCounts(projectId: string): Promise<Record<TaskStatusType, number>> {
    const aggregated = await this.multiStore.getProjectStatusCounts(projectId);
    return aggregated;
  }
}