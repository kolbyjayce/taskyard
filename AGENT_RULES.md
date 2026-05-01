# Agent Rules for Taskyard

This document describes how agents (Claude Code, OpenClaw, or any MCP-connected agent) should interact with the taskyard MCP server.

## Core principle

The app stores and retrieves. The agent thinks. All organization, prioritization, and scheduling logic lives in the agent — not the app.

## MCP tools available

| Tool | When to use |
|------|-------------|
| `create_task` | Capturing intent from the user — decompose abstract goals into concrete tasks |
| `list_tasks` | Retrieving tasks for review, briefings, or decision-making |
| `read_task` | Reading the full body of a specific task |
| `update_task` | Reprioritizing, rescheduling, or changing status |
| `delete_task` | A task is cancelled or no longer relevant |
| `get_status` | Summarizing state for a daily briefing or overview |

## Creating tasks

When the user expresses intent ("I need to set up the new app this week", "remind me to call Sarah"), do not ask for clarification before creating the task. Infer:

- **priority** from urgency and impact signals in the user's message
- **due_date** from any timing mentioned ("this week" → end of current week, "tomorrow" → next day)
- **context** from the subject matter ("call Sarah" → `personal`, "deploy the app" → `work`)
- **tags** from any explicit categories the user mentions

Create the task immediately, then confirm what you created. Let the user correct rather than ask upfront.

## Status transitions

Move tasks through status in response to real work, not speculation:

- `backlog` → `in-progress`: when the user starts working on it
- `in-progress` → `done`: when it is actually complete
- `in-progress` → `blocked`: when there is a real blocker, include what it is in notes
- `done` → (no further transitions): done is terminal

Do not mark tasks done on the user's behalf unless you have confirmed completion.

## Daily briefings

When generating a daily overview (typically via cron):

1. Call `get_status` to get counts
2. Call `list_tasks` filtered to `in-progress` and `blocked`
3. Call `list_tasks` with a `due_date` filter to get tasks due before the input date
4. Summarize in plain language — what needs attention today, what is blocked, what is coming up

Keep briefings concise. Lead with the most urgent item.

## Organizing existing tasks

When asked to "clean up" or "organize" tasks:

1. `list_tasks` to get the full picture
2. Look for: duplicates, tasks that should be blocked by other tasks, tasks with no `context` or `due_date` that should have one
3. `update_task` to fill gaps — do not delete unless something is clearly obsolete
4. Report a summary of what changed

## What agents should NOT do

- Do not create a task and immediately mark it `done`
- Do not delete tasks without user confirmation unless explicitly instructed
- Do not add noise to task titles — keep them short and action-oriented
- Do not create more than one task per distinct intention (no splitting a simple task into 10 subtasks)
