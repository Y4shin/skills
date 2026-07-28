---
name: task-workflow-overview
description: Entry point. Routes queries to task_* tools and actions to skills.
---

# Working with Tasks

This repo uses the task-workflow: a planning tree under `docs/tasks/` of
epics, tasks, and slices. Ideas being fleshed out live under `docs/ideas/`.
No external issue tracker — everything in git.

## Read-only queries

| Question | Tool |
|---|---|
| "Is this task ready?" | `task_finalizable <slug>` |
| "What's left on task X?" | `task_slices <slug>` |
| "List tasks / epics" | `task_list` |
| "Show artifact X" | `task_show <slug>` |
| "Where am I?" | `task_state` |
| "Which ideas are ready?" | `grep -l "status: ready" docs/ideas/*.md` |

## Actions

| Action | Skill |
|---|---|
| Flesh out an idea ("grill me") | `/skill:refine-idea` |
| New task or epic | `/skill:create-task` |
| Implement (parallel) | `/skill:implement-task` |
| Finalize / archive | `/skill:finalize-task` |
| Initialize repo | `/skill:onboard-workflow` |