# taskyard

**Agent-first todo.** Markdown files and an MCP server.

Tasks live as `.md` files on disk. Agents (Claude Code, OpenClaw, or any MCP client) create, update, and organize them. The app is intentionally dumb: it stores and retrieves. The agent thinks.

See [AGENT_RULES.md](./AGENT_RULES.md) for how agents should interact with the MCP server.

---

## Install

```bash
npm install -g taskyard
```

---

## Start the MCP server

```bash
taskyard start
```

Task files default to `~/.taskyard/` on all platforms. Override with `--root`:

```bash
taskyard start --root /path/to/custom/dir
```

### HTTP transport

```bash
taskyard start --transport http --port 3000
```

Set `TASKYARD_AUTH_TOKEN` to require a bearer token; if unset, the server is publicly accessible on that port.

---

## Install as an MCP server

Point your MCP client at the binary. No arguments are needed for the default task directory:

```json
{
  "mcpServers": {
    "taskyard": {
      "command": "taskyard",
      "args": ["start"]
    }
  }
}
```

With a custom root:

```json
{
  "mcpServers": {
    "taskyard": {
      "command": "taskyard",
      "args": ["start", "--root", "/path/to/tasks"]
    }
  }
}
```

---

## Dashboard

The dashboard is a local web UI for viewing and editing tasks. It ships bundled with the CLI — no separate install needed.

```bash
taskyard dashboard
```

This starts a server at `http://localhost:4567` and opens your browser automatically. To suppress the browser open:

```bash
taskyard dashboard --no-open
```

Use a custom port or task directory:

```bash
taskyard dashboard --port 8080 --root /path/to/tasks
```

The dashboard reads and writes the same markdown files used by the MCP server, so agents and the UI stay in sync automatically.

---

## File layout

```text
~/.taskyard/
  tasks/
    TASK-001.md      ← default project
    TASK-002.md
  projects/
    <project-name>/
      tasks/
        TASK-001.md  ← named projects
```

Each task file is a markdown file with YAML frontmatter:

```markdown
---
id: TASK-001
title: Write the homepage copy
status: backlog
priority: high
tags: [marketing]
context: work
due_date: "2026-05-10"
created_by: agent
project: default
---

Any notes or detail here.
```

---

## MCP tools

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task with inferred priority, context, and due date |
| `list_tasks` | List tasks with optional filters (status, priority, context, tag) |
| `list_projects` | List or filter projects |
| `read_task` | Read the full body of a task |
| `update_task` | Update status, priority, due date, or other metadata |
| `move_task` | Change a task's project/context |
| `delete_task` | Delete a task |
| `get_status` | Count tasks by status — useful for daily briefings |

---

## Status values

- `backlog` — not started
- `in-progress` — actively being worked on
- `blocked` — waiting on something external
- `done` — complete (terminal)

---

## Development

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/kolbyjayce/taskyard.git
cd taskyard
npm install
```

**Run everything in development mode** (CLI API server + Vite dashboard dev server with HMR):

```bash
npm run dev
```

This starts:
- The dashboard API at `http://localhost:4567`
- The Vite dev server at `http://localhost:5173` (proxies `/api` to the API)

**Build for production:**

```bash
npm run build
```

This builds the dashboard UI first (Vite → `packages/cli/dist/dashboard-ui/`), then compiles the CLI with TypeScript.

**Run tests:**

```bash
npm test
```

---

## License

MIT
