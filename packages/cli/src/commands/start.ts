import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { createCLILogger, LogLevel } from "../logger.js";
import { createDaemonManager } from "../daemon.js";
import { ensureUserDir, installDashboardAssets, isDashboardInstalled } from "../utils/user-dir.js";

interface StartOptions {
  port: string;
  dashboard: boolean;
  background?: boolean;
  logLevel: string;
}

export async function startCommand(options: StartOptions) {
  const root = process.cwd();
  const port = parseInt(options.port, 10);

  // Parse log level from options
  const logLevelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };
  const logLevel = logLevelMap[options.logLevel.toLowerCase()] ?? LogLevel.INFO;
  const logger = createCLILogger("start", root, logLevel);

  // Handle background mode
  if (options.background) {
    const daemon = createDaemonManager(root);
    try {
      await daemon.start({
        port,
        dashboard: options.dashboard,
        logLevel,
      });
      console.log(chalk.green("✓ Taskyard started in background"));
      console.log(chalk.cyan(`  Dashboard: http://localhost:${port}`));
      return;
    } catch (error) {
      console.error(chalk.red(`Failed to start daemon: ${error}`));
      process.exit(1);
    }
  }

  logger.info("Starting taskyard services", { root, port, dashboard: options.dashboard });

  // 1. Ensure user directory and dashboard assets are ready
  const spinner = ora("Preparing environment...").start();
  await ensureUserDir();

  if (options.dashboard && !(await isDashboardInstalled())) {
    spinner.text = "Installing dashboard assets...";
    try {
      await installDashboardAssets();
      logger.info("Dashboard assets installed");
    } catch (error) {
      spinner.warn(chalk.yellow("Failed to install dashboard assets"));
      logger.error("Dashboard installation failed", { error: String(error) });
    }
  }

  // 2. Start MCP server (via the installed package)
  spinner.text = "Starting MCP server...";
  spinner.start();

  logger.debug("Resolving MCP server path");
  const mcpServerURL = await import.meta.resolve("@taskyard/mcp-server");
  const mcpServerPath = fileURLToPath(mcpServerURL);

  logger.debug("Spawning MCP server process", { path: mcpServerPath, port });
  const mcp = spawn(
    process.execPath,
    [mcpServerPath, "--root", root, "--http-port", String(port)],
    { stdio: ["inherit", "inherit", "pipe"] }
  );

  // Track server readiness
  let mcpReady = false;
  let dashboardReady = false;

  mcp.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line.includes("MCP server ready")) {
      mcpReady = true;
      spinner.text = "MCP server ready, checking HTTP adapter...";
      logger.info("MCP server ready");
    } else if (line.includes("HTTP adapter listening")) {
      dashboardReady = true;
      spinner.succeed(chalk.green("✓ Taskyard services started"));
      console.log(chalk.cyan(`  Dashboard: ${line.split("url: ")[1]}`));
      console.log(chalk.dim("  Press Ctrl+C to stop"));
      logger.info("All services ready", { line });
    } else {
      logger.debug("MCP server output", { line });
    }
  });

  mcp.on("exit", (code) => {
    logger.error("MCP server exited", { code });
    if (code !== 0) {
      console.error(chalk.red(`MCP server exited with code ${code}`));
      process.exit(1);
    }
  });

  // Note: Dashboard is now served directly by the MCP server from ~/.taskyard/dashboard
  // No need for separate Vite dev server when running from installed package

  // Setup startup timeout
  const startupTimeout = setTimeout(() => {
    if (!mcpReady || !dashboardReady) {
      spinner.fail(chalk.red("Startup timeout - services didn't start within 30 seconds"));
      logger.error("Startup timeout", { mcpReady, dashboardReady });
      mcp.kill("SIGTERM");
      process.exit(1);
    }
  }, 30000);

  // Health check after startup
  const healthCheck = async () => {
    if (mcpReady && dashboardReady) {
      clearTimeout(startupTimeout);
      try {
        const res = await fetch(`http://localhost:${port}/api/projects`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          logger.info("Health check passed");
        } else {
          logger.warn("Health check failed", { status: res.status });
        }
      } catch (error) {
        logger.warn("Health check error", { error: String(error) });
      }
    }
  };

  // Run health check 2 seconds after both services are ready
  let healthCheckTimer: NodeJS.Timeout;
  const scheduleHealthCheck = () => {
    if (mcpReady && dashboardReady && !healthCheckTimer) {
      healthCheckTimer = setTimeout(healthCheck, 2000);
    }
  };

  // Check after each service becomes ready
  mcp.stderr?.on("data", () => scheduleHealthCheck());

  // Graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down gracefully");
    clearTimeout(startupTimeout);
    clearTimeout(healthCheckTimer);
    mcp.kill("SIGTERM");
    process.exit(0);
  });
}
