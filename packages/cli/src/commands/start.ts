import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { createCLILogger, LogLevel } from "../logger.js";
import { createDaemonManager } from "../daemon.js";
import { ensureUserDir } from "../utils/user-dir.js";
import {
  loadGlobalConfig,
  loadProjectRegistry,
  updateProjectAccess,
  USER_DIR,
} from "../utils/central-config.js";

interface StartOptions {
  port: string;
  dashboard: boolean;
  background?: boolean;
  logLevel: string;
  central?: boolean;
}

export async function startCommand(options: StartOptions) {
  // Determine if this should be central mode
  const globalConfig = await loadGlobalConfig().catch(() => null);
  const isCentralMode = options.central || (globalConfig?.installation_type === "central");

  // In central mode: server runs from ~/.taskyard but aggregates all registered projects
  // In local mode: server runs from current directory only
  const root = process.cwd(); // Always use current directory as root
  const port = parseInt(options.port, 10) || (globalConfig?.dashboard_port ?? 3456);

  // Update project access time if in central mode
  if (isCentralMode) {
    await updateProjectAccess(root).catch(() => {});
  }

  // Parse log level from options
  const logLevelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };
  const logLevel = logLevelMap[options.logLevel.toLowerCase()] ?? LogLevel.INFO;
  const logger = createCLILogger("start", root, logLevel);

  // Ensure user directory exists
  const spinner = ora("Preparing environment...").start();
  await ensureUserDir();
  spinner.succeed("Environment ready");

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

  logger.info("Starting taskyard services", {
    root,
    port,
    dashboard: options.dashboard,
    mode: isCentralMode ? "central" : "local"
  });

  // Start MCP server (via the integrated module)
  const mcpSpinner = ora("Starting MCP server...").start();

  logger.debug("Starting integrated MCP server");

  // Import and start the MCP server directly
  const { startServer } = await import("../mcp-server/index.js");

  // Start the MCP server in a subprocess using spawn for consistency with existing architecture
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mcpServerPath = path.resolve(__dirname, "../mcp-server/index.js");

  logger.debug("Spawning integrated MCP server process", { path: mcpServerPath, port });
  const mcp = spawn(
    process.execPath,
    isCentralMode
      ? [mcpServerPath, "--root", root, "--http-port", String(port), "--central"]
      : [mcpServerPath, "--root", root, "--http-port", String(port)],
    { stdio: ["inherit", "inherit", "pipe"] }
  );

  // Track server readiness
  let mcpReady = false;
  let dashboardReady = false;

  mcp.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line.includes("MCP server ready")) {
      mcpReady = true;
      mcpSpinner.text = "MCP server ready, checking HTTP adapter...";
      logger.info("MCP server ready");
    } else if (line.includes("HTTP adapter listening")) {
      dashboardReady = true;
      mcpSpinner.succeed(chalk.green("✓ Taskyard services started"));
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
      mcpSpinner.fail(chalk.red("Startup timeout - services didn't start within 30 seconds"));
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
