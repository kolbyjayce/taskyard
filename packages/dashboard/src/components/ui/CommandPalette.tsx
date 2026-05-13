import {
  useEffect,
  useRef,
  useState,
  useMemo,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, Project } from "@/types/task";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onSelectProject: (project: string) => void;
}

type Result =
  | { kind: "task"; task: Task }
  | { kind: "project"; project: Project };

function score(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // character subsequence
  let ti = 0;
  let qi = 0;
  let hits = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) { hits++; qi++; }
    ti++;
  }
  if (qi === q.length) return 20 + hits;
  return 0;
}

export function CommandPalette({
  open,
  onClose,
  tasks,
  projects,
  onSelectTask,
  onSelectProject,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Global Cmd+K / Ctrl+K listener (handled in App, but Escape here)
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const results = useMemo((): Result[] => {
    const q = query.trim();
    if (!q) {
      // Show all tasks (capped) + projects when no query
      const taskResults: Result[] = tasks.slice(0, 8).map((task) => ({ kind: "task", task }));
      const projResults: Result[] = projects.map((project) => ({ kind: "project", project }));
      return [...projResults, ...taskResults];
    }

    const scoredTasks: { result: Result; s: number }[] = tasks.flatMap((task) => {
      const s = Math.max(
        score(task.title, q),
        score(task.id, q),
        task.tags.reduce((m, t) => Math.max(m, score(t, q)), 0),
        task.project ? score(task.project, q) : 0
      );
      return s > 0 ? [{ result: { kind: "task" as const, task }, s }] : [];
    });

    const scoredProjects: { result: Result; s: number }[] = projects.flatMap((project) => {
      const s = score(project.name, q);
      return s > 0 ? [{ result: { kind: "project" as const, project }, s }] : [];
    });

    return [...scoredProjects, ...scoredTasks]
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.result);
  }, [query, tasks, projects]);

  // Keep cursor in bounds
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(results.length - 1, 0)));
  }, [results.length]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[cursor];
      if (r) select(r);
    }
  };

  const select = (r: Result) => {
    if (r.kind === "task") {
      onSelectTask(r.task);
    } else {
      onSelectProject(r.project.name);
    }
    onClose();
  };

  if (!open) return null;

  const isMac = navigator.userAgent.includes("Mac");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center"
      aria-modal="true"
      role="dialog"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-xl mx-0 sm:mx-4",
          "bg-card border-border shadow-2xl",
          // Mobile: slide up from bottom like a sheet
          "mt-auto sm:mt-0 rounded-t-2xl sm:rounded-xl",
          "border-t sm:border border-border",
          // Amber top accent
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/60 before:to-transparent before:rounded-t-xl"
        )}
      >
        {/* Drag handle on mobile */}
        <div className="flex sm:hidden justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects…"
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none font-sans min-w-0"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 border border-border rounded px-1.5 py-0.5 shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <ul
          ref={listRef}
          className="overflow-y-auto max-h-[40vh] sm:max-h-80 py-1.5"
        >
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground font-mono">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.kind === "task" ? r.task.id + r.task.project : r.project.name}>
              {r.kind === "project" ? (
                <button
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => select(r)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    cursor === i
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "border-l-2 border-transparent hover:bg-secondary/60"
                  )}
                >
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest w-16 shrink-0">
                    project
                  </span>
                  <span className="text-sm text-foreground font-sans truncate flex-1">
                    {r.project.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {r.project.taskCount} tasks
                  </span>
                </button>
              ) : (
                <button
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => select(r)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    cursor === i
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "border-l-2 border-transparent hover:bg-secondary/60"
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-16 shrink-0 truncate">
                    {r.task.id}
                  </span>
                  <span className="text-sm text-foreground font-sans truncate flex-1">
                    {r.task.title}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={r.task.status} />
                    <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                      {r.task.project}
                    </span>
                  </div>
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-2.5 w-2.5" />
              <ArrowDown className="h-2.5 w-2.5" />
              navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-2.5 w-2.5" />
              open
            </span>
            <span className="ml-auto opacity-60">
              {isMac ? "⌘K" : "Ctrl+K"} to toggle
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
