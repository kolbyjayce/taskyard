import fs from "fs/promises";
import path from "path";
import { FileStore } from "./store.js";
import { Config } from "./config.js";
import { Task, TaskStatus } from "./schema.js";
import { TaskStore } from "./store-interface.js";

interface ProjectRegistry {
  projects: {
    [projectPath: string]: {
      name: string;
      registered_at: string;
      last_accessed: string;
      mcp_profile?: string;
    };
  };
}

/**
 * Multi-project store that aggregates tasks from multiple registered projects
 * Used in central mode to provide unified view across all projects
 */
export class MultiProjectStore {
  private stores: Map<string, FileStore> = new Map();
  private projectRegistry: ProjectRegistry | null = null;

  constructor(private config: Config) {}

  /**
   * Load project registry from central config
   */
  private async loadProjectRegistry(): Promise<ProjectRegistry> {
    if (this.projectRegistry) return this.projectRegistry;

    const registryPath = path.join(
      process.env.HOME || process.env.USERPROFILE || ".",
      ".taskyard/config/projects.json"
    );

    try {
      const content = await fs.readFile(registryPath, "utf-8");
      this.projectRegistry = JSON.parse(content);
      return this.projectRegistry!;
    } catch {
      return { projects: {} };
    }
  }

  /**
   * Get or create FileStore for a specific project
   */
  private async getProjectStore(projectPath: string): Promise<FileStore> {
    if (this.stores.has(projectPath)) {
      return this.stores.get(projectPath)!;
    }

    // Verify project path exists and has taskyard config
    try {
      await fs.access(path.join(projectPath, ".taskyard/config.json"));
    } catch {
      throw new Error(`Project not initialized at ${projectPath}`);
    }

    const store = new FileStore(projectPath, this.config);
    this.stores.set(projectPath, store);
    return store;
  }

  /**
   * List all registered projects
   */
  async listProjects(): Promise<Array<{ path: string; name: string; lastAccessed: string }>> {
    const registry = await this.loadProjectRegistry();
    return Object.entries(registry.projects).map(([projectPath, info]) => ({
      path: projectPath,
      name: info.name,
      lastAccessed: info.last_accessed,
    }));
  }

  /**
   * List tasks from all projects or a specific project
   */
  async listTasks(
    projectPath?: string,
    status?: TaskStatus
  ): Promise<Array<Task & { projectPath: string; projectName: string }>> {
    const registry = await this.loadProjectRegistry();

    if (projectPath) {
      // Single project
      const store = await this.getProjectStore(projectPath);
      const tasks = await store.listTasks("default", status ? { status } : undefined);
      const projectName = registry.projects[projectPath]?.name || path.basename(projectPath);

      return tasks.map(task => ({
        ...task,
        projectPath,
        projectName,
      }));
    }

    // All projects
    const allTasks: Array<Task & { projectPath: string; projectName: string }> = [];

    for (const [projPath, info] of Object.entries(registry.projects)) {
      try {
        const store = await this.getProjectStore(projPath);
        const tasks = await store.listTasks("default", status ? { status } : undefined);

        for (const task of tasks) {
          allTasks.push({
            ...task,
            projectPath: projPath,
            projectName: info.name,
          });
        }
      } catch (error) {
        // Skip projects that can't be accessed
        console.warn(`Cannot access project ${projPath}:`, error);
      }
    }

    return allTasks;
  }

  /**
   * Get task by ID, searching across all projects if no project specified
   */
  async getTask(
    taskId: string,
    projectPath?: string
  ): Promise<(Task & { projectPath: string; projectName: string }) | null> {
    const registry = await this.loadProjectRegistry();

    if (projectPath) {
      // Single project
      const store = await this.getProjectStore(projectPath);
      const task = await store.getTask(taskId);
      if (!task) return null;

      const projectName = registry.projects[projectPath]?.name || path.basename(projectPath);
      return {
        ...task,
        projectPath,
        projectName,
      };
    }

    // Search all projects
    for (const [projPath, info] of Object.entries(registry.projects)) {
      try {
        const store = await this.getProjectStore(projPath);
        const task = await store.getTask(taskId);
        if (task) {
          return {
            ...task,
            projectPath: projPath,
            projectName: info.name,
          };
        }
      } catch {
        // Skip inaccessible projects
      }
    }

    return null;
  }

  /**
   * Update task in its specific project
   */
  async updateTask(taskId: string, updates: Partial<Task>, projectPath?: string): Promise<Task | null> {
    // First find the task if project not specified
    if (!projectPath) {
      const taskWithProject = await this.getTask(taskId);
      if (!taskWithProject) return null;
      projectPath = taskWithProject.projectPath;
    }

    const store = await this.getProjectStore(projectPath);
    return store.updateTask(taskId, updates);
  }

  /**
   * Create task in specified project
   */
  async createTask(task: Omit<Task, "id">, projectPath: string): Promise<Task> {
    const store = await this.getProjectStore(projectPath);
    return store.createTask(task);
  }

  /**
   * Get aggregated status across all projects
   */
  async getAggregatedStatus(): Promise<{
    projects: Array<{ name: string; path: string; taskCounts: Record<TaskStatus, number> }>;
    total: Record<TaskStatus, number>;
  }> {
    const registry = await this.loadProjectRegistry();
    const projects = [];
    const total: Record<TaskStatus, number> = {
      backlog: 0,
      "in-progress": 0,
      review: 0,
      done: 0,
      blocked: 0,
    };

    for (const [projPath, info] of Object.entries(registry.projects)) {
      try {
        const store = await this.getProjectStore(projPath);
        const taskCounts = await store.getStatusCounts();

        projects.push({
          name: info.name,
          path: projPath,
          taskCounts,
        });

        // Add to totals
        for (const [status, count] of Object.entries(taskCounts)) {
          total[status as TaskStatus] += count;
        }
      } catch (error) {
        // Skip inaccessible projects
        projects.push({
          name: info.name,
          path: projPath,
          taskCounts: {
            backlog: 0,
            "in-progress": 0,
            review: 0,
            done: 0,
            blocked: 0,
          },
        });
      }
    }

    return { projects, total };
  }

  /**
   * Forward other operations to appropriate project store
   */
  async claimTask(taskId: string, agentId: string, projectPath?: string): Promise<Task | null> {
    if (!projectPath) {
      const taskWithProject = await this.getTask(taskId);
      if (!taskWithProject) return null;
      projectPath = taskWithProject.projectPath;
    }

    const store = await this.getProjectStore(projectPath);
    return store.claimTask(taskId, agentId);
  }

  async releaseTask(taskId: string, agentId: string, projectPath?: string): Promise<Task | null> {
    if (!projectPath) {
      const taskWithProject = await this.getTask(taskId);
      if (!taskWithProject) return null;
      projectPath = taskWithProject.projectPath;
    }

    const store = await this.getProjectStore(projectPath);
    return store.releaseTask(taskId, agentId);
  }

  async appendLog(taskId: string, message: string, agentId: string, projectPath?: string): Promise<void> {
    if (!projectPath) {
      const taskWithProject = await this.getTask(taskId);
      if (!taskWithProject) throw new Error(`Task ${taskId} not found`);
      projectPath = taskWithProject.projectPath;
    }

    const store = await this.getProjectStore(projectPath);
    return store.appendLog(taskId, message, agentId);
  }
}