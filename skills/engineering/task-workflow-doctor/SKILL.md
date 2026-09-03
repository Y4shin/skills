---
name: task-workflow-doctor
description: Diagnose a broken task workflow and route to the right skill. Use when the workflow is broken, tasks are not showing, the doctor is needed, CONTEXT.md is missing, docs/bugs is missing, or bugs cannot be created.
---

# /task-workflow-doctor, Task Workflow Doctor

The doctor **diagnoses** a reported task-workflow symptom, checks for the common missing directories and files, and **routes** you to the right skill or manual step. It is not a fixer.

## Purpose

When something feels wrong with the task workflow, tasks are not showing up, a required file is missing, or a skill command fails, this skill inspects the repository for the most common causes and tells you exactly which skill to run or which file to create.

> The doctor diagnoses and routes; it does not fix. Run the routed skill to fix.

## Process

1. Ask the user for the symptom, or read the symptom they already reported.
2. Check each common-issue resource below for the missing or misconfigured artifact.
3. Report the diagnosis: which artifact is missing/misconfigured and which skill or command to run next.

## Symptom → missing artifact → route

| Symptom | Missing / misconfigured artifact | Route |
|---|---|---|
| Tasks are not showing up; `docs/tasks/` is empty or missing | `docs/tasks/` tree | `/skill:onboard-workflow` (see [resources/missing-tasks-tree.md](resources/missing-tasks-tree.md)) |
| Task state is lost or not tracked | `docs/tasks/state.yaml` | `/skill:onboard-workflow` (see [resources/missing-state-yaml.md](resources/missing-state-yaml.md)) |
| Cannot create or archive bugs | `docs/bugs/` and `docs/bugs/archive/` | `/skill:onboard-workflow` (see [resources/missing-bugs-dirs.md](resources/missing-bugs-dirs.md)) |
| Dev environment setup is undocumented | `docs/dev-env.md` | `/skill:onboard-workflow` (see [resources/missing-dev-env.md](resources/missing-dev-env.md)) |
| Testing conventions are undocumented | `docs/testing.md` | `/skill:onboard-workflow` (see [resources/missing-testing-md.md](resources/missing-testing-md.md)) |
| CONTEXT.md is missing | repo-root `CONTEXT.md` | Manual step until adopted (see [resources/missing-context-md.md](resources/missing-context-md.md)) |
| ADR directory is missing | `docs/adr/` | Manual step until adopted (see [resources/missing-adr-dir.md](resources/missing-adr-dir.md)) |
| Skills or subagents are not registered | `package.json` `pi.skills` / `pi.subagents` | Manual fix (see [resources/manifest-misconfigured.md](resources/manifest-misconfigured.md)) |

## Routing notes

- For every issue that involves the core task/bug directory tree, state file, or standard docs, run `/skill:onboard-workflow`. Do not duplicate its setup logic.
- For `CONTEXT.md` and `docs/adr/`, the relevant skill creates them lazily when adopted. Until then, create them manually or adopt the relevant skill.
- For manifest misconfiguration, edit `package.json` directly and consult the manifest documentation.
