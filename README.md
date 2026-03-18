# taskyard 

**Agent-first project management.** Markdown files, git, and an MCP server.

Tasks live as `.md` files in your git repo. Agents coordinate through a local MCP server that handles locking, heartbeats, and handoffs. A web dashboard lets humans inspect and edit the board.

---

## Install

```bash
npx taskyard init
```

Run inside any git repo. Creates the folder structure, `AGENTS.md` protocol file, and MCP config. Idempotent — safe to re-run.

```bash
npx taskyard start        # MCP server + dashboard on localhost:3456
npx taskyard status       # print board to terminal
npx taskyard doctor       # check environment
```

---

## How it works

```
your-repo/
  AGENTS.md              ← agent protocol rules
  CHANGELOG.md           ← append-only activity log
  STATUS.md              ← board summary
  .taskyard/
    config.json          ← timeouts, port, project name
    mcp.json             ← paste into your AI client's MCP config

  projects/
    my-project/
      tasks/
        TASK-001.md      ← one file per task, YAML frontmatter + markdown body
        TASK-001.lock    ← ephemeral; created on claim, deleted on complete
        TASK-002/
          HANDOFF.md     ← written by agent before releasing at context limit
```

Each task file looks like this:

```markdown
---
id: TASK-001
title: "Implement auth middleware"
status: in-progress
priority: high
assigned_to: coder-agent-1
claimed_at: 2025-03-17T14:22:00Z
last_heartbeat: 2025-03-17T15:40:00Z
attempt_count: 1
recovery_strategy: resume
---

## Objective
...

## Acceptance criteria
- [ ] Token validation passes all unit tests

## Agent log
<!-- appended by the MCP server -->
```

---

## Connecting agents

Add the generated `.taskyard/mcp.json` config to your AI client:

**Cursor / Windsurf / Cline** — paste the `mcpServers` block into your MCP settings

**Custom agent** — point your MCP client at:
```
npx @taskyard/mcp-server --root /path/to/your/repo
```

---

## MCP tools (what agents see)

| Tool | Description |
|---|---|
| `list_tasks` | List tasks, filter by status/priority |
| `read_task` | Full task content including agent log |
| `claim_task` | Atomically claim a task (fails if taken) |
| `heartbeat` | Keep claim alive (call every 5 min) |
| `append_log` | Write a milestone entry to the task |
| `write_checkpoint` | Write HANDOFF.md before releasing |
| `release_task` | Gracefully hand off (context limit) |
| `complete_task` | Mark done, release lock, commit |
| `create_task` | Add a new task to the backlog |
| `get_status` | Board summary + stalled task list |
| `git_commit` | Commit with agent attribution |
| `git_sync` | Pull + push (multi-machine teams) |

---

## Agent protocol

Agents receive `AGENTS.md` as part of their context. The core rules:

1. Call `get_status` → understand current state
2. Call `list_tasks` with `status: "backlog"` → find work
3. Call `claim_task` → never work on unclaimed tasks
4. Call `heartbeat` every 5 minutes while working
5. At ~80% context window: `write_checkpoint` → `release_task`
6. On completion: `complete_task` with a short summary

---

## Failure recovery

| Failure | Detection | Recovery |
|---|---|---|
| Agent hits token limit | Agent self-reports via `write_checkpoint` + `release_task` | Task re-enters pool with `needs_handoff: true`; next agent reads `HANDOFF.md` |
| Agent crashes | Heartbeat expires (watchdog checks every 10 min) | Lock released, task requeued to backlog |
| Agent stalls | No `append_log` for 30 min | Flagged in dashboard; human or supervisor decides |
| Repeated failures | `attempt_count` ≥ 3 | Task set to `blocked`, escalated for human review |

---

## Configuration

`.taskyard/config.json`:

```json
{
  "project": "my-project",
  "heartbeat_interval_seconds": 300,
  "lock_timeout_seconds": 600,
  "stall_threshold_seconds": 1800,
  "max_attempts_before_escalation": 3,
  "dashboard_port": 3456
}
```

---

## Development

```bash
git clone https://github.com/you/taskyard
cd taskyard
npm install         # installs all workspaces
npm run build       # builds all packages
npm test            # vitest
npm run dev         # watch mode + dashboard dev server
```

**Packages:**
- `packages/cli` — published as `taskyard` on npm (`npx taskyard`)
- `packages/mcp-server` — published as `@taskyard/mcp-server`
- `packages/dashboard` — React + Vite, served by the MCP server in production

---

## License

MIT
