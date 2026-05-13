import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { EyeOff, Loader2 } from "lucide-react";
import type { Task, TaskStatus } from "@/types/task";

interface TaskBoardProps {
  tasks: Task[];
  doneTasks: Task[];
  hideDone: boolean;
  hasMoreDone: boolean;
  loadingMoreDone: boolean;
  onLoadMoreDone: () => void;
  onSelectTask: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

const ACTIVE_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "in-progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
];

export function TaskBoard({
  tasks,
  doneTasks,
  hideDone,
  hasMoreDone,
  loadingMoreDone,
  onLoadMoreDone,
  onSelectTask,
  onStatusChange,
}: TaskBoardProps) {
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  // Tasks dropped onto the hidden done column — shown transiently so the user
  // can immediately open/re-drag them. Cleared on next refresh.
  const [pendingDone, setPendingDone] = useState<Task[]>([]);

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDragTaskId(task.id + ":" + task.project);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(status);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragTaskId) return;
    const [taskId, project] = dragTaskId.split(":");
    const allVisible = [...tasks, ...doneTasks, ...pendingDone];
    const task = allVisible.find((t) => t.id === taskId && t.project === project);
    if (!task || task.status === targetStatus) { setDragTaskId(null); return; }

    onStatusChange(task, targetStatus);

    // If dropping onto the hidden done column, keep a local copy so the card
    // is immediately accessible without requiring a reveal. It disappears on
    // the next data refresh from the server.
    if (targetStatus === "done" && hideDone) {
      const updated = { ...task, status: "done" as TaskStatus };
      // Remove from pending if it was already there (re-drop edge case)
      setPendingDone((prev) => [
        ...prev.filter((t) => !(t.id === task.id && t.project === task.project)),
        updated,
      ]);
    } else if (targetStatus !== "done") {
      // Task moved out of pending done
      setPendingDone((prev) =>
        prev.filter((t) => !(t.id === task.id && t.project === task.project))
      );
    }

    setDragTaskId(null);
  };

  // Visible done tasks: server-loaded (when column open) OR pending drops (always)
  const visibleDone = hideDone ? pendingDone : [...doneTasks, ...pendingDone.filter(
    (p) => !doneTasks.some((d) => d.id === p.id && d.project === p.project)
  )];

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {/* Active columns */}
      {ACTIVE_COLUMNS.map(({ status, label }) => {
        const col = byStatus(status);
        const isActive = status === "in-progress";
        const isDragTarget = dragOver === status;

        return (
          <div
            key={status}
            className="flex flex-col shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 mb-3 rounded-md border",
                isActive ? "border-primary/30 bg-primary/8" : "border-border bg-card/40"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    status === "backlog" && "bg-muted-foreground",
                    status === "in-progress" && "bg-primary",
                    status === "blocked" && "bg-red-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium font-display uppercase tracking-wide",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{col.length}</span>
            </div>

            <div
              className={cn(
                "flex-1 space-y-2 rounded-md min-h-[100px] transition-colors",
                isDragTarget && "bg-primary/5 outline outline-1 outline-primary/20 outline-dashed"
              )}
            >
              {col.map((task) => (
                <TaskCard
                  key={task.id + task.project}
                  task={task}
                  onClick={() => onSelectTask(task)}
                  onDragStart={(e) => handleDragStart(e, task)}
                />
              ))}
              {col.length === 0 && (
                <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/40 font-mono">
                  empty
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Done column — always accepts drops even when hidden */}
      <div
        className="flex flex-col shrink-0 w-72"
        onDragOver={(e) => handleDragOver(e, "done")}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, "done")}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 mb-3 rounded-md border transition-colors",
            dragOver === "done"
              ? "border-green-500/40 bg-green-500/8"
              : "border-border bg-card/40"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs font-medium font-display uppercase tracking-wide text-muted-foreground">
              Done
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {hideDone
              ? pendingDone.length > 0 ? pendingDone.length : "—"
              : visibleDone.length}
          </span>
        </div>

        {/* Body */}
        {hideDone && pendingDone.length === 0 ? (
          /* Hidden with nothing pending: show drop zone */
          <div
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-2 rounded-md min-h-[100px] transition-colors",
              dragOver === "done"
                ? "border border-dashed border-green-500/40 bg-green-500/5"
                : "border border-dashed border-border/40"
            )}
          >
            <EyeOff className="h-4 w-4 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/40 font-mono">hidden</span>
          </div>
        ) : (
          /* Visible (or has pending drops) */
          <div
            className={cn(
              "flex-1 flex flex-col space-y-2 rounded-md min-h-[100px] overflow-y-auto transition-colors",
              dragOver === "done" && "bg-green-500/5 outline outline-1 outline-green-500/30 outline-dashed"
            )}
          >
            {/* Pending-only notice when column is still hidden */}
            {hideDone && pendingDone.length > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground/50 px-1 pb-1">
                dropped — refresh to clear
              </p>
            )}

            {visibleDone.map((task) => (
              <TaskCard
                key={task.id + task.project}
                task={task}
                onClick={() => onSelectTask(task)}
                onDragStart={(e) => handleDragStart(e, task)}
              />
            ))}

            {visibleDone.length === 0 && !loadingMoreDone && (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/40 font-mono">
                empty
              </div>
            )}

            {/* Load more (only when column is open) */}
            {!hideDone && (hasMoreDone || loadingMoreDone) && (
              <button
                onClick={onLoadMoreDone}
                disabled={loadingMoreDone}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 border border-dashed border-border/40 rounded-md"
              >
                {loadingMoreDone
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Loading…</>
                  : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
