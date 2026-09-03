---
name: onboard-workflow
description: Initialize a repository for the task-workflow. Creates docs/tasks/, docs/bugs/, state.yaml, CHANGELOG.md, docs/testing.md, and docs/dev-env.md.
---

# Onboard Workflow

## Steps

1. Check `task_workflow_gate` (bash: `test -d docs/tasks/`). If it exists, stop, already initialized.

2. Create directory structure:
   ```
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/maps/archive
   mkdir -p docs/bugs
   mkdir -p docs/bugs/archive
   ```
   Empty directories get a `.gitkeep`.

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

6. Write `docs/dev-env.md` with a template describing how to start the dev environment, how reproduction should work, or an explicit "do not attempt AI reproduction" placeholder. If `docs/dev-env.md` already exists, do not clobber it, leave the existing file in place.

7. Commit: `chore: initialize task-workflow`.

8. Report: "Ready. Run `/skill:wayfinder` to start with the mandatory grilling pass and grow a dependency-aware work graph, or `/skill:report-bug` to track a defect."

> **Feedback:** if onboarding hits a snag, a template that didn't fit the
> project, a gate that misfired, a step that fought back, or something that
> worked notably well, call `submit_feedback({ kind, data })` autonomously to
> record it. `kind` is a short category (`good`, `bad`, `friction`,
> `architecture`); `data` is one or two specific, actionable sentences about
> the *workflow*, not the project. Requires the `pi-telemetry` extension
> (`submit_feedback` tool).