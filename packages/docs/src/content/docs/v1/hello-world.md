---
title: Hello World
description: Your first steps with taskyard — install the CLI, start the server, and connect your agent.
order: 1
---

# Hello World

Welcome to **taskyard** — an agent-first task management system built entirely on markdown files and an MCP server. No database. No cloud sync. No accounts. Just files your agent can read and write.

## What is taskyard?

Taskyard is intentionally dumb: it stores and retrieves. Your agent thinks.

Tasks are plain `.md` files with YAML frontmatter. An MCP (Model Context Protocol) server exposes those files as tools that AI agents — Claude Code, OpenClaw, or any MCP-compatible client — can call directly.

```
~/.taskyard/
  tasks/
    TASK-001.md
    TASK-002.md
  projects/
    my-project/
      tasks/
        TASK-001.md
```

## Install

```bash
npm install -g taskyard
```

## Start the MCP server

```bash
taskyard start
```

Tasks default to `~/.taskyard/`. To use a custom directory:

```bash
taskyard start --root /path/to/tasks
```

## Connect your agent

Add taskyard to your MCP client config. For Claude Code, edit your `claude_desktop_config.json`:

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

Restart your client. Your agent now has access to all taskyard tools.

## Your first task

Ask your agent:

> "Create a task to review the homepage copy. High priority, due Friday."

Taskyard will create a file like this:

```markdown
---
id: TASK-001
title: Review the homepage copy
status: backlog
priority: high
due_date: "2026-05-08"
created_by: agent
project: default
---
```

That's it. You're up and running.

## What's next?

- Explore the available **MCP Tools** to see everything your agent can do
- Learn about **Projects** to organize tasks into named contexts
- Read about **Status values** and how to build agent workflows around them
