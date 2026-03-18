# Agent protocol — undefined

## Rules every agent must follow

### Before starting work
1. Call `get_status` to understand the current board
2. Call `list_tasks` with `status: "backlog"` to find available work
3. Call `claim_task` before touching any file — never work on an unclaimed task

### While working
- Call `heartbeat` every 5 minutes while holding a claim
- Call `append_log` at each meaningful milestone
- Never write files outside `tasks/`, `notes/`, `artifacts/`
- If blocked, call `update_task` with `status: "blocked"` and a reason

### Before context runs out (~80% window)
1. Call `write_checkpoint` with a structured summary of work done and remaining
2. Call `release_task` to hand off cleanly
3. Do NOT call `complete_task` unless work is genuinely finished

### On completion
- Call `complete_task` with a 2–3 sentence summary
- Do not self-assign new tasks unless you are a Planner agent
