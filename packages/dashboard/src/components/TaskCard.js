"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCard = TaskCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const board_1 = require("../stores/board");
const HeartbeatDot_1 = require("./HeartbeatDot");
const PRIORITY_DOT = {
    critical: "bg-red-500",
    high: "bg-amber-400",
    medium: "bg-blue-400",
    low: "bg-zinc-600",
};
function TaskCard({ task }) {
    const { selectTask, selectedTaskId } = (0, board_1.useBoardStore)();
    const isSelected = selectedTaskId === task.id;
    const isStalled = isTaskStalled(task);
    return ((0, jsx_runtime_1.jsxs)("button", { onClick: () => selectTask(isSelected ? null : task.id), className: `
        w-full text-left p-3 rounded border transition-all
        ${isSelected
            ? "border-zinc-500 bg-zinc-800"
            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-850"}
        ${isStalled ? "border-l-2 border-l-amber-500" : ""}
      `, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: `w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}` }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-500 font-mono", children: task.id }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), task.status === "in-progress" && ((0, jsx_runtime_1.jsx)(HeartbeatDot_1.HeartbeatDot, { lastBeat: task.last_heartbeat })), task.needs_handoff && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-amber-400 font-semibold", children: "HANDOFF" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-zinc-200 leading-snug", children: task.title }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mt-2 flex-wrap", children: [task.assigned_to && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-zinc-500 truncate max-w-[120px]", children: ["\u21B3 ", task.assigned_to] })), task.tags.slice(0, 2).map(tag => ((0, jsx_runtime_1.jsx)("span", { className: "text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400", children: tag }, tag))), task.attempt_count > 1 && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-red-400 ml-auto", children: ["\u00D7", task.attempt_count] }))] })] }));
}
function isTaskStalled(task) {
    if (task.status !== "in-progress")
        return false;
    if (!task.last_progress_at)
        return false;
    return Date.now() - new Date(task.last_progress_at).getTime() > 30 * 60 * 1000;
}
//# sourceMappingURL=TaskCard.js.map