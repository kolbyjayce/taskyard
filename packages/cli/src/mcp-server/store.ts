import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { TaskFrontmatter, type Task, type TaskStatusType } from "./schema.js";

export class FileStore {
  constructor(
    public readonly root: string,
    public readonly project: string = "default"
  ) {}

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

  // ── Reading ───────────────────────────────────────────────────────────────

  async readTask(project: string, taskId: string): Promise<Task & { body: string }> {
    const raw = await fs.readFile(this.taskPath(project, taskId), "utf-8");
    const { data, content } = matter(raw);
    return { ...TaskFrontmatter.parse(data), body: content };
  }

  async listTasks(
    project: string,
    filter?: Partial<Pick<Task, "status" | "priority" | "context"> & { tag?: string }>
  ): Promise<Task[]> {
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
      tasks.push(t);
    }

    return tasks;
  }

  // ── Writing ───────────────────────────────────────────────────────────────

  async createTask(
    project: string,
    fields: Partial<Task> & { title: string; notes?: string }
  ): Promise<Task> {
    const id = await this.nextTaskId(project);
    const { notes, ...taskFields } = fields;
    const task: Task = TaskFrontmatter.parse({ id, project, status: "backlog", ...taskFields });

    const body = notes ? `\n${notes}\n` : `\n_No notes yet._\n`;
    const content = matter.stringify(body, task as Record<string, unknown>);
    const filePath = this.taskPath(project, id);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return task;
  }

  async updateTask(project: string, taskId: string, patch: Partial<Task>): Promise<Task> {
    const existing = await this.readTask(project, taskId);
    const { body, ...frontmatter } = existing;
    const updated = { ...frontmatter, ...patch };
    await fs.writeFile(this.taskPath(project, taskId), matter.stringify(body, updated as Record<string, unknown>));
    return updated as Task;
  }

  async deleteTask(project: string, taskId: string): Promise<void> {
    await fs.unlink(this.taskPath(project, taskId));
  }

  // ── Path helpers ──────────────────────────────────────────────────────────

  taskDir(project: string): string {
    return path.join(this.root, project === "default" ? "tasks" : `projects/${project}/tasks`);
  }

  taskPath(project: string, taskId: string): string {
    return path.join(this.taskDir(project), `${taskId}.md`);
  }
}
