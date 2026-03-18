"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityFeed = ActivityFeed;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function parseEntry(line) {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.Z]+) — (.+)$/);
    if (!match)
        return null;
    const [, timestamp, message] = match;
    const upper = message.toUpperCase();
    const type = upper.startsWith("CREATE") ? "create" :
        upper.startsWith("CLAIM") ? "claim" :
            upper.startsWith("COMPLETE") ? "complete" :
                upper.startsWith("RELEASE") ? "release" :
                    upper.startsWith("WATCHDOG") ? "watchdog" : "other";
    return { timestamp, message, type };
}
const TYPE_STYLE = {
    create: "text-blue-400",
    claim: "text-purple-400",
    complete: "text-emerald-400",
    release: "text-amber-400",
    watchdog: "text-red-400",
    other: "text-zinc-500",
};
const TYPE_GLYPH = {
    create: "+",
    claim: "→",
    complete: "✓",
    release: "↺",
    watchdog: "⚡",
    other: "·",
};
function ActivityFeed() {
    const [entries, setEntries] = (0, react_1.useState)([]);
    const bottomRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        async function load() {
            try {
                const res = await fetch("/api/changelog");
                const text = await res.text();
                const parsed = text
                    .split("\n")
                    .map(parseEntry)
                    .filter(Boolean);
                setEntries(parsed.slice(-100)); // last 100 entries
            }
            catch {
                // silently fail — dashboard is best-effort
            }
        }
        load();
        const interval = setInterval(load, 5_000);
        return () => clearInterval(interval);
    }, []);
    // Auto-scroll to bottom on new entries
    (0, react_1.useEffect)(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [entries.length]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "px-4 py-3 border-b border-zinc-800", children: (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-500 uppercase tracking-wider", children: "Activity" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 overflow-y-auto px-4 py-3 space-y-1.5", children: [entries.length === 0 && ((0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-700 mt-4 text-center", children: "No activity yet" })), entries.map((entry, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 items-baseline", children: [(0, jsx_runtime_1.jsx)("span", { className: `text-xs font-mono flex-shrink-0 ${TYPE_STYLE[entry.type]}`, children: TYPE_GLYPH[entry.type] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-300 leading-snug", children: entry.message }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-zinc-700 font-mono", children: formatTime(entry.timestamp) })] })] }, i))), (0, jsx_runtime_1.jsx)("div", { ref: bottomRef })] })] }));
}
function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
//# sourceMappingURL=ActivityFeed.js.map