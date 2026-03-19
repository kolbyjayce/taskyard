import { useBoardStore, type Task } from "../stores/board";
import { HeartbeatDot } from "./HeartbeatDot";
import { motion } from "framer-motion";
import { ClockIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const PRIORITY_STYLES: Record<string, string> = {
  critical: "priority-critical",
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const { selectTask, selectedTaskId } = useBoardStore();
  const isSelected = selectedTaskId === task.id;
  const isStalled = isTaskStalled(task);

  return (
    <motion.button
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => selectTask(isSelected ? null : task.id)}
      className={`
        w-full text-left p-4 rounded-lg border smooth-transition
        magnetic-hover glow-hover
        ${isSelected
          ? "border-focus bg-hover ring-1 ring-accent-primary/50"
          : "border-theme bg-card hover:border-focus hover:bg-hover"
        }
        ${isStalled ? "border-l-4 border-l-accent-warning" : ""}
        ${isDragging ? "shadow-xl ring-1 ring-accent-primary/30" : ""}
      `}
    >
      {/* Header row: priority dot + ID + indicators */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_STYLES[task.priority]}`} />
        <span className="text-xs text-muted font-mono bg-tertiary px-1.5 py-0.5 rounded">
          {task.id}
        </span>
        <span className="flex-1" />

        {/* Status indicators */}
        {task.status === "in-progress" && (
          <HeartbeatDot lastBeat={task.last_heartbeat} />
        )}
        {task.needs_handoff && (
          <div className="flex items-center gap-1 text-xs text-accent-warning font-semibold">
            <ExclamationTriangleIcon className="w-3 h-3" />
            <span className="hidden sm:inline">HANDOFF</span>
          </div>
        )}
        {isStalled && (
          <div className="flex items-center gap-1 text-xs text-accent-warning">
            <ClockIcon className="w-3 h-3" />
            <span className="hidden sm:inline">Stalled</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm text-primary leading-relaxed font-medium mb-3 line-clamp-2">
        {task.title}
      </h4>

      {/* Footer: assignee + tags + attempt count */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.assigned_to && (
          <div className="flex items-center gap-1 text-xs text-secondary bg-tertiary px-2 py-1 rounded-md">
            <UserIcon className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{task.assigned_to}</span>
          </div>
        )}

        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-xs px-2 py-1 rounded-md bg-accent-primary/10 text-accent-primary font-medium">
            #{tag}
          </span>
        ))}

        {task.tags.length > 2 && (
          <span className="text-xs text-muted">+{task.tags.length - 2}</span>
        )}

        {task.attempt_count > 1 && (
          <span className="text-xs text-accent-danger ml-auto font-semibold">
            Attempt {task.attempt_count}
          </span>
        )}
      </div>
    </motion.button>
  );
}

function isTaskStalled(task: Task): boolean {
  if (task.status !== "in-progress") return false;
  if (!task.last_progress_at) return false;
  return Date.now() - new Date(task.last_progress_at).getTime() > 30 * 60 * 1000;
}
