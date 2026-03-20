import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { simpleGit } from "simple-git";
import { createCLILogger, LogLevel } from "../logger.js";

interface InitOptions {
  dir: string;
  force: boolean;
}

const SCAFFOLD = {
  "AGENTS.md": agentsTemplate,
  "STATUS.md": statusTemplate,
  "CHANGELOG.md": changelogTemplate,
  "TASK_GUIDE.md": taskGuideTemplate,
  ".taskyard/config.json": configTemplate,
  ".taskyard/tasks/README.md": tasksReadmeTemplate,
  ".taskyard/tasks/examples/example-feature.md": exampleTaskTemplate,
  ".taskyard/tasks/examples/example-bugfix.md": exampleBugfixTemplate,
  "notes/.gitkeep": "",
  "artifacts/.gitkeep": "",
  "projects/.gitkeep": "",
};

export async function initCommand(options: InitOptions) {
  const root = path.resolve(options.dir);
  const logger = createCLILogger("init", root, LogLevel.INFO);

  logger.info("Initializing taskyard", { root, force: options.force });
  const spinner = ora("Checking environment...").start();

  // Validate Node.js version
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) {
    spinner.fail(chalk.red("Node.js 20+ is required"));
    console.error(chalk.yellow(`Current version: ${process.versions.node}`));
    console.error(chalk.dim("Please update Node.js: https://nodejs.org/"));
    process.exit(1);
  }

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
    if (!confirm) process.exit(0);
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

  // 3. Interactive setup
  spinner.stop();

  console.log(chalk.bold("\n  📋 Taskyard Setup\n"));

  const { projectName, features } = await prompts([
    {
      type: "text",
      name: "projectName",
      message: "Project name?",
      initial: path.basename(root),
      validate: (value) => value.length > 0 || "Project name is required",
    },
    {
      type: "multiselect",
      name: "features",
      message: "Select features to enable:",
      choices: [
        { title: "Dashboard UI", value: "dashboard", selected: true },
        { title: "Auto-start on boot", value: "autostart", selected: false },
        { title: "Debug logging", value: "debug", selected: false },
        { title: "Git hooks", value: "githooks", selected: true },
      ],
      min: 0,
    },
  ]);

  if (!projectName) {
    console.log(chalk.yellow("Setup cancelled"));
    process.exit(0);
  }

  logger.info("Setup configuration", { projectName, features });
  spinner.start("Scaffolding...");

  // 4. Write scaffold files
  for (const [relPath, templateFn] of Object.entries(SCAFFOLD)) {
    const fullPath = path.join(root, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const content = typeof templateFn === "function"
      ? templateFn(projectName, features)
      : templateFn;
    await fs.writeFile(fullPath, content, { flag: options.force ? "w" : "wx" }).catch(() => {});
  }

  // 5. Write MCP config for Claude Desktop / Cursor / other hosts
  await writeMcpConfig(root);

  // 6. Setup additional features
  await setupFeatures(root, features, spinner, logger);

  // 7. Initial commit
  await git.add(".").catch(() => {});
  await git.commit("chore: initialize taskyard").catch(() => {});

  spinner.succeed(chalk.green("taskyard initialized!"));

  // Show customized next steps
  const dashboardEnabled = features?.includes("dashboard");
  const autostartEnabled = features?.includes("autostart");

  console.log(`
  ${chalk.bold("🚀 Setup complete!")}

  ${chalk.bold("Next steps:")}
    ${chalk.cyan("npx taskyard start")}${dashboardEnabled ? "" : " --no-dashboard"}   — start MCP server${dashboardEnabled ? " + dashboard" : ""}
    ${chalk.cyan("npx taskyard start --background")}        — run in background
    ${chalk.cyan("npx taskyard status")}                    — view current board

  ${dashboardEnabled ? chalk.bold("Dashboard will be available at:") + "\n    " + chalk.cyan("http://localhost:3456") + "\n" : ""}

  ${chalk.bold("📋 Task Management:")}
    Drop files in ${chalk.cyan(".taskyard/tasks/")} directory or use the dashboard
    See ${chalk.cyan("TASK_GUIDE.md")} for detailed instructions
    Example tasks created in ${chalk.cyan(".taskyard/tasks/examples/")}

  ${chalk.bold("🤖 For AI agents, add this MCP config:")}
    ${chalk.cyan("claude mcp add-json taskyard")} '{"type":"stdio","command":"npx","args":["@taskyard/mcp-server","--root","${root}"],"env":{}}'
    ${chalk.dim("Or manually edit: " + path.join(root, ".taskyard/mcp.json"))}

  ${autostartEnabled ? chalk.bold("Auto-start configuration:") + "\n    " + chalk.dim("Service files created in .taskyard/") + "\n" : ""}

  ${chalk.dim("Need help? Run:")} ${chalk.cyan("npx taskyard doctor")}
  `);
}

