import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { TaskFrontmatter, type Task } from "./schema.js";

type ListFilter = Partial<Pick<Task, "status" | "priority" | "context" | "due_date"> & { tag?: string }>;

export class FileStore {
  constructor(public readonly root: string) { }

  // ── Task ID generation ────────────────────────────────────────────────────

  async nextTaskId(project: string): Promise<string> {
    const dir = this.taskDir(project);
    const files = await fs.readdir(dir).catch(() => [] as string[]);
    const ids = files
      .filter(f => f.match(/^TASK-\d+\.md$/))
      .map(f => parseInt(f.replace("TASK-", "").replace(".md", ""), 10));
    const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    return `TASK-${String(next).padStart(3, "0")}`;
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  async listProjects(): Promise<{ name: string; taskCount: number }[]> {
    const results: { name: string; taskCount: number }[] = [];

    // Always include "default" if it has tasks
    const defaultTasks = await this.listTasks("default");
    if (defaultTasks.length > 0) {
      results.push({ name: "default", taskCount: defaultTasks.length });
    }

    // Scan projects/ subdirectory
    const projectsDir = path.join(this.root, "projects");
    const entries = await fs.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.filter(e => e.isDirectory())) {
      const tasks = await this.listTasks(entry.name);
      results.push({ name: entry.name, taskCount: tasks.length });
    }

    return results;
  }

  // ── Reading ───────────────────────────────────────────────────────────────

  async readTask(project: string, taskId: string): Promise<Task & { body: string }> {
    const raw = await fs.readFile(this.taskPath(project, taskId), "utf-8");
    const { data, content } = matter(raw);
    return { ...TaskFrontmatter.parse(data), body: content };
  }

  async listTasks(project: string, filter?: ListFilter): Promise<Task[]> {
    if (project === "all") return this.listAllTasks(filter);

    const dir = this.taskDir(project);
    const files = await fs.readdir(dir).catch(() => [] as string[]);
    const tasks: Task[] = [];

    for (const file of files.filter(f => f.endsWith(".md"))) {
      const raw = await fs.readFile(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      const result = TaskFrontmatter.safeParse(data);
      if (!result.success) continue;
      const t = result.data;
      if (filter?.status && t.status !== filter.status) continue;
      if (filter?.priority && t.priority !== filter.priority) continue;
      if (filter?.context && t.context !== filter.context) continue;
      if (filter?.tag && !t.tags.includes(filter.tag)) continue;
      if (filter?.due_date && (!t.due_date || t.due_date > filter.due_date)) continue;
      tasks.push(t);
    }

    return tasks;
  }

  private async listAllTasks(filter?: ListFilter): Promise<Task[]> {
    const projects = await this.listProjects();
    // Always query all known projects plus "default" even if empty
    const names = new Set(["default", ...projects.map(p => p.name)]);
    const all: Task[] = [];
    for (const name of names) {
      all.push(...await this.listTasks(name, filter));
    }
    return all;
  }

  // ── Writing ───────────────────────────────────────────────────────────────

  async createTask(
    project: string,
    fields: Partial<Task> & { title: string; notes?: string }
  ): Promise<Task> {
    const { notes, ...taskFields } = fields;

    const body = notes ? `\n${notes}\n` : `\n_No notes yet._\n`;

    await fs.mkdir(this.taskDir(project), { recursive: true });

    // retry until we get a unique ID incase of concurrent task writes
    for (; ;) {
      const id = await this.nextTaskId(project);
      const task: Task = TaskFrontmatter.parse({ ...taskFields, id, project, status: "backlog" });
      const content = matter.stringify(body, task as Record<string, unknown>);
      const filePath = this.taskPath(project, id);

      try {
        await fs.writeFile(filePath, content, { flag: "wx" });
        return task;
      } catch (e: any) {
        if (e?.code !== "EEXIST") throw e;
      }
    }
  }

  async updateTask(project: string, taskId: string, patch: Partial<Task>): Promise<Task> {
    const lockPath = this.taskPath(project, taskId) + ".lock";
    let delay = 50;
    const deadline = Date.now() + 5000;

    for (;;) {
      try {
        const fd = await fs.open(lockPath, "wx");
        try {
          const existing = await this.readTask(project, taskId);
          const { body, ...frontmatter } = existing;
          const updated = { ...frontmatter, ...patch, id: existing.id, project: existing.project };
          await fs.writeFile(
            this.taskPath(project, taskId),
            matter.stringify(body, updated as Record<string, unknown>)
          );
          return updated as Task;
        } finally {
          await fd.close();
          await fs.unlink(lockPath).catch(() => {});
        }
      } catch (e: any) {
        if (e?.code !== "EEXIST") throw e;
        if (Date.now() >= deadline) throw new Error(`Timed out waiting for lock on ${taskId}`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 500);
      }
    }
  }

  async moveTask(fromProject: string, taskId: string, toProject: string): Promise<Task> {
    const existing = await this.readTask(fromProject, taskId);
    const { body, id: _oldId, project: _oldProject, ...fields } = existing;
    // Create in destination (gets a new ID in that project's sequence)
    const moved = await this.createTask(toProject, { ...fields, notes: body.trim() });
    try {
      await this.deleteTask(fromProject, taskId);
    } catch (e) {
      // Rollback: remove the newly created destination task so we don't leave a duplicate
      await this.deleteTask(toProject, moved.id).catch(() => { });
      throw e;
    }
    return moved;
  }

  async deleteTask(project: string, taskId: string): Promise<void> {
    await fs.unlink(this.taskPath(project, taskId));
  }

  // ── Path helpers ──────────────────────────────────────────────────────────
  private sanitizeSegment(value: string, name: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error(`Invalid ${name}: ${value}`);
    }
    return value;
  }

  taskDir(project: string): string {
    const root = path.resolve(this.root);
    const safeProject = this.sanitizeSegment(project, "project");

    const dir = path.resolve(
      root,
      safeProject === 'default' ? 'tasks' : path.join("projects", safeProject, "tasks")
    )

    if (!dir.startsWith(root + path.sep)) {
      throw new Error(`Project path ${dir} is not inside root ${root}`);
    }

    return dir;
  }

  taskPath(project: string, taskId: string): string {
    this.sanitizeSegment(taskId, "task_id");

    return path.join(this.taskDir(project), `${taskId}.md`);
  }
}
