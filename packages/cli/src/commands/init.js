import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { simpleGit } from "simple-git";
const SCAFFOLD = {
    "AGENTS.md": agentsTemplate,
    "STATUS.md": statusTemplate,
    "CHANGELOG.md": changelogTemplate,
    ".taskyard/config.json": configTemplate,
    "projects/.gitkeep": "",
};
export async function initCommand(options) {
    const root = path.resolve(options.dir);
    const spinner = ora("Checking environment...").start();
    // 1. Verify or initialize git repo
    const git = simpleGit(root);
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
        spinner.stop();
        const { confirm } = await prompts({
            type: "confirm",
            name: "confirm",
            message: "No git repo found. Initialize one here?",
            initial: true,
        });
        if (!confirm)
            process.exit(0);
        await git.init();
        spinner.start();
    }
    // 2. Check for existing taskyard config (idempotent)
    const configPath = path.join(root, ".taskyard/config.json");
    const exists = await fs.access(configPath).then(() => true).catch(() => false);
    if (exists && !options.force) {
        spinner.warn(chalk.yellow("taskyard already initialized. Use --force to reinitialize."));
        return;
    }
    // 3. Ask project name
    spinner.stop();
    const { projectName } = await prompts({
        type: "text",
        name: "projectName",
        message: "Project name?",
        initial: path.basename(root),
    });
    spinner.start("Scaffolding...");
    // 4. Write scaffold files
    for (const [relPath, templateFn] of Object.entries(SCAFFOLD)) {
        const fullPath = path.join(root, relPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        const content = typeof templateFn === "function"
            ? templateFn(projectName)
            : templateFn;
        await fs.writeFile(fullPath, content, { flag: options.force ? "w" : "wx" }).catch(() => { });
    }
    // 5. Write MCP config for Claude Desktop / Cursor / other hosts
    await writeMcpConfig(root);
    // 6. Initial commit
    await git.add(".").catch(() => { });
    await git.commit("chore: initialize taskyard").catch(() => { });
    spinner.succeed(chalk.green("taskyard initialized!"));
    console.log(`
  ${chalk.bold("Next steps:")}
    ${chalk.cyan("npx taskyard start")}   — start MCP server + dashboard
    ${chalk.cyan("npx taskyard status")}  — view current board

  ${chalk.bold("Add to your AI agent's MCP config:")}
    ${chalk.dim(path.join(root, ".taskyard/mcp.json"))}
  `);
}
async function writeMcpConfig(root) {
    const mcpConfig = {
        mcpServers: {
            taskyard: {
                command: "npx",
                args: ["@taskyard/mcp-server", "--root", root],
                env: {},
            },
        },
    };
    await fs.writeFile(path.join(root, ".taskyard/mcp.json"), JSON.stringify(mcpConfig, null, 2));
}
// ── Templates ────────────────────────────────────────────────────────────────
function agentsTemplate(project) {
    return `# Agent protocol — ${project}

## Rules every agent must follow

### Before starting work
1. Call \`get_status\` to understand the current board
2. Call \`list_tasks\` with \`status: "backlog"\` to find available work
3. Call \`claim_task\` before touching any file — never work on an unclaimed task

### While working
- Call \`heartbeat\` every 5 minutes while holding a claim
- Call \`append_log\` at each meaningful milestone
- Never write files outside \`tasks/\`, \`notes/\`, \`artifacts/\`
- If blocked, call \`update_task\` with \`status: "blocked"\` and a reason

### Before context runs out (~80% window)
1. Call \`write_checkpoint\` with a structured summary of work done and remaining
2. Call \`release_task\` to hand off cleanly
3. Do NOT call \`complete_task\` unless work is genuinely finished

### On completion
- Call \`complete_task\` with a 2–3 sentence summary
- Do not self-assign new tasks unless you are a Planner agent
`;
}
function statusTemplate(project) {
    return `# Status — ${project}

_Auto-updated by taskyard. Do not edit manually._

| Status | Count |
|--------|-------|
| backlog | 0 |
| in-progress | 0 |
| review | 0 |
| done | 0 |
| blocked | 0 |

_Last updated: ${new Date().toISOString()}_
`;
}
function changelogTemplate(project) {
    return `# Changelog — ${project}

_Append-only. Written by the MCP server on every task state change._

---

${new Date().toISOString()} — taskyard initialized
`;
}
function configTemplate(project) {
    return JSON.stringify({
        project,
        version: "0.1.0",
        heartbeat_interval_seconds: 300,
        lock_timeout_seconds: 600,
        stall_threshold_seconds: 1800,
        max_attempts_before_escalation: 3,
        dashboard_port: 3456,
    }, null, 2);
}
//# sourceMappingURL=init.js.map