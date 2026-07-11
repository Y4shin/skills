---
name: slice-task
description: >
  Break a task into independently-grabbable vertical slices, write slice docs,
  and record slices in the task frontmatter. Calls size-slices for estimation.
  Use after create-task.
---

# Slice Task → Slices

Phase 1: convert a `kind: task` artifact into a set of tracked slices.

## Prerequisites

`task.md` exists with `status: draft`.

**Use `task_assert_kind <slug> task` to verify the artifact is a task.**

**Use `task_list` to check existing artifacts.**

**Use `task_profile` to load project context (architecture layers, test infrastructure).**

**Use `task_reference` to load the slice doc template.**

## Step 1 — Explore

Read the task doc at `docs/tasks/<slug>/task.md` in full. Explore the codebase
if needed.

## Step 2 — Draft vertical slices

Break the task into **tracer bullet** slices. Each cuts a narrow but COMPLETE
path through every relevant layer end-to-end. Each slice is:

- **HITL** (needs human interaction — a design/architecture decision) or
  **AFK** (implementable autonomously)
- Demonstrable / verifiable on its own
- As thin as possible

Prefer AFK where possible.

## Step 3 — Quiz the user

Present the breakdown: per slice — **Title**, **Type (HITL/AFK)**,
**Blocked by** (slugs of earlier slices), **Behaviour covered**.
Iterate until approved.

## Step 4 — Size the slices

Invoke `size-slices <task-slug>`. This iterates each slice, asks for t-shirt
size, and writes `size` to each slice doc's frontmatter.

## Step 5 — Write slice docs

For each slice, in dependency order, write
`docs/tasks/<task-slug>/slices/<n>-<slug>.md`:

```markdown
---
kind: slice
title: <short human title>
slug: <slice-slug>
task: ../task.md
mode: hitl | afk
analysed: false
status: todo
size: s | m | l | xl
blocked_by: [<slug>, ...]
started_at: null
completed_at: null
---

# Slice #<n> — <title>

## What to build
<end-to-end behaviour>

## Acceptance criteria
- [ ] …

## Blocked by
- <slug> — <reason>  |  None — can start immediately

## Test plan          ← appended by start-slice
```

## Step 6 — Update task

```bash
task_set_slices <task-slug> <slug-a> <slug-b> ...
task_set <task-slug> status slices-planned
```

## Step 7 — Update state

```bash
task_state_set last_action slice-task created <n> slices for <task-slug>
task_state_set next_action start-slice <first-slug>
```

Commit: `docs(task): slice <task-slug> into <n> slices`.

## Constraints

- **English**; **no speculative scope**.
- Slice ordering uses `blocked_by` slugs, not issue numbers.

**Handoff:** Report each slice with slug, mode, size, blocked_by.
"Next: `/skill:start-slice <first-slug>`."