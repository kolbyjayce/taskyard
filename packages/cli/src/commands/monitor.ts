import chalk from "chalk";
import { createCLILogger } from "../logger.js";
import { createDaemonManager } from "../daemon.js";
import fs from "fs/promises";
import path from "path";

interface MonitorOptions {
  interval: string;
  log?: boolean;
}

interface HealthMetrics {
  timestamp: string;
  daemon: {
    running: boolean;
    pid?: number;
    uptime?: string;
    memory?: number;
  };
  http: {
    accessible: boolean;
    responseTime?: number;
    status?: number;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    stalled: number;
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    loadAvg?: number[];
  };
}

export async function monitorCommand(options: MonitorOptions) {
  const root = process.cwd();
  const logger = createCLILogger("monitor", root);
  const daemon = createDaemonManager(root);
  const interval = parseInt(options.interval, 10) * 1000; // Convert to ms

  logger.info("Starting taskyard monitor", { interval: options.interval });

  console.log(chalk.bold("🔍 Taskyard Monitor"));
  console.log(chalk.dim(`Checking every ${options.interval} seconds. Press Ctrl+C to stop.\n`));

  let monitorCount = 0;

  const collectMetrics = async (): Promise<HealthMetrics> => {
    const timestamp = new Date().toISOString();

    // Check daemon status
    const daemonStatus = await daemon.status();
    const daemonMetrics = {
      running: daemonStatus.running,
      pid: daemonStatus.info?.pid,
      uptime: daemonStatus.uptime,
    };

    // Check HTTP API
    const httpStart = Date.now();
    let httpMetrics: HealthMetrics['http'] = { accessible: false };

    try {
      const res = await fetch("http://localhost:3456/api/projects", {
        signal: AbortSignal.timeout(5000),
      });
      httpMetrics = {
        accessible: res.ok,
        responseTime: Date.now() - httpStart,
        status: res.status,
      };
    } catch (error) {
      httpMetrics = {
        accessible: false,
        responseTime: Date.now() - httpStart,
      };
    }

    // Get task statistics
    let taskMetrics: HealthMetrics['tasks'] = {
      total: 0,
      byStatus: {},
      stalled: 0,
    };

    try {
      if (httpMetrics.accessible) {
        const tasksRes = await fetch("http://localhost:3456/api/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "get_status", args: { project: "default" } }),
          signal: AbortSignal.timeout(3000),
        });

        if (tasksRes.ok) {
          const status = await tasksRes.json();
          const counts = status.counts || {};
          const total = Object.values(counts).reduce((a: number, b: unknown) => {
            return a + (typeof b === 'number' ? b : 0);
          }, 0);

          taskMetrics = {
            total,
            byStatus: counts,
            stalled: status.stalled?.length || 0,
          };
        }
      }
    } catch (error) {
      // Task metrics will remain at defaults
    }

    // Performance metrics
    const performanceMetrics = {
      memoryUsage: process.memoryUsage(),
      loadAvg: process.platform !== "win32" ? require("os").loadavg() : undefined,
    };

    return {
      timestamp,
      daemon: daemonMetrics,
      http: httpMetrics,
      tasks: taskMetrics,
      performance: performanceMetrics,
    };
  };

  const displayMetrics = (metrics: HealthMetrics) => {
    const time = new Date(metrics.timestamp).toLocaleTimeString();

    console.clear();
    console.log(chalk.bold("🔍 Taskyard Monitor") + chalk.dim(` - ${time}`));
    console.log();

    // Daemon status
    const daemonIcon = metrics.daemon.running ? chalk.green("●") : chalk.red("●");
    const daemonDetail = metrics.daemon.running
      ? `PID ${metrics.daemon.pid}, up ${metrics.daemon.uptime}`
      : "not running";
    console.log(`${daemonIcon} Daemon: ${daemonDetail}`);

    // HTTP API status
    const httpIcon = metrics.http.accessible ? chalk.green("●") : chalk.red("●");
    const httpDetail = metrics.http.accessible
      ? `${metrics.http.responseTime}ms response`
      : `unavailable (${metrics.http.responseTime}ms timeout)`;
    console.log(`${httpIcon} HTTP API: ${httpDetail}`);

    // Task statistics
    if (metrics.tasks.total > 0) {
      console.log(chalk.dim("\n📊 Tasks:"));
      Object.entries(metrics.tasks.byStatus).forEach(([status, count]) => {
        if (count > 0) {
          const statusColor = {
            backlog: chalk.gray,
            "in-progress": chalk.blue,
            review: chalk.yellow,
            done: chalk.green,
            blocked: chalk.red,
          }[status] || chalk.white;
          console.log(`   ${statusColor(status)}: ${count}`);
        }
      });

      if (metrics.tasks.stalled > 0) {
        console.log(chalk.red(`   stalled: ${metrics.tasks.stalled}`));
      }
    } else {
      console.log(chalk.dim("\n📊 No tasks found"));
    }

    // Performance info
    const memMB = Math.round(metrics.performance.memoryUsage.rss / 1024 / 1024);
    console.log(chalk.dim(`\n💾 Memory: ${memMB}MB RSS`));

    if (metrics.performance.loadAvg) {
      const load = metrics.performance.loadAvg[0].toFixed(2);
      console.log(chalk.dim(`⚡ Load: ${load}`));
    }

    console.log(chalk.dim(`\nMonitor checks: ${++monitorCount}`));
  };

  const logMetrics = async (metrics: HealthMetrics) => {
    if (!options.log) return;

    try {
      const logDir = path.join(root, ".taskyard/logs");
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, "monitor.jsonl");
      const logLine = JSON.stringify(metrics) + "\n";
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      logger.warn("Failed to log metrics", { error: String(error) });
    }
  };

  // Initial check
  try {
    const metrics = await collectMetrics();
    displayMetrics(metrics);
    await logMetrics(metrics);
  } catch (error) {
    console.error(chalk.red(`Monitor error: ${error}`));
  }

  // Set up interval
  const monitorInterval = setInterval(async () => {
    try {
      const metrics = await collectMetrics();
      displayMetrics(metrics);
      await logMetrics(metrics);
    } catch (error) {
      logger.error("Monitor check failed", { error: String(error) });
      console.log(chalk.red(`\nMonitor error: ${error}`));
    }
  }, interval);

  // Graceful shutdown
  process.on("SIGINT", () => {
    clearInterval(monitorInterval);
    console.log(chalk.yellow("\n\n👋 Monitor stopped"));
    process.exit(0);
  });
}