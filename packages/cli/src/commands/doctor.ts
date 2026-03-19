import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { createCLILogger } from "../logger.js";
import { createDaemonManager } from "../daemon.js";

interface DoctorOptions {
  fix?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}) {
  const root = process.cwd();
  const logger = createCLILogger("doctor", root);
  const daemon = createDaemonManager(root);

  console.log(`\n${chalk.bold("taskyard doctor")}\n`);

  const checks: Array<{
    label: string;
    check: () => Promise<{ ok: boolean; detail: string; fixable?: boolean }>;
    fix?: () => Promise<void>;
  }> = [
    {
      label: "Node.js version",
      check: async () => {
        const [major] = process.versions.node.split(".").map(Number);
        return {
          ok: major >= 20,
          detail: `v${process.versions.node} ${major < 20 ? "(need ≥20)" : ""}`,
        };
      },
    },
    {
      label: "Git available",
      check: async () => {
        try {
          const v = execSync("git --version", { encoding: "utf-8" }).trim();
          return { ok: true, detail: v };
        } catch {
          return { ok: false, detail: "git not found in PATH" };
        }
      },
    },
    {
      label: "Git repo",
      check: async () => {
        try {
          execSync("git rev-parse --is-inside-work-tree", { encoding: "utf-8", stdio: "pipe" });
          return { ok: true, detail: "current directory is a git repo" };
        } catch {
          return { ok: false, detail: "not inside a git repo — run: git init" };
        }
      },
    },
    {
      label: "taskyard config",
      check: async () => {
        const configPath = path.join(process.cwd(), ".taskyard/config.json");
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        return {
          ok: exists,
          detail: exists ? configPath : "not found — run: npx taskyard init",
        };
      },
    },
    {
      label: "Daemon status",
      check: async () => {
        const status = await daemon.status();
        if (status.running && status.info) {
          return {
            ok: true,
            detail: `running (PID ${status.info.pid}, uptime: ${status.uptime})`
          };
        } else {
          return {
            ok: false,
            detail: "not running",
            fixable: true
          };
        }
      },
      fix: async () => {
        logger.info("Starting daemon");
        await daemon.start({ port: 3456, dashboard: true, logLevel: 1 }); // LogLevel.INFO
      },
    },
    {
      label: "MCP server HTTP API",
      check: async () => {
        try {
          const res = await fetch("http://localhost:3456/api/projects", {
            signal: AbortSignal.timeout(2000)
          });
          if (res.ok) {
            const data = await res.json();
            return {
              ok: true,
              detail: `accessible (${Array.isArray(data) ? data.length : 0} projects)`
            };
          } else {
            return { ok: false, detail: `HTTP ${res.status}` };
          }
        } catch (error) {
          return {
            ok: false,
            detail: `not accessible: ${error instanceof Error ? error.message : String(error)}`,
            fixable: true
          };
        }
      },
      fix: async () => {
        const status = await daemon.status();
        if (!status.running) {
          logger.info("Starting daemon to enable HTTP API");
          await daemon.start({ port: 3456, dashboard: true, logLevel: 1 });
        }
      },
    },
    {
      label: "Task storage integrity",
      check: async () => {
        try {
          const tasksDir = path.join(root, "tasks");
          const exists = await fs.access(tasksDir).then(() => true).catch(() => false);
          if (!exists) {
            return { ok: false, detail: "tasks directory missing", fixable: true };
          }

          // Count task files
          const files = await fs.readdir(tasksDir);
          const taskFiles = files.filter(f => f.endsWith('.md'));
          return {
            ok: true,
            detail: `${taskFiles.length} task files found`
          };
        } catch (error) {
          return {
            ok: false,
            detail: `storage error: ${String(error)}`,
            fixable: true
          };
        }
      },
      fix: async () => {
        logger.info("Creating tasks directory");
        await fs.mkdir(path.join(root, "tasks"), { recursive: true });
      },
    },
    {
      label: "Log files writable",
      check: async () => {
        try {
          const logDir = path.join(root, ".taskyard/logs");
          await fs.mkdir(logDir, { recursive: true });
          const testFile = path.join(logDir, "test.tmp");
          await fs.writeFile(testFile, "test");
          await fs.unlink(testFile);
          return { ok: true, detail: "log directory writable" };
        } catch (error) {
          return {
            ok: false,
            detail: `log directory not writable: ${String(error)}`,
            fixable: true
          };
        }
      },
      fix: async () => {
        logger.info("Creating log directory");
        await fs.mkdir(path.join(root, ".taskyard/logs"), { recursive: true });
      },
    },
    {
      label: "AGENTS.md",
      check: async () => {
        const exists = await fs.access(path.join(process.cwd(), "AGENTS.md")).then(() => true).catch(() => false);
        return {
          ok: exists,
          detail: exists ? "found" : "missing — run: npx taskyard init",
        };
      },
    },
  ];

  let allOk = true;
  const fixableIssues: Array<{ label: string; fix: () => Promise<void> }> = [];

  for (const { label, check, fix } of checks) {
    const result = await check();
    const icon = result.ok ? chalk.green("✓") : chalk.red("✗");
    const detailStr = result.ok ? chalk.dim(result.detail) : chalk.red(result.detail);
    console.log(`  ${icon}  ${label.padEnd(24)} ${detailStr}`);

    if (!result.ok) {
      allOk = false;
      if (result.fixable && fix) {
        fixableIssues.push({ label, fix });
      }
    }
  }

  console.log();

  if (allOk) {
    console.log(chalk.green("  ✓ Everything looks good!\n"));

    // Show performance stats if everything is running
    try {
      const res = await fetch("http://localhost:3456/api/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_status", args: { project: "default" } }),
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const status = await res.json();
        console.log(chalk.bold("  📊 Project Status:"));
        if (status.counts) {
          Object.entries(status.counts).forEach(([status, count]) => {
            console.log(chalk.dim(`    ${status}: ${count}`));
          });
        }
        console.log();
      }
    } catch {
      // Ignore status fetch errors
    }
  } else if (fixableIssues.length > 0 && options.fix) {
    console.log(chalk.yellow(`  🔧 Attempting to fix ${fixableIssues.length} issues...\n`));

    for (const { label, fix } of fixableIssues) {
      try {
        console.log(chalk.dim(`  Fixing: ${label}...`));
        await fix();
        console.log(chalk.green(`  ✓ Fixed: ${label}`));
      } catch (error) {
        console.log(chalk.red(`  ✗ Failed to fix: ${label} - ${String(error)}`));
        logger.error("Fix failed", { label, error: String(error) });
      }
    }

    console.log(chalk.green("\n  🎉 Fixes applied! Run 'npx taskyard doctor' again to verify.\n"));
  } else {
    console.log(chalk.yellow("  ⚠️ Some checks failed."));

    if (fixableIssues.length > 0) {
      console.log(chalk.dim(`  💡 ${fixableIssues.length} issues can be fixed automatically.`));
      console.log(chalk.cyan("  Run: npx taskyard doctor --fix\n"));
    } else {
      console.log();
    }

    process.exit(1);
  }
}
