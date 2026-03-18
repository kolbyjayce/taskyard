import chalk from "chalk";

interface StatusOptions {
  project?: string;
}

export async function statusCommand(options: StatusOptions) {
  const project = options.project ?? "default";

  try {
    const res = await fetch(`http://localhost:3456/api/tool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "list_tasks", args: { project } }),
    });

    if (!res.ok) {
      console.error(chalk.red("Could not reach MCP server. Is it running? Try: npx crewboard start"));
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

    console.log(`\n${chalk.bold(`crewboard — ${project}`)}\n`);

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
    console.error(chalk.red("Cannot connect to crewboard. Start it with: npx crewboard start"));
    process.exit(1);
  }
}
