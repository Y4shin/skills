---
name: implement-slice
description: >
  Build a slice via strict TDD against the confirmed test plan. Orchestrates
  the full build pipeline: branch → develop-tdd → verify (hard gate) → land.
  Use after start-slice.
---

# Implement Slice — Build with TDD

Phase 2: execute the agreed test plan with full repo automation.

## Prerequisites

Slice doc has `analysed: true` and `## Test plan`.

**Use `task_profile` for code conventions and CI commands.**

**Use `task_list` to see the planning tree.**

## Step 1 — Set state

Report starting slice `<slug>`.

## Step 2 — Sync + branch

```bash
git fetch origin 2>/dev/null || true
git checkout main && git pull --ff-only origin main 2>/dev/null || true
git checkout task/<task-slug> 2>/dev/null || git checkout -b task/<task-slug>
git checkout -b slice/<slug>
```

If no remote, skip fetch/pull.

## Step 3 — Load context

Read the slice doc `docs/tasks/<task-slug>/slices/<n>-<slug>.md` (spec + test
plan) **and** its parent `task.md`. Also read `docs/testing.md` if it exists
for project test conventions. Follow the project's code conventions.

## Step 4 — TDD: develop-tdd

Invoke `develop-tdd <slice-slug>`. This runs RED → GREEN → REFACTOR. It returns
when all tests pass.

## Step 5 — Verify (hard gate)

Invoke `verify-slice <slice-slug>`. If it fails, **stop**. Go back to Step 4 to
fix. Do not proceed to Step 6.

## Step 6 — Land

Invoke `land-slice <slice-slug>`. This handles merge, commit, timestamps,
archive, and state update.

## Step 7 — Hand off

Read `state.yaml` via `task_state`. Report:

- "All slices done → run `/skill:finalize-task <task-slug>`"
- "Next: `/skill:start-slice <next-slug>`"

## Error handling

- If the slice doc is missing or has `analysed: false`, run `/skill:start-slice` first.
- Never merge a red slice into the task branch.
- Resolve merge conflicts to keep both the new and already-merged slices working.

## Constraints

- **Spec-first** — never write a test to match a wrong implementation.
- **No speculative code** — implement only what the slice requires.
- **No per-slice PR** — slices merge into the task branch; only finalize merges to main.
