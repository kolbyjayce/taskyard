#!/usr/bin/env node
import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";
import { restartCommand } from "./commands/restart.js";
import { statusCommand } from "./commands/status.js";
import { doctorCommand } from "./commands/doctor.js";

program
  .name("taskyard")
  .description("Agent-first project management. Markdown files, git, MCP.")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold taskyard structure in the current git repo")
  .option("--dir <path>", "subdirectory to initialize in", ".")
  .option("--force", "overwrite existing taskyard files")
  .action(initCommand);

program
  .command("start")
  .description("Start the MCP server and dashboard")
  .option("--port <number>", "dashboard port", "3456")
  .option("--no-dashboard", "start MCP server only")
  .option("--background", "run in background (daemon mode)")
  .option("--log-level <level>", "log level (debug, info, warn, error)", "info")
  .action(startCommand);

program
  .command("stop")
  .description("Stop the background MCP server and dashboard")
  .action(stopCommand);

program
  .command("restart")
  .description("Restart the background MCP server and dashboard")
  .option("--port <number>", "dashboard port", "3456")
  .option("--no-dashboard", "start MCP server only")
  .option("--log-level <level>", "log level (debug, info, warn, error)", "info")
  .action(restartCommand);

program
  .command("status")
  .description("Print current board to terminal")
  .option("--project <name>", "filter to a specific project")
  .option("--quiet", "minimal output for scripts")
  .action(statusCommand);

program
  .command("doctor")
  .description("Check environment: node version, git, config, ports")
  .option("--fix", "automatically fix issues where possible")
  .action(doctorCommand);

program
  .command("monitor")
  .description("Monitor taskyard services and performance")
  .option("--interval <seconds>", "monitoring interval in seconds", "30")
  .option("--log", "log monitoring data to file")
  .action(async (options) => {
    const { monitorCommand } = await import("./commands/monitor.js");
    await monitorCommand(options);
  });

program.parse();
