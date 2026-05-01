import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { FileStore } from "../packages/cli/src/mcp-server/store.js";

describe("FileStore", () => {
  let tmpDir: string;
  let store: FileStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskyard-test-"));
    await fs.mkdir(path.join(tmpDir, "tasks"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "projects/test-project/tasks"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "projects/other-project/tasks"), { recursive: true });
    store = new FileStore(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("creates a task with auto-incremented ID", async () => {
    const task = await store.createTask("test-project", { title: "First task" });
    expect(task.id).toBe("TASK-001");
    expect(task.status).toBe("backlog");
    expect(task.priority).toBe("medium");
  });

  it("increments IDs correctly", async () => {
    await store.createTask("test-project", { title: "First" });
    await store.createTask("test-project", { title: "Second" });
    const third = await store.createTask("test-project", { title: "Third" });
    expect(third.id).toBe("TASK-003");
  });

  it("reads a task back with correct fields", async () => {
    await store.createTask("test-project", {
      title: "Tagged task",
      priority: "high",
      context: "work",
      tags: ["urgent"],
      due_date: "2026-05-10",
    });
    const task = await store.readTask("test-project", "TASK-001");
    expect(task.title).toBe("Tagged task");
    expect(task.priority).toBe("high");
    expect(task.context).toBe("work");
    expect(task.tags).toContain("urgent");
    expect(task.due_date).toBe("2026-05-10");
  });

  it("updates task fields", async () => {
    await store.createTask("test-project", { title: "Task" });
    const updated = await store.updateTask("test-project", "TASK-001", {
      status: "in-progress",
      priority: "critical",
    });
    expect(updated.status).toBe("in-progress");
    expect(updated.priority).toBe("critical");
  });

  it("deletes a task", async () => {
    await store.createTask("test-project", { title: "Ephemeral" });
    await store.deleteTask("test-project", "TASK-001");
    const tasks = await store.listTasks("test-project");
    expect(tasks).toHaveLength(0);
  });

  it("lists tasks with status filter", async () => {
    await store.createTask("test-project", { title: "Backlog task" });
    await store.createTask("test-project", { title: "Another backlog" });
    await store.updateTask("test-project", "TASK-001", { status: "in-progress" });

    const backlog = await store.listTasks("test-project", { status: "backlog" });
    const inProgress = await store.listTasks("test-project", { status: "in-progress" });

    expect(backlog).toHaveLength(1);
    expect(inProgress).toHaveLength(1);
  });

  it("lists tasks with context filter", async () => {
    await store.createTask("test-project", { title: "Work task", context: "work" });
    await store.createTask("test-project", { title: "Home task", context: "home" });

    const work = await store.listTasks("test-project", { context: "work" });
    expect(work).toHaveLength(1);
    expect(work[0].title).toBe("Work task");
  });

  it("lists tasks with tag filter", async () => {
    await store.createTask("test-project", { title: "Urgent", tags: ["urgent", "work"] });
    await store.createTask("test-project", { title: "Normal", tags: ["work"] });

    const urgent = await store.listTasks("test-project", { tag: "urgent" });
    expect(urgent).toHaveLength(1);
    expect(urgent[0].title).toBe("Urgent");
  });

  it("stores notes in task body", async () => {
    await store.createTask("test-project", { title: "Task with notes", notes: "Remember to check the API docs." });
    const task = await store.readTask("test-project", "TASK-001");
    expect(task.body).toContain("Remember to check the API docs.");
  });

  it("lists projects with task counts", async () => {
    await store.createTask("test-project", { title: "A" });
    await store.createTask("test-project", { title: "B" });
    await store.createTask("other-project", { title: "C" });

    const projects = await store.listProjects();
    const tp = projects.find(p => p.name === "test-project");
    const op = projects.find(p => p.name === "other-project");

    expect(tp?.taskCount).toBe(2);
    expect(op?.taskCount).toBe(1);
  });

  it("lists tasks across all projects", async () => {
    await store.createTask("test-project", { title: "A" });
    await store.createTask("other-project", { title: "B" });

    const all = await store.listTasks("all");
    expect(all).toHaveLength(2);
  });

  it("filters across all projects", async () => {
    await store.createTask("test-project", { title: "High priority", priority: "high" });
    await store.createTask("other-project", { title: "Low priority", priority: "low" });

    const high = await store.listTasks("all", { priority: "high" });
    expect(high).toHaveLength(1);
    expect(high[0].title).toBe("High priority");
  });

  it("moves a task to another project", async () => {
    await store.createTask("test-project", { title: "Movable", priority: "high", context: "work" });

    const moved = await store.moveTask("test-project", "TASK-001", "other-project");

    expect(moved.project).toBe("other-project");
    expect(moved.title).toBe("Movable");
    expect(moved.priority).toBe("high");
    expect(moved.context).toBe("work");

    // Verify it no longer exists in source
    const remaining = await store.listTasks("test-project");
    expect(remaining).toHaveLength(0);

    // Verify it exists in destination
    const inDest = await store.listTasks("other-project");
    expect(inDest).toHaveLength(1);
  });
});
