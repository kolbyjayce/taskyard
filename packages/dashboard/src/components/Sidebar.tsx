import { useState, useEffect } from "react";
import { useBoardStore } from "../stores/board";

export function Sidebar() {
  const { tasks, project, setProject } = useBoardStore();
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  const counts = {
    backlog:      tasks.filter(t => t.status === "backlog").length,
    "in-progress": tasks.filter(t => t.status === "in-progress").length,
    review:       tasks.filter(t => t.status === "review").length,
    blocked:      tasks.filter(t => t.status === "blocked").length,
    done:         tasks.filter(t => t.status === "done").length,
  };

  const stalled = tasks.filter(t => {
    if (t.status !== "in-progress" || !t.last_progress_at) return false;
    return Date.now() - new Date(t.last_progress_at).getTime() > 30 * 60 * 1000;
  }).length;

  return (
    <nav className="w-52 border-r border-zinc-800 flex flex-col py-4 px-3 gap-6 flex-shrink-0">
      {/* Wordmark */}
      <div className="px-1">
        <p className="text-sm font-semibold tracking-tight text-zinc-100">taskyard</p>
        <p className="text-xs text-zinc-600">agent project mgmt</p>
      </div>

      {/* Projects */}
      <div>
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2 px-1">Projects</p>
        <div className="space-y-0.5">
          {projects.map(p => (
            <button
              key={p}
              onClick={() => setProject(p)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                project === p
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2 px-1">Board</p>
        <div className="space-y-1 px-1">
          <Stat label="Backlog"     value={counts.backlog} />
          <Stat label="In progress" value={counts["in-progress"]} accent="text-blue-400" />
          <Stat label="Review"      value={counts.review} accent="text-amber-400" />
          <Stat label="Blocked"     value={counts.blocked} accent={counts.blocked > 0 ? "text-red-400" : undefined} />
          <Stat label="Done"        value={counts.done} accent="text-emerald-500" />
        </div>

        {stalled > 0 && (
          <div className="mt-3 px-2 py-2 rounded bg-amber-950 border border-amber-800">
            <p className="text-xs text-amber-400 font-semibold">
              {stalled} stalled {stalled === 1 ? "task" : "tasks"}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">No progress &gt;30 min</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-1">
        <p className="text-xs text-zinc-700">MCP server: localhost</p>
      </div>
    </nav>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-mono tabular-nums ${accent ?? "text-zinc-400"}`}>
        {value}
      </span>
    </div>
  );
}
