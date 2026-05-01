#!/usr/bin/env node
import os from "os";
import path from "path";
import { program } from "commander";
import { startServer } from "./mcp-server/index.js";

const DEFAULT_ROOT = path.join(os.homedir(), ".taskyard");

program
  .name("taskyard")
  .description("Agent-first todo. Markdown files and an MCP server.")
  .version("0.1.0");

program
  .command("start", { isDefault: true })
  .description("Start the MCP server (stdio transport)")
  .option("--root <path>", "root directory for task files", DEFAULT_ROOT)
  .action(async ({ root }) => {
    await startServer(root);
  });

program.parseAsync();
