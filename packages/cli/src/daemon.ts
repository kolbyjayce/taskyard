import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { createCLILogger, LogLevel } from "./logger.js";

interface DaemonInfo {
  pid: number;
  port: number;
  startTime: string;
  logFile: string;
  root: string;
}

export class DaemonManager {
  private root: string;
  private pidFile: string;
  private logger: ReturnType<typeof createCLILogger>;

  constructor(root: string) {
    this.root = root;
    this.pidFile = path.join(root, ".taskyard", "daemon.pid");
    this.logger = createCLILogger("daemon", root);
  }

  private async ensureTaskyardDir(): Promise<void> {
    const taskyardDir = path.join(this.root, ".taskyard");
    await fs.mkdir(taskyardDir, { recursive: true });
  }

  async isRunning(): Promise<boolean> {
    try {
      const info = await this.getInfo();
      if (!info) return false;

      // Check if process is still alive
      try {
        process.kill(info.pid, 0); // Signal 0 just checks if process exists
        return true;
      } catch {
        // Process doesn't exist, clean up stale pid file
        await this.cleanup();
        return false;
      }
    } catch {
      return false;
    }
  }

  async getInfo(): Promise<DaemonInfo | null> {
    try {
      const data = await fs.readFile(this.pidFile, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async start(options: {
    port: number;
    dashboard: boolean;
    logLevel: LogLevel;
  }): Promise<void> {
    if (await this.isRunning()) {
      throw new Error("Taskyard daemon is already running");
    }

    await this.ensureTaskyardDir();

    const logFile = path.join(this.root, ".taskyard", "logs", "daemon.log");
    await fs.mkdir(path.dirname(logFile), { recursive: true });

    this.logger.info("Starting daemon", options);

    // Start MCP server directly using built CLI entry point
    const { fileURLToPath } = await import("url");
    const currentModuleUrl = import.meta.url;
    const currentModulePath = fileURLToPath(currentModuleUrl);
    const cliEntryPath = path.resolve(path.dirname(currentModulePath), "index.js");

    // Start MCP server directly as detached process
    const child = spawn(
      process.execPath,
      [
        cliEntryPath,
        "start",
        "--root", this.root,
        "--http-port", String(options.port),
        "--daemon"
      ],
      {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
        cwd: this.root,
      }
    );

    // Unref so parent can exit
    child.unref();

    // Save daemon info
    const info: DaemonInfo = {
      pid: child.pid!,
      port: options.port,
      startTime: new Date().toISOString(),
      logFile,
      root: this.root,
    };

    await fs.writeFile(this.pidFile, JSON.stringify(info, null, 2));

    this.logger.info("Daemon started", { pid: child.pid, port: options.port });
  }

  async stop(): Promise<void> {
    const info = await this.getInfo();
    if (!info) {
      throw new Error("No running taskyard daemon found");
    }

    this.logger.info("Stopping daemon", { pid: info.pid });

    try {
      // Try graceful shutdown first
      process.kill(info.pid, "SIGTERM");

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if still running
      try {
        process.kill(info.pid, 0);
        // Still running, force kill
        this.logger.warn("Daemon didn't stop gracefully, force killing", { pid: info.pid });
        process.kill(info.pid, "SIGKILL");
      } catch {
        // Process is dead, good
      }
    } catch (error) {
      this.logger.warn("Error stopping daemon", { error: String(error) });
    } finally {
      await this.cleanup();
    }

    this.logger.info("Daemon stopped");
  }

  async restart(options: {
    port: number;
    dashboard: boolean;
    logLevel: LogLevel;
  }): Promise<void> {
    const wasRunning = await this.isRunning();
    if (wasRunning) {
      await this.stop();
    }

    // Small delay to ensure clean shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.start(options);
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.unlink(this.pidFile);
    } catch {
      // Ignore errors
    }
  }

  async status(): Promise<{
    running: boolean;
    info?: DaemonInfo;
    uptime?: string;
  }> {
    const info = await this.getInfo();
    const running = await this.isRunning();

    if (!running || !info) {
      return { running: false };
    }

    const uptime = this.calculateUptime(info.startTime);
    return { running: true, info, uptime };
  }

  private calculateUptime(startTime: string): string {
    const start = new Date(startTime);
    const now = new Date();
    const uptimeMs = now.getTime() - start.getTime();

    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

export function createDaemonManager(root?: string): DaemonManager {
  return new DaemonManager(root || process.cwd());
}