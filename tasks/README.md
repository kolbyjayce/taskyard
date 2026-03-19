# Tasks Directory

This directory contains all tasks for the taskyard project. Tasks are automatically detected and managed by taskyard.

## Structure

```
tasks/
├── README.md              (this file)
├── examples/              (example tasks - safe to delete)
│   ├── example-feature.md
│   └── example-bugfix.md
├── features/              (new features)
├── bugs/                  (bug fixes)
└── maintenance/           (upkeep tasks)
```

## Creating Tasks

1. **Manual**: Create `.md` files in this directory
2. **Dashboard**: Use the web UI at `http://localhost:3456`
3. **Template**: Copy from `examples/` directory

## Task Lifecycle

1. **Created** → File appears in `tasks/`
2. **Claimed** → Agent calls `claim_task`
3. **In Progress** → Agent works and logs progress
4. **Complete** → Agent calls `complete_task`
5. **Reviewed** → Human approves and marks done

## Best Practices

- Use clear, descriptive filenames
- Include requirements and acceptance criteria
- Organize in subdirectories by type
- Reference specific files to modify
- Add context and background info

See `../TASK_GUIDE.md` for detailed instructions.