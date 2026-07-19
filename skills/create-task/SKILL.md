---
name: create-task
description: Interactive. Interview the user to define a task and its slices, then write task + slice docs with test plans.
---

# Create Task

Interview the user one question at a time. This is the only interactive phase.

## Steps

### 1. Task definition

Ask about:
- **Title and description** — what outcome does this deliver?
- **User stories** — who benefits and how?
- **Layers touched** — explore codebase, identify relevant files
- **Boundaries** — what's explicitly out of scope
- **Architecture notes** — existing abstractions this task MUST use and MUST NOT reimplement. Explore the codebase.

### 2. Slice breakdown

Work with the user to split into vertical, independently-testable slices.
For each slice, confirm:
- Title and slug (kebab-case)
- Acceptance criteria
- Size (S/M/L/XL)
- `blocked_by` (slice slugs it depends on)

### 3. Per-slice testing strategy

For each slice, ask inline (not delegated):
- Which layers does it touch?
- What can break? (≥2 failure modes)
- Testing approach: types, scope, dependency strategy, key scenarios, edge cases

### 4. Write artifacts

Derive slug from title (kebab-case, check `task_list` for collisions).

Write `docs/tasks/<slug>/task.md`:
```yaml
---
kind: task
title: <title>
slug: <slug>
description: <one-line>
epic: <epic-slug or empty>
slices: [<1-slug>, <2-slug>, ...]
status: draft
started_at: <ISO>
completed_at:
---
# <Title>

## User stories
...

## Scope
...

## Slices
...
```

Write each `docs/tasks/<slug>/slices/<n>-<slug>.md` with embedded test plan:
```yaml
---
kind: slice
title: <title>
slug: <slug>
task: ../task.md
mode: hitl
status: todo
size: <s|m|l|xl>
blocked_by: [<slug>, ...]
started_at:
completed_at:
---
## What to build
...

## Acceptance criteria
- [ ] ...

## Test plan
**Test types:** ...
**Run command:** `...`

### Scenarios
- Given/When/Then ...

### Edge cases
- ...

### Failure modes
- ...
```

Update slices list: `task_set_slices <slug> [<1-slug>, <2-slug>, ...]`

### 5. Commit

`git add docs/tasks/<slug>/ && git commit -m "docs(task): create <slug>"`

### 6. Hand off

Report the slug and slice count. "Next: `/skill:implement-task <slug>`"