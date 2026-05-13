import { Badge, PriorityBadge, OverdueBadge, DueSoonBadge } from "@/components/ui/badge";
import { cn, formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/task";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, status: TaskStatus) => void;
}

export function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  const overdue = isOverdue(task.due_date);
  const dueSoon = !overdue && isDueSoon(task.due_date);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "group bg-card border border-border rounded-md p-3 cursor-pointer select-none",
        "hover:border-primary/30 hover:bg-card/80 transition-all duration-150",
        "active:scale-[0.98]"
      )}
    >
      {/* Task ID + Priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] text-muted-foreground leading-none">
          {task.id}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Title */}
      <p className="text-sm text-foreground leading-snug mb-2.5 font-sans line-clamp-2">
        {task.title}
      </p>

      {/* Due date badge — full-width when overdue for maximum visibility */}
      {task.due_date && (overdue || dueSoon) && (
        <div className="mb-2">
          {overdue
            ? <OverdueBadge date={formatDate(task.due_date)} />
            : <DueSoonBadge date={formatDate(task.due_date)} />}
        </div>
      )}

      {/* Meta row: tags + context + quiet due date (if not overdue/soon) */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="tag">{tag}</Badge>
          ))}
          {task.tags.length > 2 && (
            <Badge variant="tag">+{task.tags.length - 2}</Badge>
          )}
          {task.context && (
            <Badge variant="default" className="bg-secondary/60 text-muted-foreground border-border/40 text-[10px]">
              {task.context}
            </Badge>
          )}
        </div>

        {/* Quiet due date only when not already shown as a badge above */}
        {task.due_date && !overdue && !dueSoon && (
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}
