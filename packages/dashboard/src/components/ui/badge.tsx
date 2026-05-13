import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/task";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "status" | "priority" | "tag" | "default";
  status?: TaskStatus;
  priority?: TaskPriority;
  className?: string;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  backlog: "bg-muted text-muted-foreground border-border",
  "in-progress": "bg-primary/15 text-primary border-primary/30",
  done: "bg-green-950/50 text-green-400 border-green-900/40",
  blocked: "bg-red-950/50 text-red-400 border-red-900/40",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-muted/50 text-muted-foreground border-border/50",
  medium: "bg-secondary text-secondary-foreground border-border",
  high: "bg-orange-950/50 text-orange-400 border-orange-900/40",
  critical: "bg-red-950/60 text-red-400 border-red-900/50",
};

export function Badge({ children, variant = "default", status, priority, className }: BadgeProps) {
  const base = "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border font-mono";

  let styles = "bg-secondary text-secondary-foreground border-border";
  if (variant === "status" && status) styles = STATUS_STYLES[status];
  if (variant === "priority" && priority) styles = PRIORITY_STYLES[priority];
  if (variant === "tag") styles = "bg-muted/60 text-muted-foreground border-border/60";

  return (
    <span className={cn(base, styles, className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const labels: Record<TaskStatus, string> = {
    backlog: "Backlog",
    "in-progress": "In Progress",
    done: "Done",
    blocked: "Blocked",
  };
  return (
    <Badge variant="status" status={status}>
      {labels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const labels: Record<TaskPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return (
    <Badge variant="priority" priority={priority}>
      {labels[priority]}
    </Badge>
  );
}

export function OverdueBadge({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-red-700/60 bg-red-950/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-red-300">
      <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      <span>Overdue · {date}</span>
    </span>
  );
}

export function DueSoonBadge({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-orange-700/50 bg-orange-950/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-orange-300">
      <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      <span>{date}</span>
    </span>
  );
}
