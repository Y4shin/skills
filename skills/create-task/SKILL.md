---
name: create-task
description: >
  Interview the user to produce a task doc committed to
  docs/tasks/<slug>/task.md, or an epic at docs/tasks/epics/<slug>/epic.md.
  Uses grill-me for the interview. Use when starting a new feature, capability,
  or multi-task outcome. Hands off to /skill:slice-task.
---

# Create Task (or Epic)

Phase 0: interview the user relentlessly, then crystallise into a committed spec.

## Prerequisites

`docs/tasks/` exists (run `onboard-workflow` or `migrate-workflow` first).

Check the planning tree first to avoid slug collisions:

**Use `task_list` to see existing artifacts.**

Load the project profile for context (architecture, orientation docs):

**Use `task_profile`.**

Load the artifact schema reference:

**Use `task_reference`.**

## Step 1 — Determine scope

Is this a single task (one feature or foundational piece) or an epic (multi-task outcome)?
- **Single task** → proceed with Step 2, producing a task
- **Epic** → skip to Step 5

## Step 2 — Grill (one question at a time)

Invoke `grill-me` with the interview agenda:

1. **Who** is the user and **what** outcome do they get? (user stories)
2. **End-to-end behaviour** or **API surface + first consumer**
3. **Layers / surfaces touched** — which parts of the system does this cut through?
4. **Boundaries** — what's explicitly out of scope; what must NOT change.
5. **Slice breakdown** — what are the independently-mergeable tracer bullets?

If a question is answerable from the code/docs, answer it yourself and move on.

## Step 3 — Write the task doc

Write to `docs/tasks/<slug>/task.md` (<slug> = 3–5 word kebab of the title):

```markdown
---
kind: task
title: <short human title>
slug: <kebab-slug>
epic: <epic-slug>        # OPTIONAL
slices: []
status: draft
started_at: <ISO now>
completed_at: null
---

# <title>

## Problem / why
## User stories / behaviour
## End-to-end behaviour
## Layers touched
## Out of scope
## Slice breakdown
## Open questions

## Implementation notes
```

Sanity-check with: `task_show <slug>` (it must parse and read `kind: task`).

## Step 4 — Initialize state

Write to `docs/tasks/state.yaml` via `task_state_set`:
- `task_state_set active.task <slug>`
- `task_state_set last_action create-task wrote task.md for <slug>`
- `task_state_set next_action slice-task <slug>`

If another task is already active, warn first: "Task `<old-slug>` is still
active. Overwrite?" Don't overwrite without confirmation.

Commit: `docs(task): add <slug> task`.

## Step 5 — (Epic branch) Plan and decompose

If this is an epic (multi-task outcome), write `docs/tasks/epics/<slug>/epic.md`:

```markdown
---
kind: epic
title: <short human title>
slug: <kebab-slug>
tasks: []
status: draft
started_at: <ISO now>
completed_at: null
---

# <title>
```

Break the epic into the **fewest coherent tasks** that each stand alone. Present
the decomposition: per child — slug, one-line scope, blocked_by. Quiz the user.
Once approved, set `status: tasks-planned`, fill `tasks:` list.

Then hand off each child task to `/skill:create-task` serially, seeding `epic: <epic-slug>`.

## Error handling

- If the project has no `docs/tasks/` directory, run `/skill:onboard-workflow` first.
- If the codebase holds orientation docs, read them before writing.

## Constraints

- **English**; **no speculative scope** — anything not justified goes to "Open questions".
- The artifact describes behaviour/surface, not file paths.
- An epic is optional sugar: if the outcome is genuinely one task, produce a task.

**Handoff:** "Ready for `/skill:slice-task <slug>`."