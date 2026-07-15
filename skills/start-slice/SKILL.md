---
name: start-slice
description: >
  Understand a slice, determine its failure modes, then design a comprehensive
  test strategy via the design-test-strategy skill. Appends the confirmed test
  plan to the slice doc. Use before implement-slice.
---

# Start Slice — Test Strategy

Phase 1.5: understand the slice, identify its failure modes, then design a
comprehensive test strategy *before* writing a line of code.

## Prerequisites

Slice doc exists with `analysed: false`.

**Use `task_profile` to load test infrastructure conventions (fallback).**

**Use `task_reference` to load the slice doc/lifecycle reference.**

## Step 1 — Fetch + present

Read the task's `task.md` and the slice doc at
`docs/tasks/<task-slug>/slices/<n>-<slug>.md` in full. Present a structured
summary: task context, slice behaviour, acceptance criteria, blocked_by, mode
(hitl / afk).

## Step 2 — Grill on layers and failure modes (one question at a time)

Invoke `grill-me` with the agenda:

1. "What does this slice touch end-to-end? Which layers?"
2. "Walk me through the failure modes — at least two."

After both are confirmed, record the answers — they become inputs to the
testing strategy.

## Step 3 — Design the testing strategy: dispatch test-strategist subagent

Read the slice doc in full. Construct the subagent task from the confirmed
layer analysis and failure modes from Step 2. Dispatch `test-strategist` via:

```
subagent({
  agent: "test-strategist",
  task: `Design a testing strategy for slice <slug> (task: <task-slug>).

Slice doc: docs/tasks/<task-slug>/slices/<n>-<slug>.md

Layer analysis:
<confirmed layer analysis from Step 2>

Failure modes:
<confirmed failure modes from Step 2>

Generate a comprehensive test plan covering test types, scope,
dependency strategy, key scenarios, edge cases, error handling, and failure
mode coverage. Persist it as a ## Test plan section in the slice doc.`
})
```

Wait for the subagent to complete. Verify the test plan was written to the
slice doc by reading it back.

## Step 4 — Finalise

Once `design-test-strategy` returns successfully:

1. Set `task_set <slice-path> analysed true` in the slice doc's frontmatter.

2. Update slice frontmatter:
   - `task_set <slice-path> status in-progress`
   - `task_set <slice-path> started_at <ISO now>`

3. Update state.yaml:
   - `task_state_set active.slice <slice-slug>`
   - `task_state_set last_action start-slice analysed <slice-slug>`
   - `task_state_set next_action implement-slice <slice-slug>`

4. Commit: `docs(slice): add test plan for <slice-slug>`.

## Error handling

- If the slice doc is missing, the slice wasn't produced by this workflow —
  confirm the task/slug.
- If the slice is already `analysed: true`, skip grilling and confirm the
  existing test plan is still valid. If the existing test plan uses the old
  schema (simple assertion bullets), consider re-running through
  `design-test-strategy` to upgrade it.

## Constraints

- **Spec-first** — every scenario and assertion must derive from acceptance
  criteria, never from an implementation.
- **Failure modes before strategy** — you must understand what can break before
  designing how to catch it.
- Don't start implementing here.

**Handoff:** "Ready for `/skill:implement-slice <slice-slug>`."
