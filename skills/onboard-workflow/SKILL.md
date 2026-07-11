---
name: onboard-workflow
description: >
  Initialize a repository for task-workflow. Creates docs/tasks/ directory
  structure, state.yaml, and CHANGELOG.md. Use on a fresh repo that has never
  used prd-workflow or task-workflow before. For repos migrating from the old
  prd-workflow, use /skill:migrate-workflow instead.
---

# Onboard Workflow — Initialize a fresh repo

## Steps

1. **Check gate.** Run `task_workflow_gate`. If `docs/tasks/` already exists,
   stop and report:
   "This repo is already initialized. If you need to migrate from the old
   prd-workflow (docs/prd/), use `/skill:migrate-workflow`."

2. **Create directory structure:**
   ```bash
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/epics/archive
   ```

3. **Create `docs/tasks/state.yaml`:**
   ```yaml
   active:
     task: null
     slice: null
     epic: null
   last_action: onboard-workflow initialized repo
   next_action: create-task
   ```

4. **Create `docs/tasks/CHANGELOG.md`:**
   ```markdown
   # Task Changelog
   ```

5. **Commit:** `chore: initialize task-workflow`.

6. **Report:** "Ready. Run `/skill:create-task` to start your first task."

**Handoff:** → `create-task`