---
name: task-workflow-overview
description: Entry point. Routes queries to task_* tools and actions to skills.
---

# Working with Tasks

This repo uses the task-workflow: a planning tree under `docs/tasks/` of
epics, tasks, and slices. No external issue tracker — everything in git.

## Read-only queries

| Question | Tool |
|---|---|
| "Is this task ready?" | `task_finalizable <slug>` |
| "What's left on task X?" | `task_slices <slug>` |
| "List tasks / epics" | `task_list` |
| "Show artifact X" | `task_show <slug>` |
| "Where am I?" | `task_state` |

## Actions

| Action | Skill |
|---|---|
| New task or epic | `/skill:create-task` |
| Implement (parallel) | `/skill:implement-task` |
| Finalize / archive | `/skill:finalize-task` |
| Initialize repo | `/skill:onboard-workflow` |