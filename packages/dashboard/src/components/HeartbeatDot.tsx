// Pulsing dot that shows whether an agent's heartbeat is current.
// Green + pulse = alive, amber = warn (>4min), red = expired (>10min)

import { useMemo } from "react";

interface Props {
  lastBeat: string | null;
}

export function HeartbeatDot({ lastBeat }: Props) {
  const state = useMemo(() => {
    if (!lastBeat) return "unknown";
    const age = Date.now() - new Date(lastBeat).getTime();
    if (age < 4 * 60 * 1000) return "alive";
    if (age < 10 * 60 * 1000) return "warn";
    return "expired";
  }, [lastBeat]);

  const color = {
    alive:   "bg-emerald-400",
    warn:    "bg-amber-400",
    expired: "bg-red-500",
    unknown: "bg-zinc-600",
  }[state];

  const pulse = state === "alive"
    ? "animate-pulse"
    : "";

  const title = {
    alive:   "Agent heartbeat current",
    warn:    "Heartbeat delayed — agent may be slow",
    expired: "Heartbeat expired — watchdog will reclaim",
    unknown: "No heartbeat data",
  }[state];

  return (
    <span
      title={title}
      className={`w-1.5 h-1.5 rounded-full ${color} ${pulse}`}
    />
  );
}
