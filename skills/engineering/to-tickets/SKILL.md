---
name: to-tickets
description: "Break a plan, spec, or the current conversation into tracer-bullet feature/bug tasks with blocked_by edges under docs/tasks/, using the task_* tools for the graph."
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet
vertical slices, each declaring the tickets that **block** it.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes
a reference (a spec path, a map slug) as an argument, fetch it and read its
full body. If a spec exists at `docs/tasks/<slug>/spec.md`, read it.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current
state of the code. Ticket titles and descriptions should use the project's
domain glossary vocabulary (read `CONTEXT.md` if it exists), and respect ADRs
in the area you are touching.

Look for opportunities to prefactor the code to make the implementation easier.
"Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets. Each ticket becomes a task
document at `docs/tasks/<ticket-slug>/task.md` with our existing task
frontmatter:

```yaml
---
kind: task
type: feature  # or bug
slug: <ticket-slug>
title: <title>
map: <map-slug>
status: ready
blocked_by: [<other-ticket-slug>, ...]
slices: [<slice-slug>, ...]
---
```

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API,
  UI, tests): vertical, NOT a horizontal slice of one layer.
- A completed slice is demoable or verifiable on its own.
- Each slice is sized to fit in a single fresh context window.
- Any prefactoring should be done first.

</vertical-slice-rules>

Give each ticket its **blocking edges** via the `blocked_by` field. A ticket
with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor**
is one mechanical change (rename a column, retype a shared symbol) whose **blast
radius** fans across the whole codebase, so a single edit breaks thousands of
call sites at once and no vertical slice can land green. Don't force it into a
tracer bullet; sequence it as **expand-contract**. First expand: add the new
form beside the old so nothing breaks. Then migrate the call sites over in
batches sized by blast radius (per package, per directory), each batch its own
ticket blocked by the expand, keeping CI green batch to batch because the old
form still exists. Finally contract: delete the old form once no caller
remains, in a ticket blocked by every migrate batch. When even the batches
can't stay green alone, keep the sequence but let them share an integration
branch that all block a final integrate-and-verify ticket; green is promised
only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that
  genuinely gate it?
- Should any tickets be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the tickets under docs/tasks/

Write each approved ticket as `docs/tasks/<ticket-slug>/task.md` with the
task frontmatter above. Then:

1. Register each ticket in the map's `tasks` array (add a
   `{ slug, blocked_by, done: false }` entry to the map frontmatter).
2. Wire `blocked_by` edges in a **second pass** (all slugs must exist before
   they can reference each other).
3. The graph is now queryable via `task_dependency_levels <map-slug>` (BFS
   levels) and `task_frontier <map-slug>` (ready, unfinished tasks).

Work the **frontier**: any ticket whose blockers are all done. For a purely
linear chain that means top to bottom.

Do NOT close or modify any parent map.

<ticket-template>

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective,
not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)".

</ticket-template>

In either form, avoid specific file paths or code snippets: they go stale
fast. Exception: if a prototype produced a snippet that encodes a decision more
precisely than prose can (state machine, reducer, schema, type shape), inline
it and note briefly that it came from a prototype. Trim to the decision-rich
parts, not a working demo, just the important bits.
