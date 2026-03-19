import chalk from "chalk";
import { createDaemonManager } from "../daemon.js";

interface StatusOptions {
  project?: string;
  quiet?: boolean;
}

export async function statusCommand(options: StatusOptions) {
  const project = options.project ?? "default";
  const root = process.cwd();
  const daemon = createDaemonManager(root);

  // Check daemon status first (unless quiet)
  if (!options.quiet) {
    const daemonStatus = await daemon.status();

    console.log(`\n${chalk.bold("taskyard daemon")}`);
    if (daemonStatus.running && daemonStatus.info) {
      console.log(chalk.green(`  ✓ Running (PID ${daemonStatus.info.pid})`));
      console.log(chalk.dim(`    Uptime: ${daemonStatus.uptime}`));
      console.log(chalk.dim(`    Port: ${daemonStatus.info.port}`));
      console.log(chalk.dim(`    Dashboard: http://localhost:${daemonStatus.info.port}`));
    } else {
      console.log(chalk.red("  ✗ Not running"));
      console.log(chalk.dim("    Start with: npx taskyard start --background"));
    }

    console.log();
  }

  try {
    const res = await fetch(`http://localhost:3456/api/tool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "list_tasks", args: { project } }),
    });

    if (!res.ok) {
      console.error(chalk.red("Could not reach MCP server. Is it running? Try: npx taskyard start"));
      process.exit(1);
    }

    const tasks = await res.json();

    const byStatus: Record<string, typeof tasks> = {
      "backlog":      tasks.filter((t: any) => t.status === "backlog"),
      "in-progress":  tasks.filter((t: any) => t.status === "in-progress"),
      "review":       tasks.filter((t: any) => t.status === "review"),
      "blocked":      tasks.filter((t: any) => t.status === "blocked"),
      "done":         tasks.filter((t: any) => t.status === "done"),
    };

    if (!options.quiet) {
      console.log(`\n${chalk.bold(`taskyard — ${project}`)}\n`);
    }

    for (const [status, list] of Object.entries(byStatus)) {
      if (list.length === 0) continue;

      const label = {
        "backlog":      chalk.gray("BACKLOG"),
        "in-progress":  chalk.blue("IN PROGRESS"),
        "review":       chalk.yellow("REVIEW"),
        "blocked":      chalk.red("BLOCKED"),
        "done":         chalk.green("DONE"),
      }[status] ?? status.toUpperCase();

      console.log(`  ${label} (${list.length})`);

      for (const task of list) {
        const priority = {
          critical: chalk.red("●"),
          high:     chalk.yellow("●"),
          medium:   chalk.blue("●"),
          low:      chalk.gray("●"),
        }[task.priority as string] ?? "●";

        const agent = task.assigned_to
          ? chalk.dim(` ↳ ${task.assigned_to}`)
          : "";

        const handoff = task.needs_handoff ? chalk.yellow(" [HANDOFF]") : "";
        const attempts = task.attempt_count > 1 ? chalk.red(` ×${task.attempt_count}`) : "";

        console.log(`    ${priority} ${chalk.dim(task.id)}  ${task.title}${agent}${handoff}${attempts}`);
      }

      console.log();
    }

  } catch {
    console.error(chalk.red("Cannot connect to taskyard. Start it with: npx taskyard start"));
    process.exit(1);
  }
}
