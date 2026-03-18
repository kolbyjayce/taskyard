import { useState, useEffect, useRef } from "react";

interface Entry {
  timestamp: string;
  message: string;
  type: "create" | "claim" | "complete" | "release" | "watchdog" | "other";
}

function parseEntry(line: string): Entry | null {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.Z]+) — (.+)$/);
  if (!match) return null;
  const [, timestamp, message] = match;
  const upper = message.toUpperCase();
  const type =
    upper.startsWith("CREATE")   ? "create"   :
    upper.startsWith("CLAIM")    ? "claim"    :
    upper.startsWith("COMPLETE") ? "complete" :
    upper.startsWith("RELEASE")  ? "release"  :
    upper.startsWith("WATCHDOG") ? "watchdog" : "other";
  return { timestamp, message, type };
}

const TYPE_STYLE: Record<Entry["type"], string> = {
  create:   "text-blue-400",
  claim:    "text-purple-400",
  complete: "text-emerald-400",
  release:  "text-amber-400",
  watchdog: "text-red-400",
  other:    "text-zinc-500",
};

const TYPE_GLYPH: Record<Entry["type"], string> = {
  create:   "+",
  claim:    "→",
  complete: "✓",
  release:  "↺",
  watchdog: "⚡",
  other:    "·",
};

export function ActivityFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/changelog");
        const text = await res.text();
        const parsed = text
          .split("\n")
          .map(parseEntry)
          .filter(Boolean) as Entry[];
        setEntries(parsed.slice(-100)); // last 100 entries
      } catch {
        // silently fail — dashboard is best-effort
      }
    }

    load();
    const interval = setInterval(load, 5_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Activity</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {entries.length === 0 && (
          <p className="text-xs text-zinc-700 mt-4 text-center">No activity yet</p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2 items-baseline">
            <span className={`text-xs font-mono flex-shrink-0 ${TYPE_STYLE[entry.type]}`}>
              {TYPE_GLYPH[entry.type]}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-zinc-300 leading-snug">{entry.message}</p>
              <p className="text-xs text-zinc-700 font-mono">{formatTime(entry.timestamp)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
