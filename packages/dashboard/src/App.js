"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Board_1 = require("./components/Board");
const Sidebar_1 = require("./components/Sidebar");
const ActivityFeed_1 = require("./components/ActivityFeed");
const TaskDetail_1 = require("./components/TaskDetail");
const board_1 = require("./stores/board");
function App() {
    const { fetchTasks, selectedTaskId } = (0, board_1.useBoardStore)();
    (0, react_1.useEffect)(() => {
        fetchTasks();
        // Poll every 10s — cheap since it's just reading local files via MCP
        const interval = setInterval(fetchTasks, 10_000);
        return () => clearInterval(interval);
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-screen bg-zinc-950 text-zinc-100 font-mono overflow-hidden", children: [(0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, {}), (0, jsx_runtime_1.jsx)("main", { className: "flex-1 flex flex-col min-w-0", children: (0, jsx_runtime_1.jsx)(Board_1.Board, {}) }), (0, jsx_runtime_1.jsx)("aside", { className: "w-80 border-l border-zinc-800 flex flex-col", children: selectedTaskId ? (0, jsx_runtime_1.jsx)(TaskDetail_1.TaskDetail, { taskId: selectedTaskId }) : (0, jsx_runtime_1.jsx)(ActivityFeed_1.ActivityFeed, {}) })] }));
}
exports.default = App;
//# sourceMappingURL=App.js.map