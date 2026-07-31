---
name: task-workflow-overview
description: Entry point. Routes queries to task_* tools and actions to skills.
---

# Working with Tasks

This repo uses the task-workflow: a dependency graph under `docs/tasks/` of
maps and executable tasks. Bugs live under `docs/bugs/`. No external issue tracker
— everything in git.
Wayfinder grows the graph; implement-task executes its ready frontier.

## Read-only queries

| Question | Tool |
|---|---|
| "Is this task ready?" | `task_finalizable <slug>` |
| "What's left on task X?" | `task_slices <slug>` for legacy tasks; `task_frontier <map>` for Wayfinder maps |
| "List tasks / maps" | `task_list` |
| "Show artifact X" | `task_show <slug>` |
| "Where am I?" | `task_state` |
| "What's in the bug triage queue?" | `grep -l "status: reported" docs/bugs/*.md` |

## Actions

| Action | Skill |
|---|---|
| Plan an idea or grow a task graph (mandatory initial grilling) | `/skill:wayfinder` |
| Report a bug | `/skill:report-bug` |
| Implement the ready frontier | `/skill:implement-task` |
| Finalize / archive | `/skill:finalize-task` |
| Initialize repo | `/skill:onboard-workflow` |