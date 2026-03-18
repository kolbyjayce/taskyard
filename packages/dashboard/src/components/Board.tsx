import { useBoardStore, type Task, type TaskStatus } from "../stores/board";
import { TaskCard } from "./TaskCard";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog",     label: "Backlog" },
  { id: "in-progress", label: "In progress" },
  { id: "review",      label: "Review" },
  { id: "blocked",     label: "Blocked" },
  { id: "done",        label: "Done" },
];

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  "backlog":     "border-zinc-700",
  "in-progress": "border-blue-500",
  "review":      "border-amber-500",
  "blocked":     "border-red-500",
  "done":        "border-emerald-600",
};

export function Board() {
  const { tasks } = useBoardStore();

  const byStatus = (status: TaskStatus): Task[] =>
    tasks.filter(t => t.status === status);

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="flex gap-4 h-full min-w-max">
        {COLUMNS.map(col => (
          <div
            key={col.id}
            className={`flex flex-col w-64 border-t-2 ${COLUMN_ACCENT[col.id]}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between py-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {col.label}
              </span>
              <span className="text-xs text-zinc-600 tabular-nums">
                {byStatus(col.id).length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-4">
              {byStatus(col.id).map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
