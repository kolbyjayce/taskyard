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
  .description("Start the MCP server")
  .option("--root <path>", "root directory for task files", DEFAULT_ROOT)
  .option(
    "--transport <type>",
    'transport to use: "stdio" or "http"',
    "stdio"
  )
  .option(
    "--port <number>",
    "HTTP port (only used with --transport http)",
    "3000"
  )
  .action(async ({ root, transport, port }) => {
    if (transport !== "stdio" && transport !== "http") {
      console.error(
        `Unknown transport: "${transport}". Use "stdio" or "http".`
      );
      process.exit(1);
    }
    await startServer({ root, transport, port: parseInt(port, 10) });
  });

program.parseAsync();
