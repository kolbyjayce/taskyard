import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { TaskForm } from "@/components/tasks/TaskForm";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { updateTask, createProject, getTasks } from "@/api/client";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types/task";

const DONE_PAGE_SIZE = 20;

export default function App() {
  const [selectedProject, setSelectedProject] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");

  // ── Done tasks ────────────────────────────────────────────────────────────
  const [hideDone, setHideDone] = useState(true);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [hasMoreDone, setHasMoreDone] = useState(false);
  const [loadingMoreDone, setLoadingMoreDone] = useState(false);
  // Use a ref so handleLoadMoreDone always reads the current offset without
  // needing it as a useCallback dep (avoids stale-closure re-creates).
  const doneOffsetRef = useRef(0);

  const { projects, loading: projectsLoading, refresh: refreshProjects } = useProjects();

  // Main task filter always excludes done tasks; done are managed separately.
  const taskFilter = useMemo(() => ({
    project: selectedProject,
    // Don't pass status: "done" into the main filter — done is its own lane.
    ...(filterStatus && filterStatus !== "done" ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
    excludeDone: true,
  }), [selectedProject, filterStatus, filterPriority]);

  const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTasks(taskFilter);

  // All tasks for command palette (no done exclusion so search covers everything).
  const { tasks: allTasks } = useTasks({ project: selectedProject });

  // ── Done tasks loading ────────────────────────────────────────────────────

  // Reset and load the first page whenever hideDone/project/priority changes.
  useEffect(() => {
    doneOffsetRef.current = 0;
    setDoneTasks([]);
    setHasMoreDone(false);
    if (hideDone) return;

    let cancelled = false;
    setLoadingMoreDone(true);
    getTasks({
      project: selectedProject,
      status: "done",
      ...(filterPriority ? { priority: filterPriority } : {}),
      limit: DONE_PAGE_SIZE,
      offset: 0,
    })
      .then((batch) => {
        if (cancelled) return;
        setDoneTasks(batch);
        doneOffsetRef.current = batch.length;
        setHasMoreDone(batch.length === DONE_PAGE_SIZE);
      })
      .catch(() => { /* silently ignore */ })
      .finally(() => { if (!cancelled) setLoadingMoreDone(false); });

    return () => { cancelled = true; };
  }, [hideDone, selectedProject, filterPriority]);

  const handleLoadMoreDone = useCallback(async () => {
    if (loadingMoreDone || !hasMoreDone) return;
    setLoadingMoreDone(true);
    try {
      const batch = await getTasks({
        project: selectedProject,
        status: "done",
        ...(filterPriority ? { priority: filterPriority } : {}),
        limit: DONE_PAGE_SIZE,
        offset: doneOffsetRef.current,
      });
      setDoneTasks((prev) => [...prev, ...batch]);
      doneOffsetRef.current += batch.length;
      setHasMoreDone(batch.length === DONE_PAGE_SIZE);
    } finally {
      setLoadingMoreDone(false);
    }
  }, [selectedProject, filterPriority, loadingMoreDone, hasMoreDone]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    refreshProjects();
    refreshTasks();
    // Re-trigger done tasks by resetting hideDone state through a no-op toggle
    // (the effect dep on selectedProject/filterPriority won't fire here, so we
    // need to manually reload if done tasks are visible).
    if (!hideDone) {
      doneOffsetRef.current = 0;
      setDoneTasks([]);
      setHasMoreDone(false);
      setLoadingMoreDone(true);
      getTasks({
        project: selectedProject,
        status: "done",
        ...(filterPriority ? { priority: filterPriority } : {}),
        limit: DONE_PAGE_SIZE,
        offset: 0,
      })
        .then((batch) => {
          setDoneTasks(batch);
          doneOffsetRef.current = batch.length;
          setHasMoreDone(batch.length === DONE_PAGE_SIZE);
        })
        .catch(() => { /* silently ignore */ })
        .finally(() => setLoadingMoreDone(false));
    }
  }, [refreshProjects, refreshTasks, hideDone, selectedProject, filterPriority]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTask(task.id, task.project, { status: newStatus });
      refreshTasks();
      // If a task was moved to/from done, reset the done list so counts stay fresh.
      if (newStatus === "done" || task.status === "done") {
        doneOffsetRef.current = 0;
        setDoneTasks([]);
        setHasMoreDone(false);
        if (!hideDone) {
          getTasks({
            project: selectedProject,
            status: "done",
            limit: DONE_PAGE_SIZE,
            offset: 0,
          }).then((batch) => {
            setDoneTasks(batch);
            doneOffsetRef.current = batch.length;
            setHasMoreDone(batch.length === DONE_PAGE_SIZE);
          }).catch(() => { /* ignore */ });
        }
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleTaskUpdated = () => {
    refreshTasks();
    refreshProjects();
  };

  const handleTaskDeleted = () => {
    setSelectedTask(null);
    refreshTasks();
    refreshProjects();
  };

  const handleCreateProject = async (name: string) => {
    await createProject(name);
    await refreshProjects();
    setSelectedProject(name);
  };

  const handleProjectRenamed = useCallback((oldName: string, newName: string) => {
    if (selectedProject === oldName) setSelectedProject(newName);
    refreshProjects();
  }, [selectedProject, refreshProjects]);

  const handleProjectDeleted = useCallback((name: string) => {
    if (selectedProject === name) setSelectedProject("all");
    refreshProjects();
    refreshTasks();
  }, [selectedProject, refreshProjects, refreshTasks]);

  const handleSelectProject = (p: string) => {
    setSelectedProject(p);
    setSelectedTask(null);
    setFilterStatus("");
    setFilterPriority("");
    setSidebarOpen(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const projectNames = projects.map((p) => p.name);
  if (!projectNames.includes("default")) projectNames.unshift("default");

  const defaultFormProject =
    selectedProject === "all" ? (projectNames[0] ?? "default") : selectedProject;

  const isLoading = projectsLoading || tasksLoading;

  return (
    <div className="flex h-screen overflow-hidden bg-background dot-grid">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "sm:relative sm:translate-x-0 sm:z-auto sm:flex",
          "fixed inset-y-0 left-0 z-40 transition-transform duration-250 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        )}
      >
        <Sidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          onRefresh={handleRefresh}
          onCreateProject={handleCreateProject}
          onProjectRenamed={handleProjectRenamed}
          onProjectDeleted={handleProjectDeleted}
          loading={isLoading}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          project={selectedProject}
          taskCount={tasks.length}
          doneCount={doneTasks.length}
          hideDone={hideDone}
          onToggleHideDone={() => setHideDone((v) => !v)}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onNewTask={() => setNewTaskOpen(true)}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          filterPriority={filterPriority}
          onFilterPriority={setFilterPriority}
          onOpenSearch={() => setPaletteOpen(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-hidden p-3 sm:p-5">
          {isLoading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm font-mono animate-pulse">Loading…</p>
            </div>
          ) : viewMode === "kanban" ? (
            <TaskBoard
              tasks={tasks}
              doneTasks={doneTasks}
              hideDone={hideDone}
              hasMoreDone={hasMoreDone}
              loadingMoreDone={loadingMoreDone}
              onLoadMoreDone={handleLoadMoreDone}
              onSelectTask={setSelectedTask}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <TaskList
              tasks={tasks}
              doneTasks={doneTasks}
              hideDone={hideDone}
              hasMoreDone={hasMoreDone}
              loadingMoreDone={loadingMoreDone}
              onLoadMoreDone={handleLoadMoreDone}
              onSelectTask={setSelectedTask}
            />
          )}
        </main>
      </div>

      {/* Task detail */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          projects={projectNames}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* New task drawer */}
      <TaskForm
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={() => {
          refreshTasks();
          refreshProjects();
        }}
        defaultProject={defaultFormProject}
        projects={projectNames}
      />

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        tasks={allTasks}
        projects={projects}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setPaletteOpen(false);
        }}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
}
