#!/usr/bin/env node
import { program } from "commander";
import { startServer } from "./mcp-server/index.js";

program
  .name("taskyard")
  .description("Agent-first todo. Markdown files and an MCP server.")
  .version("0.1.0");

program
  .command("start", { isDefault: true })
  .description("Start the MCP server (stdio transport)")
  .option("--root <path>", "root directory for task files", process.cwd())
  .action(async ({ root }) => {
    await startServer(root);
  });

program.parse();
