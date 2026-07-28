---
name: onboard-workflow
description: Initialize a repository for the task-workflow. Creates docs/tasks/ and docs/ideas/ directories, state.yaml, and CHANGELOG.md.
---

# Onboard Workflow

## Steps

1. Check `task_workflow_gate` (bash: `test -d docs/tasks/`). If it exists, stop — already initialized.

2. Create directory structure:
   ```
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/epics/archive
   mkdir -p docs/ideas
   ```

3. Write `docs/tasks/state.yaml`:
   ```yaml
   task: null
   slice: null
   ```

4. Write `docs/tasks/CHANGELOG.md`:
   ```markdown
   # Task Changelog
   ```

5. Write `docs/testing.md` with a template (framework, run commands, mock conventions).

6. Commit: `chore: initialize task-workflow`.

7. Report: "Ready. Run `/skill:refine-idea` to flesh out an idea, or `/skill:create-task` to plan a small, well-understood task directly."