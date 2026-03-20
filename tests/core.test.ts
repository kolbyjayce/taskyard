import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { FileStore } from "../packages/cli/src/mcp-server/store.js";
import { isValidTransition } from "../packages/cli/src/mcp-server/schema.js";

// ── Schema tests ─────────────────────────────────────────────────────────────

describe("isValidTransition", () => {
  it("allows backlog → in-progress", () => {
    expect(isValidTransition("backlog", "in-progress")).toBe(true);
  });
  it("disallows backlog → done", () => {
    expect(isValidTransition("backlog", "done")).toBe(false);
  });
  it("allows in-progress → review", () => {
    expect(isValidTransition("in-progress", "review")).toBe(true);
  });
  it("disallows done → anything", () => {
    expect(isValidTransition("done", "backlog")).toBe(false);
    expect(isValidTransition("done", "in-progress")).toBe(false);
  });
});

// ── FileStore integration tests ───────────────────────────────────────────────

describe("FileStore", () => {
  let tmpDir: string;
  let store: FileStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskyard-test-"));
    // Minimal scaffold
    await fs.mkdir(path.join(tmpDir, "projects/test-project/tasks"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "CHANGELOG.md"), "# Changelog\n");

    store = new FileStore(tmpDir, {
      project: "test-project",
      version: "0.1.0",
      heartbeat_interval_seconds: 300,
      lock_timeout_seconds: 600,
      stall_threshold_seconds: 1800,
      max_attempts_before_escalation: 3,
      dashboard_port: 3456,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("creates a task with auto-incremented ID", async () => {
    const task = await store.createTask("test-project", { title: "First task" });
    expect(task.id).toBe("TASK-001");
    expect(task.status).toBe("backlog");
  });

  it("increments IDs correctly", async () => {
    await store.createTask("test-project", { title: "First" });
    await store.createTask("test-project", { title: "Second" });
    const third = await store.createTask("test-project", { title: "Third" });
    expect(third.id).toBe("TASK-003");
  });

  it("acquires and releases a lock atomically", async () => {
    await store.createTask("test-project", { title: "Lockable task" });

    const first  = await store.acquireLock("test-project", "TASK-001", "agent-A");
    const second = await store.acquireLock("test-project", "TASK-001", "agent-B");

    expect(first).toBe(true);
    expect(second).toBe(false); // already locked

    await store.releaseLock("test-project", "TASK-001");

    const third = await store.acquireLock("test-project", "TASK-001", "agent-B");
    expect(third).toBe(true);
  });

  it("rejects invalid status transitions", async () => {
    await store.createTask("test-project", { title: "Task" });
    await expect(
      store.updateTask("test-project", "TASK-001", { status: "done" })
    ).rejects.toThrow("Invalid transition");
  });

  it("appends log entries and updates last_progress_at", async () => {
    await store.createTask("test-project", { title: "Log test" });
    await store.appendLog("test-project", "TASK-001", "agent-A", "Did some work");
    const task = await store.readTask("test-project", "TASK-001");
    expect(task.last_progress_at).not.toBeNull();
    expect(task.body).toContain("Did some work");
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

  it("writes and reads a checkpoint handoff file", async () => {
    await store.createTask("test-project", { title: "Long task" });
    await store.writeCheckpoint("test-project", "TASK-001", {
      agent_id: "agent-A",
      completion_estimate: 60,
      work_completed: ["Scaffolded module", "Wrote tests"],
      work_remaining: ["Integration tests"],
      known_issues: ["Type error on line 44"],
      files_modified: ["src/auth.ts"],
      notes: "Resume from integration tests",
    });

    const handoffPath = path.join(store.taskDir("test-project"), "TASK-001", "HANDOFF.md");
    const content = await fs.readFile(handoffPath, "utf-8");
    expect(content).toContain("completion_estimate: 60%");
    expect(content).toContain("Resume from integration tests");
  });
});
