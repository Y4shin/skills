# Wayfinder Planning Resource — Bug

Use this resource when existing behavior is incorrect. The resulting task must
remain compatible with the unchanged `implement-task/resources/bug.md`
red-first regression pipeline.

## Task document

Create `docs/tasks/<slug>/task.md` with:

```yaml
---
kind: task
type: bug
slug: <slug>
title: <title>
map: <map-slug>
status: ready
bug: <bug-slug>
slices: [<slice-slug>]
---
```

The body must include the observed behavior, expected behavior, reproduction
command or evidence, scope boundaries, and acceptance criteria.

## Slice planning

A bug normally gets one default vertical slice because the regression and fix
must move together. Split only when the bug contains genuinely independent
behaviors or when a prerequisite investigation blocks the fix.

Create a slice with:

```yaml
---
kind: slice
slug: <slice-slug>
title: Reproduce and fix <bug>
task: ../task.md
mode: afk
status: todo
size: s | m | l | xl
blocked_by: []
---
```

The slice body must contain:

- the tight command that goes red on the unfixed bug;
- the regression-test plan;
- failure modes and edge cases;
- the expected fix boundary.

## Confirmation

Show the bug task and slice to the user. Do not invent a fix while planning.
After approval, add the task to the map and hand it to `implement-task`, whose
bug resource owns the red-first implementation flow.
