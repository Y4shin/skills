---
name: start-slice
description: >
  Understand a slice, decide the test strategy before writing any code, and
  append a confirmed test plan to the slice doc. Uses grill-me for the test
  strategy interview. Use before implement-slice.
---

# Start Slice — Test Strategy

Phase 1.5: understand the slice, then challenge the developer to decide the
right test strategy *before* writing a line of code.

## Prerequisites

Slice doc exists with `analysed: false`.

**Use `task_profile` to load test infrastructure conventions.**

**Use `task_reference` to load the slice doc/lifecycle reference.**

## Step 1 — Fetch + present

Read the task's `task.md` and the slice doc at
`docs/tasks/<task-slug>/slices/<n>-<slug>.md` in full. Present a structured
summary: task context, slice behaviour, acceptance criteria, blocked_by.

## Step 2 — Grill on test strategy (one question at a time)

Invoke `grill-me` with the agenda:

1. "What does this slice touch end-to-end? Which layers?"
2. "What's the simplest test that gives honest confidence this works in
   *production*?"
3. "If you run that test every few minutes while coding, is the feedback fast
   enough?"
4. "Walk me through the failure modes — at least two. Does the test type catch
   each one?"
5. "Do we need a real dependency (real DB, real HTTP, real browser) here, or
   can it be faked?"
6. "Is any part already tested elsewhere? What's the exact gap we're filling?"

**Test-type vocabulary:** use the test types, file patterns, and run commands
from the project profile's "Test infrastructure". `none` is valid only if the
slice is truly trivial or fully covered elsewhere.

## Step 3 — Persist the test plan

Once confirmed, set `task_set <slice-path> analysed true` in the slice doc's
frontmatter. Append a `## Test plan` section to the slice doc:

```markdown
## Test plan

**Test type:** <one type from the project's test infrastructure>
**Reasoning:** <one sentence>

### Assertions
- <key assertion 1>
- <key assertion 2>
- <error cases>

### Test file
`<path>`

### Run command
`<run command>`
```

## Step 4 — Set active state

Update slice frontmatter:
- `task_set <slice-path> status in-progress`
- `task_set <slice-path> started_at <ISO now>`

Update state.yaml:
- `task_state_set active.slice <slice-slug>`
- `task_state_set last_action start-slice analysed <slice-slug>`
- `task_state_set next_action implement-slice <slice-slug>`

Commit: `docs(slice): add test plan for <slice-slug>`.

## Error handling

- If the slice doc is missing, the slice wasn't produced by this workflow —
  confirm the task/slug.
- If the slice is already `analysed: true`, skip grilling and confirm the
  existing test plan is still valid.

## Constraints

- **Spec-first** — assertions derive from acceptance criteria, never from an
  implementation.
- Don't start implementing here.

**Handoff:** "Ready for `/skill:implement-slice <slice-slug>`."