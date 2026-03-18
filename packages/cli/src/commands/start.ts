import { spawn } from "child_process";
import path from "path";
import chalk from "chalk";
import ora from "ora";

interface StartOptions {
  port: string;
  dashboard: boolean;
}

export async function startCommand(options: StartOptions) {
  const root = process.cwd();
  const port = parseInt(options.port, 10);

  // 1. Start MCP server (via the installed package)
  const spinner = ora("Starting MCP server...").start();

  const mcpServerPath = require.resolve("@taskyard/mcp-server");
  const mcp = spawn(
    process.execPath,
    [mcpServerPath, "--root", root, "--http-port", String(port)],
    { stdio: ["inherit", "inherit", "pipe"] }
  );

  mcp.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line.includes("MCP server running")) spinner.succeed(chalk.green(line));
    else if (line.includes("dashboard:")) {
      console.log(chalk.cyan(`  ${line}`));
    } else {
      process.stderr.write(data);
    }
  });

  mcp.on("exit", (code) => {
    if (code !== 0) {
      console.error(chalk.red(`MCP server exited with code ${code}`));
      process.exit(1);
    }
  });

  // 2. In dev mode, also spin up the Vite dashboard dev server
  if (options.dashboard && process.env.NODE_ENV === "development") {
    const dashboardRoot = path.resolve(__dirname, "../../dashboard");
    const vite = spawn("npm", ["run", "dev"], {
      cwd: dashboardRoot,
      stdio: "inherit",
      shell: true,
    });
    vite.on("exit", code => {
      if (code !== 0) console.error(chalk.red(`Dashboard exited with code ${code}`));
    });
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    mcp.kill("SIGTERM");
    process.exit(0);
  });
}
