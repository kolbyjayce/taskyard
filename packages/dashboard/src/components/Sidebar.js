"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const board_1 = require("../stores/board");
function Sidebar() {
    const { tasks, project, setProject } = (0, board_1.useBoardStore)();
    const [projects, setProjects] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch("/api/projects")
            .then(r => r.json())
            .then(setProjects)
            .catch(() => { });
    }, []);
    const counts = {
        backlog: tasks.filter(t => t.status === "backlog").length,
        "in-progress": tasks.filter(t => t.status === "in-progress").length,
        review: tasks.filter(t => t.status === "review").length,
        blocked: tasks.filter(t => t.status === "blocked").length,
        done: tasks.filter(t => t.status === "done").length,
    };
    const stalled = tasks.filter(t => {
        if (t.status !== "in-progress" || !t.last_progress_at)
            return false;
        return Date.now() - new Date(t.last_progress_at).getTime() > 30 * 60 * 1000;
    }).length;
    return ((0, jsx_runtime_1.jsxs)("nav", { className: "w-52 border-r border-zinc-800 flex flex-col py-4 px-3 gap-6 flex-shrink-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tracking-tight text-zinc-100", children: "taskyard" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-600", children: "agent project mgmt" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-600 uppercase tracking-wider mb-2 px-1", children: "Projects" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-0.5", children: projects.map(p => ((0, jsx_runtime_1.jsx)("button", { onClick: () => setProject(p), className: `w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${project === p
                                ? "bg-zinc-800 text-zinc-100"
                                : "text-zinc-500 hover:text-zinc-300"}`, children: p }, p))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-600 uppercase tracking-wider mb-2 px-1", children: "Board" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 px-1", children: [(0, jsx_runtime_1.jsx)(Stat, { label: "Backlog", value: counts.backlog }), (0, jsx_runtime_1.jsx)(Stat, { label: "In progress", value: counts["in-progress"], accent: "text-blue-400" }), (0, jsx_runtime_1.jsx)(Stat, { label: "Review", value: counts.review, accent: "text-amber-400" }), (0, jsx_runtime_1.jsx)(Stat, { label: "Blocked", value: counts.blocked, accent: counts.blocked > 0 ? "text-red-400" : undefined }), (0, jsx_runtime_1.jsx)(Stat, { label: "Done", value: counts.done, accent: "text-emerald-500" })] }), stalled > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 px-2 py-2 rounded bg-amber-950 border border-amber-800", children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-amber-400 font-semibold", children: [stalled, " stalled ", stalled === 1 ? "task" : "tasks"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-amber-600 mt-0.5", children: "No progress >30 min" })] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "px-1", children: (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-700", children: "MCP server: localhost" }) })] }));
}
function Stat({ label, value, accent }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-baseline", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-500", children: label }), (0, jsx_runtime_1.jsx)("span", { className: `text-xs font-mono tabular-nums ${accent ?? "text-zinc-400"}`, children: value })] }));
}
//# sourceMappingURL=Sidebar.js.map