async function setupFeatures(
  root: string,
  features: string[] | undefined,
  spinner: any,
  logger: ReturnType<typeof createCLILogger>
) {
  if (!features) return;

  // Setup Git hooks
  if (features.includes("githooks")) {
    spinner.text = "Setting up git hooks...";
    await setupGitHooks(root);
    logger.info("Git hooks configured");
  }

  // Setup auto-start service files
  if (features.includes("autostart")) {
    spinner.text = "Setting up auto-start...";
    await setupAutostart(root);
    logger.info("Auto-start configured");
  }

  // Setup debug logging
  if (features.includes("debug")) {
    spinner.text = "Enabling debug logging...";
    const configPath = path.join(root, ".taskyard/config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    config.debug = true;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    logger.info("Debug logging enabled");
  }
}

async function setupGitHooks(root: string) {
  const hooksDir = path.join(root, ".git/hooks");

  // Pre-commit hook to update task status
  const preCommitHook = `#!/bin/sh
# Taskyard pre-commit hook
# Updates STATUS.md before each commit

if command -v npx > /dev/null; then
  npx taskyard status --quiet > STATUS.md 2>/dev/null || true
  git add STATUS.md 2>/dev/null || true
fi
`;

  await fs.writeFile(path.join(hooksDir, "pre-commit"), preCommitHook, { mode: 0o755 }).catch(() => {});
}

async function setupAutostart(root: string) {
  // Create systemd service file template
  const serviceName = `taskyard-${path.basename(root)}`;
  const serviceFile = `[Unit]
Description=Taskyard for ${path.basename(root)}
After=network.target

[Service]
Type=simple
User=%i
WorkingDirectory=${root}
ExecStart=${process.execPath} ${process.argv[1]} start --background
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
`;

  const serviceDir = path.join(root, ".taskyard/service");
  await fs.mkdir(serviceDir, { recursive: true });
  await fs.writeFile(path.join(serviceDir, `${serviceName}.service`), serviceFile);

  // Create installation script
  const installScript = `#!/bin/bash
# Install taskyard as a systemd user service
# Run: bash .taskyard/service/install.sh

SERVICE_NAME="${serviceName}"
SERVICE_FILE="$(pwd)/.taskyard/service/\${SERVICE_NAME}.service"
USER_SERVICE_DIR="$HOME/.local/share/systemd/user"

echo "Installing taskyard service..."

# Create user service directory
mkdir -p "\$USER_SERVICE_DIR"

# Copy service file
cp "\$SERVICE_FILE" "\$USER_SERVICE_DIR/"

# Enable and start service
systemctl --user daemon-reload
systemctl --user enable "\$SERVICE_NAME"
systemctl --user start "\$SERVICE_NAME"

echo "✓ Service installed and started"
echo "  Status: systemctl --user status \$SERVICE_NAME"
echo "  Logs:   journalctl --user -u \$SERVICE_NAME -f"
`;

  await fs.writeFile(path.join(serviceDir, "install.sh"), installScript, { mode: 0o755 });
}

async function writeMcpConfig(root: string) {
  const mcpConfig = {
    mcpServers: {
      taskyard: {
        command: "npx",
        args: ["@taskyard/mcp-server", "--root", root],
        env: {},
      },
    },
  };
  await fs.writeFile(
    path.join(root, ".taskyard/mcp.json"),
    JSON.stringify(mcpConfig, null, 2)
  );
}

// ── Templates ────────────────────────────────────────────────────────────────

function agentsTemplate(project: string, features?: string[]) {
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

function statusTemplate(project: string, features?: string[]) {
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

function changelogTemplate(project: string, features?: string[]) {
  return `# Changelog — ${project}

_Append-only. Written by the MCP server on every task state change._

---

${new Date().toISOString()} — taskyard initialized
`;
}

function configTemplate(project: string, features?: string[]) {
  const config: any = {
    project,
    version: "0.1.0",
    heartbeat_interval_seconds: 300,
    lock_timeout_seconds: 600,
    stall_threshold_seconds: 1800,
    max_attempts_before_escalation: 3,
    dashboard_port: 3456,
  };

  // Add debug flag if debug feature is enabled
  if (features?.includes("debug")) {
    config.debug = true;
  }

  return JSON.stringify(config, null, 2);
}

function taskGuideTemplate(project: string, features?: string[]) {
  return `# Task Creation Guide — ${project}

## How to Create Tasks

Taskyard automatically detects and manages tasks placed in the \`.taskyard/tasks/\` directory. There are several ways to create tasks:

### 1. Create Task Files Manually

Drop or create markdown files in the \`.taskyard/tasks/\` directory:

\`\`\`bash
.taskyard/tasks/
├── implement-user-auth.md
├── fix-login-bug.md
└── refactor-api-endpoints.md
\`\`\`

### 2. Use the Dashboard

1. Start taskyard: \`npx taskyard start\`
2. Open dashboard: \`http://localhost:3456\`
3. Click the + button to create new tasks
4. Drag and drop tasks between columns

### 3. Agent-Friendly Task Format

For best results with AI agents, structure tasks like this:

\`\`\`markdown
# Task Title

## Description
Clear description of what needs to be done.

## Requirements
- Specific requirement 1
- Specific requirement 2
- Acceptance criteria

## Context
Any additional context, links, or background information.

## Files to Modify
- \`src/components/Login.tsx\`
- \`src/auth/index.ts\`
\`\`\`

### 4. Task States

Tasks automatically move through these states:
- **backlog** — Available for agents to claim
- **in-progress** — Being worked on
- **review** — Completed, awaiting review
- **blocked** — Stuck, needs attention
- **done** — Completed and approved

### 5. Task Organization

Organize tasks using subdirectories:

\`\`\`bash
.taskyard/tasks/
├── features/
│   ├── user-authentication.md
│   └── payment-integration.md
├── bugs/
│   ├── login-error.md
│   └── mobile-layout.md
└── maintenance/
    ├── update-dependencies.md
    └── optimize-performance.md
\`\`\`

## Agent Commands

Tell agents to work on tasks:

- **"go look for tasks"** — Agent scans backlog and picks work
- **"work on the login bug"** — Agent finds and claims specific task
- **"check task status"** — View current board state

## Files Created

When working on tasks, agents create files in:
- \`notes/\` — Research, planning, meeting notes
- \`artifacts/\` — Generated code, configs, documentation
- \`projects/\` — Completed project outputs

See \`AGENTS.md\` for detailed agent protocols and \`tasks/examples/\` for example tasks.
`;
}

function tasksReadmeTemplate(project: string, features?: string[]) {
  return `# Tasks Directory

This directory contains all tasks for the ${project} project. Tasks are automatically detected and managed by taskyard.

## Structure

\`\`\`
.taskyard/tasks/
├── README.md              (this file)
├── examples/              (example tasks - safe to delete)
│   ├── example-feature.md
│   └── example-bugfix.md
├── features/              (new features)
├── bugs/                  (bug fixes)
└── maintenance/           (upkeep tasks)
\`\`\`

## Creating Tasks

1. **Manual**: Create \`.md\` files in this directory
2. **Dashboard**: Use the web UI at \`http://localhost:3456\`
3. **Template**: Copy from \`examples/\` directory

## Task Lifecycle

1. **Created** → File appears in \`.taskyard/tasks/\`
2. **Claimed** → Agent calls \`claim_task\`
3. **In Progress** → Agent works and logs progress
4. **Complete** → Agent calls \`complete_task\`
5. **Reviewed** → Human approves and marks done

## Best Practices

- Use clear, descriptive filenames
- Include requirements and acceptance criteria
- Organize in subdirectories by type
- Reference specific files to modify
- Add context and background info

See \`../TASK_GUIDE.md\` for detailed instructions.
`;
}

function exampleTaskTemplate(project: string, features?: string[]) {
  return `# Add Dark Mode Toggle

## Description
Implement a dark mode toggle in the application header that allows users to switch between light and dark themes.

## Requirements
- [ ] Add toggle button in the main navigation header
- [ ] Persist theme preference in localStorage
- [ ] Apply theme consistently across all components
- [ ] Include smooth transitions between themes
- [ ] Support system preference detection

## Acceptance Criteria
- Toggle button is visually appealing and accessible
- Theme persists across browser sessions
- All text and UI elements are readable in both modes
- Transitions are smooth (≤300ms)
- System theme is detected on first visit

## Context
Users have requested dark mode support for better accessibility and reduced eye strain during extended use.

## Files to Modify
- \`src/components/Header.tsx\`
- \`src/hooks/useTheme.ts\`
- \`src/styles/themes.css\`
- \`src/context/ThemeProvider.tsx\`

## Design Notes
- Use CSS custom properties for theme variables
- Follow existing color palette conventions
- Ensure WCAG contrast compliance
- Match design system patterns

## Priority
Medium - Nice to have feature that improves user experience
`;
}

function exampleBugfixTemplate(project: string, features?: string[]) {
  return `# Fix Login Form Validation Error

## Description
Login form shows "Invalid credentials" error even when credentials are correct on the first attempt. Works on second attempt.

## Bug Report
**Steps to reproduce:**
1. Navigate to login page
2. Enter valid username and password
3. Click submit button
4. Error appears despite correct credentials
5. Submit again with same credentials → succeeds

**Expected:** Login succeeds on first attempt with valid credentials
**Actual:** Login fails first time, succeeds second time

## Investigation Notes
- Issue appears to be related to form state management
- May be timing issue with validation
- Only affects first login attempt in a session
- No console errors visible

## Files to Investigate
- \`src/components/LoginForm.tsx\`
- \`src/hooks/useAuth.ts\`
- \`src/api/auth.ts\`
- \`src/validation/authSchema.ts\`

## Reproduction Environment
- Browser: Chrome 120+, Firefox 115+
- Device: Desktop and mobile
- Frequency: 100% reproducible
- Impact: All users affected

## Priority
High - Affects core user functionality and creates friction

## Related Issues
- Check for similar form validation problems
- Review error handling patterns
- Verify API response timing
`;
}
