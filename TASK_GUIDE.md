# Task Creation Guide — taskyard

## How to Create Tasks

Taskyard automatically detects and manages tasks placed in the `tasks/` directory. There are several ways to create tasks:

### 1. Create Task Files Manually

Drop or create markdown files in the `tasks/` directory:

```bash
tasks/
├── implement-user-auth.md
├── fix-login-bug.md
└── refactor-api-endpoints.md
```

### 2. Use the Dashboard

1. Start taskyard: `npx taskyard start`
2. Open dashboard: `http://localhost:3456`
3. Click the + button to create new tasks
4. Drag and drop tasks between columns

### 3. Agent-Friendly Task Format

For best results with AI agents, structure tasks like this:

```markdown
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
- `src/components/Login.tsx`
- `src/auth/index.ts`
```

### 4. Task States

Tasks automatically move through these states:
- **backlog** — Available for agents to claim
- **in-progress** — Being worked on
- **review** — Completed, awaiting review
- **blocked** — Stuck, needs attention
- **done** — Completed and approved

### 5. Task Organization

Organize tasks using subdirectories:

```bash
tasks/
├── features/
│   ├── user-authentication.md
│   └── payment-integration.md
├── bugs/
│   ├── login-error.md
│   └── mobile-layout.md
└── maintenance/
    ├── update-dependencies.md
    └── optimize-performance.md
```

## Agent Commands

Tell agents to work on tasks:

- **"go look for tasks"** — Agent scans backlog and picks work
- **"work on the login bug"** — Agent finds and claims specific task
- **"check task status"** — View current board state

## Files Created

When working on tasks, agents create files in:
- `notes/` — Research, planning, meeting notes
- `artifacts/` — Generated code, configs, documentation
- `projects/` — Completed project outputs

See `AGENTS.md` for detailed agent protocols and `tasks/examples/` for example tasks.