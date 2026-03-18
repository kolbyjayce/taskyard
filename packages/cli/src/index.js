#!/usr/bin/env node
import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
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
    .action(startCommand);
program
    .command("status")
    .description("Print current board to terminal")
    .option("--project <name>", "filter to a specific project")
    .action(statusCommand);
program
    .command("doctor")
    .description("Check environment: node version, git, config, ports")
    .action(doctorCommand);
program.parse();
//# sourceMappingURL=index.js.map