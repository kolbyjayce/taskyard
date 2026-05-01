# taskyard

**Agent-first todo.** Markdown files and an MCP server.

Tasks live as `.md` files on disk. Agents (Claude Code, OpenClaw, or any MCP client) create, update, and organize them. The app is intentionally dumb: it stores and retrieves. The agent thinks.

See [AGENT_RULES.md](./AGENT_RULES.md) for how agents should interact with the MCP server.

---

## Install

```bash
npm install -g taskyard
```

## Start the MCP server

```bash
taskyard start
```

Task files default to `~/.taskyard/` on all platforms. Override with `--root`:

```bash
taskyard start --root /path/to/custom/dir
```

Point your MCP client at the binary — no arguments needed for the default location:

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

---

## File layout

```
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

## License

MIT
