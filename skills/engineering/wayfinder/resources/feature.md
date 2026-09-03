# Wayfinder Planning Resource — Feature

Use this resource when the task delivers new application behavior. This
resource creates a feature task that the unchanged
`implement-task/resources/feature.md` pipeline can execute.

## Task document

Create `docs/tasks/<slug>/task.md` with:

```yaml
---
kind: task
type: feature
slug: <slug>
title: <title>
map: <map-slug>
status: ready
slices: [<slice-slug>, ...]
---
```

The body must state the user-visible outcome, user story, scope boundaries,
acceptance criteria, existing abstractions to use, and relevant architecture
or domain decisions.

## Slice planning

Break the feature into tracer-bullet vertical slices:

- Each slice crosses the relevant layers end to end.
- Each slice produces demonstrable or independently verifiable behavior.
- Do not create horizontal slices such as "database layer" or "API layer".
- Keep each slice small enough for one fresh implementation context.
- Put prefactoring first when it genuinely enables later slices.
- Use `blocked_by` only for dependencies that actually gate the slice.

Create `docs/tasks/<slug>/slices/<n>-<slice-slug>.md` for every slice:

```yaml
---
kind: slice
slug: <slice-slug>
title: <title>
task: ../task.md
mode: hitl | afk
status: todo
size: s | m | l | xl
blocked_by: []
---
```

Each slice body must contain:

- the end-to-end behavior it delivers;
- acceptance criteria;
- a `## Test plan` with seams, failure modes, scenarios, and edge cases;
- constraints and dependencies.

## Confirmation

Show the task and complete slice/dependency breakdown to the user. Iterate until
the granularity and blocking edges are approved. Only then add the task to the
map's `tasks` list and hand it to `implement-task`.
