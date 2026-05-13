import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2, EyeOff } from "lucide-react";
import { StatusBadge, PriorityBadge, Badge, OverdueBadge, DueSoonBadge } from "@/components/ui/badge";
import { cn, formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import type { Task } from "@/types/task";

interface TaskListProps {
  tasks: Task[];
  doneTasks: Task[];
  hideDone: boolean;
  hasMoreDone: boolean;
  loadingMoreDone: boolean;
  onLoadMoreDone: () => void;
  onSelectTask: (task: Task) => void;
}

type SortKey = "id" | "title" | "status" | "priority" | "due_date" | "project";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { "in-progress": 0, blocked: 1, backlog: 2, done: 3 };

export function TaskList({
  tasks,
  doneTasks,
  hideDone,
  hasMoreDone,
  loadingMoreDone,
  onLoadMoreDone,
  onSelectTask,
}: TaskListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortFn = (a: Task, b: Task) => {
    let cmp = 0;
    switch (sortKey) {
      case "id":       cmp = a.id.localeCompare(b.id); break;
      case "title":    cmp = a.title.localeCompare(b.title); break;
      case "status":   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case "priority": cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
      case "due_date":
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) cmp = 1;
        else if (!b.due_date) cmp = -1;
        else cmp = a.due_date.localeCompare(b.due_date);
        break;
      case "project":  cmp = a.project.localeCompare(b.project); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  };

  const sorted = [...tasks].sort(sortFn);
  const sortedDone = [...doneTasks].sort(sortFn);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary" />
      : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  const TaskRow = ({ task }: { task: Task }) => (
    <tr
      key={task.id + task.project}
      onClick={() => onSelectTask(task)}
      className="border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors"
    >
      <td className="px-3 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-foreground font-sans line-clamp-1 max-w-xs">{task.title}</span>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-3 py-2.5">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-3 py-2.5">
        {task.due_date ? (
          isOverdue(task.due_date) ? (
            <OverdueBadge date={formatDate(task.due_date)} />
          ) : isDueSoon(task.due_date) ? (
            <DueSoonBadge date={formatDate(task.due_date)} />
          ) : (
            <span className="font-mono text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
          )
        ) : (
          <span className="text-muted-foreground/30 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground font-mono">{task.project}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1 flex-wrap">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="tag">{tag}</Badge>
          ))}
          {task.tags.length > 3 && <Badge variant="tag">+{task.tags.length - 3}</Badge>}
        </div>
      </td>
    </tr>
  );

  const thead = (
    <thead>
      <tr className="border-b border-border bg-muted/20">
        <Th col="id" label="ID" />
        <Th col="title" label="Title" />
        <Th col="status" label="Status" />
        <Th col="priority" label="Priority" />
        <Th col="due_date" label="Due" />
        <Th col="project" label="Project" />
        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Tags
        </th>
      </tr>
    </thead>
  );

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        {thead}
        <tbody>
          {sorted.map((task) => <TaskRow key={task.id + task.project} task={task} />)}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-10 text-muted-foreground/50 text-sm font-mono">
                No tasks found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Done section */}
      {hideDone ? (
        <div className="flex items-center gap-2 px-3 py-3 mt-2 border border-dashed border-border/40 rounded-md text-xs text-muted-foreground/50 font-mono">
          <EyeOff className="h-3.5 w-3.5 shrink-0" />
          Done tasks hidden
        </div>
      ) : (
        <>
          {/* Done separator */}
          <div className="flex items-center gap-3 mt-4 mb-1 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
            <span className="text-xs font-medium font-display uppercase tracking-wide text-muted-foreground">
              Done
            </span>
            <div className="flex-1 border-t border-border/40" />
            <span className="font-mono text-xs text-muted-foreground/60">{sortedDone.length}</span>
          </div>

          <table className="w-full text-sm border-collapse opacity-70">
            {thead}
            <tbody>
              {sortedDone.map((task) => <TaskRow key={task.id + task.project} task={task} />)}
              {sortedDone.length === 0 && !loadingMoreDone && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground/40 text-sm font-mono">
                    No done tasks
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Load more */}
          {(hasMoreDone || loadingMoreDone) && (
            <button
              onClick={onLoadMoreDone}
              disabled={loadingMoreDone}
              className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 border border-dashed border-border/40 rounded-md"
            >
              {loadingMoreDone
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Loading more done tasks…</>
                : "Load more done tasks"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
