import chalk from "chalk";
import { createDaemonManager } from "../daemon.js";
import { createCLILogger, LogLevel } from "../logger.js";

interface RestartOptions {
  port: string;
  dashboard: boolean;
  logLevel: string;
}

export async function restartCommand(options: RestartOptions) {
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

  const logger = createCLILogger("restart", root, logLevel);
  const daemon = createDaemonManager(root);

  try {
    console.log("Restarting taskyard daemon...");
    await daemon.restart({
      port,
      dashboard: options.dashboard,
      logLevel,
    });
    console.log(chalk.green("✓ Taskyard daemon restarted"));
    console.log(chalk.cyan(`  Dashboard: http://localhost:${port}`));
  } catch (error) {
    logger.error("Failed to restart daemon", { error: String(error) });
    console.error(chalk.red(`Failed to restart daemon: ${error}`));
    process.exit(1);
  }
}