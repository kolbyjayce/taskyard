import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChartBarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 border-r border-theme bg-secondary flex flex-col py-6 px-4 gap-6 flex-shrink-0"
    >
      {/* Wordmark */}
      <div className="px-2">
        <h1 className="text-lg font-bold tracking-tight text-primary">taskyard</h1>
        <p className="text-xs text-muted">agent project management</p>
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-2">
          <ChartBarIcon className="w-4 h-4 text-muted" />
          <p className="text-xs text-muted uppercase tracking-wider font-semibold">Projects</p>
        </div>
        <div className="space-y-1">
          {projects.map(p => (
            <motion.button
              key={p}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setProject(p)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm smooth-transition font-medium ${
                project === p
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-secondary hover:text-primary hover:bg-hover"
              }`}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3 px-2">
          <ChartBarIcon className="w-4 h-4 text-muted" />
          <p className="text-xs text-muted uppercase tracking-wider font-semibold">Board Status</p>
        </div>
        <div className="space-y-2 px-2">
          <Stat label="Backlog" value={counts.backlog} status="backlog" />
          <Stat label="In Progress" value={counts["in-progress"]} status="in-progress" />
          <Stat label="Review" value={counts.review} status="review" />
          <Stat label="Blocked" value={counts.blocked} status="blocked" />
          <Stat label="Done" value={counts.done} status="done" />
        </div>

        {stalled > 0 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 px-3 py-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="w-4 h-4 text-accent-warning" />
              <p className="text-sm text-accent-warning font-semibold">
                {stalled} Stalled {stalled === 1 ? "Task" : "Tasks"}
              </p>
            </div>
            <p className="text-xs text-muted">No progress for over 30 minutes</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 pt-4 border-t border-theme">
        <p className="text-xs text-muted">Connected to MCP server</p>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-2 h-2 bg-accent-success rounded-full"></div>
          <p className="text-xs text-muted">localhost:3456</p>
        </div>
      </div>
    </motion.nav>
  );
}

interface StatProps {
  label: string;
  value: number;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'text-muted',
  'in-progress': 'text-accent-primary',
  review: 'text-accent-warning',
  blocked: 'text-accent-danger',
  done: 'text-accent-success',
};

function Stat({ label, value, status }: StatProps) {
  const isWarning = status === 'blocked' && value > 0;

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-secondary font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {isWarning && <ExclamationTriangleIcon className="w-3 h-3 text-accent-danger" />}
        <span className={`text-sm font-mono tabular-nums font-semibold ${STATUS_COLORS[status]}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
