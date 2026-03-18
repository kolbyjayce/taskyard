"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Board = Board;
const jsx_runtime_1 = require("react/jsx-runtime");
const board_1 = require("../stores/board");
const TaskCard_1 = require("./TaskCard");
const COLUMNS = [
    { id: "backlog", label: "Backlog" },
    { id: "in-progress", label: "In progress" },
    { id: "review", label: "Review" },
    { id: "blocked", label: "Blocked" },
    { id: "done", label: "Done" },
];
const COLUMN_ACCENT = {
    "backlog": "border-zinc-700",
    "in-progress": "border-blue-500",
    "review": "border-amber-500",
    "blocked": "border-red-500",
    "done": "border-emerald-600",
};
function Board() {
    const { tasks } = (0, board_1.useBoardStore)();
    const byStatus = (status) => tasks.filter(t => t.status === status);
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-x-auto p-6", children: (0, jsx_runtime_1.jsx)("div", { className: "flex gap-4 h-full min-w-max", children: COLUMNS.map(col => ((0, jsx_runtime_1.jsxs)("div", { className: `flex flex-col w-64 border-t-2 ${COLUMN_ACCENT[col.id]}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between py-3 px-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs font-semibold uppercase tracking-widest text-zinc-400", children: col.label }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-600 tabular-nums", children: byStatus(col.id).length })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 flex flex-col gap-2 overflow-y-auto pb-4", children: byStatus(col.id).map(task => ((0, jsx_runtime_1.jsx)(TaskCard_1.TaskCard, { task: task }, task.id))) })] }, col.id))) }) }));
}
//# sourceMappingURL=Board.js.map