---
name: finalize-task
description: >
  Close the loop once all of a task's slices are complete. Runs the full CI
  gate, harvests knowledge, summarizes to CHANGELOG, archives the task
  directory, and clears active state. If the task belongs to an epic and it's
  the last child, also finalize the epic.
---

# Finalize Task (or Epic)

Phase 3 — **the single integration point.** Every slice has merged into the
task branch `task/<task-slug>`.

## Prerequisites

All slices archived. `task.md` has `status: done` and `## Implementation notes`.

**Use `task_profile` for knowledge destinations and CI commands.**

**Use `task_list` to see the planning tree.**

**Use `task_reference` for the lifecycle reference.**

## Step 1 — Preconditions

Check out the task integration branch:

```bash
git checkout task/<task-slug>
git merge main 2>/dev/null || true
```

Resolve the task and gate:

```bash
task_finalizable <slug>
```

If `task_finalizable` reports open slices, list them and **stop**.

## Step 2 — CI gate (hard)

Run the project's full CI command (from `task_profile` or detected from repo
tooling). If it fails: **stop**. Fix forward. Do not proceed until green.

## Step 3 — Harvest

Read `task.md` in full, especially `## Implementation notes`. Review the branch
diff:

```bash
git log --oneline --no-merges main..task/<task-slug>
```

## Step 4 — Fold into permanent docs

Migrate durable knowledge into the project's permanent design docs, decision
log, or changelog (from `task_profile` "Knowledge destinations").

**Pay special attention to `docs/testing.md`:** if this task introduced new
testing patterns, tools, conventions, or infrastructure lessons, update
`docs/testing.md` accordingly. This ensures the `design-test-strategy` skill
has accurate project context for future slices.

Commit onto the task branch.

## Step 5 — Summarize: dispatch task-summarizer subagent

Dispatch `task-summarizer` via:

```
subagent({
  agent: "task-summarizer",
  task: `Summarize task <task-slug> into docs/tasks/CHANGELOG.md.
Task doc: docs/tasks/<task-slug>/task.md
Append a 3-5 line changelog entry with date, title, key changes, and outcome.`
})
```

Wait for the subagent to complete, then commit the changelog update.

## Step 6 — Tick the epic (if applicable)

If `task_get <task-slug> epic` returns a value:
`task_epic_tick <epic-slug> <task-slug>`.

If this was the last child (`task_epic_finalizable <epic-slug>` says ready),
finalize the epic too:

- Set `completed_at` on the epic: `task_set <epic-slug> completed_at <ISO now>`
- Archive: `archive-artifact <epic-slug>` or `git mv docs/tasks/epics/<epic-slug>/ docs/tasks/epics/archive/<epic-slug>/`
- Summarize the epic to CHANGELOG.

## Step 7 — Archive the task

```bash
git mv docs/tasks/<task-slug>/ docs/tasks/archive/<task-slug>/
```

## Step 8 — Clear state

Update `state.yaml`:

```bash
task_state_set active.task null
task_state_set active.slice null
task_state_set last_action finalize-task completed <task-slug>
task_state_set next_action ""
```

Keep `active.epic` if more tasks remain under the epic.

## Step 9 — Integrate into main

```bash
git checkout main
git merge --no-ff task/<task-slug> -m "task: finalize <task-slug>"
git branch -d task/<task-slug>
```

(If remote exists, push main.)

Commit: `docs(task): finalize <task-slug>`.

## Error handling

- **Never finalize partial work** — Step 1 is a hard gate.
- If CI fails, fix forward on the task branch — never merge a red branch.
- The task archive is a `git mv`, so history is preserved.

**Handoff:** Report: task archived, CHANGELOG updated, epic status (if any).
