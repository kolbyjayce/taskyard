"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDetail = TaskDetail;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const board_1 = require("../stores/board");
const STATUS_OPTIONS = ["backlog", "in-progress", "review", "blocked", "done"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
function TaskDetail({ taskId }) {
    const { tasks, updateTask, selectTask } = (0, board_1.useBoardStore)();
    const task = tasks.find(t => t.id === taskId);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    if (!task)
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 flex items-center justify-center text-zinc-600 text-sm", children: "Task not found" }));
    async function handleChange(field, value) {
        setSaving(true);
        setError(null);
        try {
            await updateTask(taskId, { [field]: value });
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setSaving(false);
        }
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-4 py-3 border-b border-zinc-800", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-500 font-mono", children: task.id }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [saving && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-500", children: "saving\u2026" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => selectTask(null), className: "text-zinc-500 hover:text-zinc-300 text-sm", children: "\u2715" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 overflow-y-auto px-4 py-4 space-y-5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs text-zinc-500 mb-1 uppercase tracking-wider", children: "Title" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-zinc-100 leading-snug", children: task.title })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs text-zinc-500 mb-1 uppercase tracking-wider", children: "Status" }), (0, jsx_runtime_1.jsx)("select", { value: task.status, onChange: e => handleChange("status", e.target.value), className: "w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500", children: STATUS_OPTIONS.map(s => ((0, jsx_runtime_1.jsx)("option", { value: s, children: s }, s))) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs text-zinc-500 mb-1 uppercase tracking-wider", children: "Priority" }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2", children: PRIORITY_OPTIONS.map(p => ((0, jsx_runtime_1.jsx)("button", { onClick: () => handleChange("priority", p), className: `flex-1 py-1 text-xs rounded border transition-colors ${task.priority === p
                                        ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`, children: p }, p))) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs text-zinc-500 mb-1 uppercase tracking-wider", children: "Tags" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1", children: [task.tags.map(tag => ((0, jsx_runtime_1.jsx)("span", { className: "text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400", children: tag }, tag))), task.tags.length === 0 && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-700", children: "none" }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "border border-zinc-800 rounded p-3 space-y-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-500 uppercase tracking-wider", children: "Agent info" }), (0, jsx_runtime_1.jsx)(Row, { label: "Assigned", value: task.assigned_to ?? "—" }), (0, jsx_runtime_1.jsx)(Row, { label: "Attempts", value: String(task.attempt_count), warn: task.attempt_count >= 2 }), (0, jsx_runtime_1.jsx)(Row, { label: "Heartbeat", value: formatAge(task.last_heartbeat) }), (0, jsx_runtime_1.jsx)(Row, { label: "Progress", value: formatAge(task.last_progress_at) }), task.needs_handoff && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-amber-400 font-semibold mt-1", children: "\u26A0 Needs handoff \u2014 check HANDOFF.md" })), task.previous_agents.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-600 mb-0.5", children: "Previous agents" }), task.previous_agents.map((a, i) => ((0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-500 font-mono truncate", children: a }, i)))] }))] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-red-400 bg-red-950 border border-red-800 rounded p-2", children: error }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "border-t border-zinc-800 px-4 py-3 flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleChange("status", "done"), disabled: task.status === "done", className: "flex-1 py-1.5 text-xs rounded bg-emerald-900 text-emerald-300 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: "Mark done" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleChange("status", "blocked"), disabled: task.status === "blocked" || task.status === "done", className: "flex-1 py-1.5 text-xs rounded bg-red-950 text-red-400 hover:bg-red-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: "Block" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleChange("status", "backlog"), disabled: task.status === "backlog" || task.status === "done", className: "flex-1 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: "Requeue" })] })] }));
}
function Row({ label, value, warn }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-baseline", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-600", children: label }), (0, jsx_runtime_1.jsx)("span", { className: `text-xs font-mono ${warn ? "text-amber-400" : "text-zinc-400"}`, children: value })] }));
}
function formatAge(iso) {
    if (!iso)
        return "—";
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1)
        return "just now";
    if (min < 60)
        return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
}
//# sourceMappingURL=TaskDetail.js.map