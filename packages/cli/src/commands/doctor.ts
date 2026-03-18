import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

export async function doctorCommand() {
  console.log(`\n${chalk.bold("crewboard doctor")}\n`);

  const checks: Array<{ label: string; check: () => Promise<{ ok: boolean; detail: string }> }> = [
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
      label: "crewboard config",
      check: async () => {
        const configPath = path.join(process.cwd(), ".crewboard/config.json");
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        return {
          ok: exists,
          detail: exists ? configPath : "not found — run: npx crewboard init",
        };
      },
    },
    {
      label: "MCP server reachable",
      check: async () => {
        try {
          const res = await fetch("http://localhost:3456/api/projects", { signal: AbortSignal.timeout(1000) });
          return { ok: res.ok, detail: res.ok ? "http://localhost:3456" : `HTTP ${res.status}` };
        } catch {
          return { ok: false, detail: "not running — start with: npx crewboard start" };
        }
      },
    },
    {
      label: "AGENTS.md",
      check: async () => {
        const exists = await fs.access(path.join(process.cwd(), "AGENTS.md")).then(() => true).catch(() => false);
        return {
          ok: exists,
          detail: exists ? "found" : "missing — run: npx crewboard init",
        };
      },
    },
  ];

  let allOk = true;
  for (const { label, check } of checks) {
    const { ok, detail } = await check();
    const icon = ok ? chalk.green("✓") : chalk.red("✗");
    const detailStr = ok ? chalk.dim(detail) : chalk.red(detail);
    console.log(`  ${icon}  ${label.padEnd(24)} ${detailStr}`);
    if (!ok) allOk = false;
  }

  console.log();
  if (allOk) {
    console.log(chalk.green("  Everything looks good.\n"));
  } else {
    console.log(chalk.yellow("  Some checks failed. See above.\n"));
    process.exit(1);
  }
}
