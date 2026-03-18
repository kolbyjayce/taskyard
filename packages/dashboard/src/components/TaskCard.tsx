import { useBoardStore, type Task } from "../stores/board";
import { HeartbeatDot } from "./HeartbeatDot";

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-amber-400",
  medium:   "bg-blue-400",
  low:      "bg-zinc-600",
};

export function TaskCard({ task }: { task: Task }) {
  const { selectTask, selectedTaskId } = useBoardStore();
  const isSelected = selectedTaskId === task.id;
  const isStalled = isTaskStalled(task);

  return (
    <button
      onClick={() => selectTask(isSelected ? null : task.id)}
      className={`
        w-full text-left p-3 rounded border transition-all
        ${isSelected
          ? "border-zinc-500 bg-zinc-800"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-850"
        }
        ${isStalled ? "border-l-2 border-l-amber-500" : ""}
      `}
    >
      {/* Header row: priority dot + ID + heartbeat */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
        <span className="text-xs text-zinc-500 font-mono">{task.id}</span>
        <span className="flex-1" />
        {task.status === "in-progress" && (
          <HeartbeatDot lastBeat={task.last_heartbeat} />
        )}
        {task.needs_handoff && (
          <span className="text-xs text-amber-400 font-semibold">HANDOFF</span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>

      {/* Footer: agent + tags */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.assigned_to && (
          <span className="text-xs text-zinc-500 truncate max-w-[120px]">
            ↳ {task.assigned_to}
          </span>
        )}
        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {tag}
          </span>
        ))}
        {task.attempt_count > 1 && (
          <span className="text-xs text-red-400 ml-auto">
            ×{task.attempt_count}
          </span>
        )}
      </div>
    </button>
  );
}

function isTaskStalled(task: Task): boolean {
  if (task.status !== "in-progress") return false;
  if (!task.last_progress_at) return false;
  return Date.now() - new Date(task.last_progress_at).getTime() > 30 * 60 * 1000;
}
