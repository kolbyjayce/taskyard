#!/usr/bin/env node
import os from "os";
import path from "path";
import { program } from "commander";
import { startServer } from "./mcp-server/index.js";
import { startDashboardServer } from "./dashboard/server.js";

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
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      console.error(
        `Invalid port: "${port}". Use a number between 1 and 65535.`
      );
      process.exit(1);
    }

    const AUTH_TOKEN = process.env.TASKYARD_AUTH_TOKEN;

    if (!AUTH_TOKEN && transport === 'http') {
      console.warn(
        `HTTP auth is disabled. Server is publically accessible at port: ${parsedPort}`
      );
    }

    await startServer({ root, transport, port: parseInt(port, 10) });
  });

program
  .command("dashboard")
  .description("Start the web dashboard for viewing and editing tasks")
  .option("--root <path>", "root directory for task files", DEFAULT_ROOT)
  .option("--port <number>", "HTTP port for the dashboard", "4567")
  .option("--no-open", "do not automatically open the browser")
  .action(async ({ root, port, open }) => {
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      console.error(
        `Invalid port: "${port}". Use a number between 1 and 65535.`
      );
      process.exit(1);
    }

    const { url, close } = await startDashboardServer({ root, port: parsedPort });
    console.log(`Taskyard dashboard running at ${url}`);

    if (open) {
      const { exec } = await import("node:child_process");
      const cmd =
        process.platform === "darwin" ? `open ${url}` :
        process.platform === "win32"  ? `start ${url}` :
                                        `xdg-open ${url}`;
      exec(cmd, (err) => {
        if (err) console.warn("Could not open browser:", err.message);
      });
    }

    for (const sig of ["SIGINT", "SIGTERM"] as const) {
      process.on(sig, () => close().finally(() => process.exit(0)));
    }
  });

program.parseAsync();
