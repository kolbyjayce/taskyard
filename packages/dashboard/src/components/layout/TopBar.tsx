import { useState } from "react";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal, X, Menu, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/types/task";

interface TopBarProps {
  project: string;
  taskCount: number;
  doneCount: number;
  hideDone: boolean;
  onToggleHideDone: () => void;
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onNewTask: () => void;
  filterStatus: TaskStatus | "";
  onFilterStatus: (s: TaskStatus | "") => void;
  filterPriority: TaskPriority | "";
  onFilterPriority: (p: TaskPriority | "") => void;
  onOpenSearch: () => void;
  onOpenSidebar: () => void;
}

const isMac =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

export function TopBar({
  project,
  taskCount,
  doneCount,
  hideDone,
  onToggleHideDone,
  viewMode,
  onViewChange,
  onNewTask,
  filterStatus,
  onFilterStatus,
  filterPriority,
  onFilterPriority,
  onOpenSearch,
  onOpenSidebar,
}: TopBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = (filterStatus ? 1 : 0) + (filterPriority ? 1 : 0);

  return (
    <div className="shrink-0 border-b border-border bg-card/30">
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 sm:px-6 py-3">
        {/* Mobile hamburger */}
        <button
          onClick={onOpenSidebar}
          className="sm:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">
            {project === "all" ? "All Tasks" : project}
          </h1>
          <span className="font-mono text-xs text-muted-foreground shrink-0 hidden sm:inline">
            {taskCount} task{taskCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {/* Hide/show done toggle */}
          <button
            onClick={onToggleHideDone}
            title={hideDone ? "Show done tasks" : "Hide done tasks"}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-sans transition-colors",
              hideDone
                ? "border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-muted/30"
                : "border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/15"
            )}
          >
            {hideDone ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{hideDone ? "Done hidden" : `${doneCount} done`}</span>
          </button>

          {/* Search trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors text-sm font-sans group"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search…</span>
            <kbd className="ml-2 text-[10px] font-mono bg-muted/60 border border-border rounded px-1 py-0.5 group-hover:border-primary/30 transition-colors">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </button>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatus(e.target.value as TaskStatus | "")}
            className="h-8 px-2 rounded-md border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans cursor-pointer"
          >
            <option value="">All status</option>
            <option value="backlog">Backlog</option>
            <option value="in-progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => onFilterPriority(e.target.value as TaskPriority | "")}
            className="h-8 px-2 rounded-md border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans cursor-pointer"
          >
            <option value="">All priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => onViewChange("kanban")}
              className={cn(
                "h-8 w-8 flex items-center justify-center transition-colors",
                viewMode === "kanban"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Kanban view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={cn(
                "h-8 w-8 flex items-center justify-center transition-colors",
                viewMode === "list"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* New task */}
          <Button size="sm" onClick={onNewTask}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Task
          </Button>
        </div>

        {/* Mobile controls */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {/* Hide/show done toggle (icon only) */}
          <button
            onClick={onToggleHideDone}
            title={hideDone ? "Show done tasks" : "Hide done tasks"}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
              hideDone
                ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                : "text-green-400 bg-green-500/10"
            )}
            aria-label={hideDone ? "Show done tasks" : "Hide done tasks"}
          >
            {hideDone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {/* Search */}
          <button
            onClick={onOpenSearch}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Filters */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "relative h-8 w-8 flex items-center justify-center rounded-md transition-colors",
              filtersOpen || activeFilters > 0
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {/* View toggle (icon only) */}
          <button
            onClick={() => onViewChange(viewMode === "kanban" ? "list" : "kanban")}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={viewMode === "kanban" ? "Switch to list" : "Switch to kanban"}
          >
            {viewMode === "kanban" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </button>

          {/* New task (icon only on mobile) */}
          <button
            onClick={onNewTask}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="New task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile filters row */}
      {filtersOpen && (
        <div className="sm:hidden px-3 pb-3 flex items-center gap-2 flex-wrap border-t border-border/50 pt-2.5">
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatus(e.target.value as TaskStatus | "")}
            className="flex-1 min-w-0 h-8 px-2 rounded-md border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
          >
            <option value="">All status</option>
            <option value="backlog">Backlog</option>
            <option value="in-progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => onFilterPriority(e.target.value as TaskPriority | "")}
            className="flex-1 min-w-0 h-8 px-2 rounded-md border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
          >
            <option value="">All priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {activeFilters > 0 && (
            <button
              onClick={() => { onFilterStatus(""); onFilterPriority(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-8 px-2"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
