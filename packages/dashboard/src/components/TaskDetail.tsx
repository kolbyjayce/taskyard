import { useState } from "react";
import { useBoardStore, type Task, type TaskStatus, type TaskPriority } from "../stores/board";

const STATUS_OPTIONS: TaskStatus[] = ["backlog", "in-progress", "review", "blocked", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "critical"];

export function TaskDetail({ taskId }: { taskId: string }) {
  const { tasks, updateTask, selectTask } = useBoardStore();
  const task = tasks.find(t => t.id === taskId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!task) return (
    <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
      Task not found
    </div>
  );

  async function handleChange<K extends keyof Task>(field: K, value: Task[K]) {
    setSaving(true);
    setError(null);
    try {
      await updateTask(taskId, { [field]: value });
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">{task.id}</span>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-zinc-500">saving…</span>}
          <button
            onClick={() => selectTask(null)}
            className="text-zinc-500 hover:text-zinc-300 text-sm"
          >✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Title</label>
          <p className="text-sm text-zinc-100 leading-snug">{task.title}</p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Status</label>
          <select
            value={task.status}
            onChange={e => handleChange("status", e.target.value as TaskStatus)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Priority</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => handleChange("priority", p)}
                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                  task.priority === p
                    ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Tags</label>
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {tag}
              </span>
            ))}
            {task.tags.length === 0 && (
              <span className="text-xs text-zinc-700">none</span>
            )}
          </div>
        </div>

        {/* Agent info */}
        <div className="border border-zinc-800 rounded p-3 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Agent info</p>
          <Row label="Assigned" value={task.assigned_to ?? "—"} />
          <Row label="Attempts" value={String(task.attempt_count)} warn={task.attempt_count >= 2} />
          <Row label="Heartbeat" value={formatAge(task.last_heartbeat)} />
          <Row label="Progress" value={formatAge(task.last_progress_at)} />
          {task.needs_handoff && (
            <div className="text-xs text-amber-400 font-semibold mt-1">
              ⚠ Needs handoff — check HANDOFF.md
            </div>
          )}
          {task.previous_agents.length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 mb-0.5">Previous agents</p>
              {task.previous_agents.map((a, i) => (
                <p key={i} className="text-xs text-zinc-500 font-mono truncate">{a}</p>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-xs text-red-400 bg-red-950 border border-red-800 rounded p-2">
            {error}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-zinc-800 px-4 py-3 flex gap-2">
        <button
          onClick={() => handleChange("status", "done")}
          disabled={task.status === "done"}
          className="flex-1 py-1.5 text-xs rounded bg-emerald-900 text-emerald-300 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Mark done
        </button>
        <button
          onClick={() => handleChange("status", "blocked")}
          disabled={task.status === "blocked" || task.status === "done"}
          className="flex-1 py-1.5 text-xs rounded bg-red-950 text-red-400 hover:bg-red-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Block
        </button>
        <button
          onClick={() => handleChange("status", "backlog")}
          disabled={task.status === "backlog" || task.status === "done"}
          className="flex-1 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Requeue
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-zinc-600">{label}</span>
      <span className={`text-xs font-mono ${warn ? "text-amber-400" : "text-zinc-400"}`}>
        {value}
      </span>
    </div>
  );
}

function formatAge(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
