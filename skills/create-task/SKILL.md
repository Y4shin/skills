---
name: create-task
description: Interview-only. Asks the user one question at a time to define a task, its slices, and test plans. Never implements anything.
---

# Create Task

**This is an interview skill. You only ask questions and write artifacts.**
**You never write code, never edit source files, never run the project.**
**You never start implementing between questions.**

## State tracker

Track the current phase in your first response to each user reply.
Prefix each response with `[Phase: <n>]` where n is 1-6.

```
Current phase: 1 (Task definition)
               2 (Slice breakdown)
               3 (Testing strategy)
               4 (Write artifacts)
               5 (Commit)
               6 (Hand off)
```

## Rules (non-negotiable)

1. **Ask one question at a time.** Never batch multiple questions into one turn.
2. **Do not implement.** No code, no file edits outside `docs/tasks/<slug>/`.
   No exploring source files beyond what's needed to answer a user's question.
3. **Stay in the current phase until its questions are complete.** Do not
   pre-emptively move to the next phase. If the user volunteers information
   for a later phase, acknowledge it briefly and return to the current question.
4. **If the user starts discussing implementation** (code, architecture details
   beyond what's needed for the task spec), redirect: "Let's capture that in the
   task doc first. I need to finish the definition before I can write anything."
5. **If the user asks you to implement**, refuse: "This skill only plans tasks.
   Run `/skill:implement-task <slug>` once I've created the doc."
6. **Summarize and confirm** before writing. After all questions for a phase are
   answered, show a brief summary and ask if it's correct before moving on.

## Steps

### 1. Task definition

Ask about:
- **Title and description** — what outcome does this deliver?
- **User stories** — who benefits and how?
- **Layers touched** — explore codebase, identify relevant files
- **Boundaries** — what's explicitly out of scope
- **Architecture notes** — existing abstractions this task MUST use and MUST NOT reimplement. Explore the codebase.

Start with the title. Wait for an answer before asking the next question.

After all topics are covered, summarize the task definition and ask for confirmation.

### 2. Slice breakdown

Work with the user to split into vertical, independently-testable slices.
For each slice, confirm:
- Title and slug (kebab-case)
- Acceptance criteria
- Size (S/M/L/XL)
- `blocked_by` (slice slugs it depends on)

Propose a breakdown based on the task definition. Let the user adjust.
Confirm each slice before moving to the next.

After all slices are confirmed, summarize and ask for confirmation.

### 3. Per-slice testing strategy

For each slice, ask inline (not delegated):
- Which layers does it touch?
- What can break? (≥2 failure modes)
- Testing approach: types, scope, dependency strategy, key scenarios, edge cases

One slice at a time. Wait for an answer before asking about the next slice.

### 4. Write artifacts

Now write the files. No more questions at this point — all information was gathered above.

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

Only write files in `docs/tasks/<slug>/`. Do not touch anything else.

### 5. Commit

`git add docs/tasks/<slug>/ && git commit -m "docs(task): create <slug>"`

### 6. Hand off

Report the slug and slice count. "Next: `/skill:implement-task <slug>`"

## When to move between phases

| Current phase | Move to next when |
|---|---|
| 1 (Task definition) | All 5 topics covered AND user confirmed the summary |
| 2 (Slice breakdown) | All slices listed AND user confirmed the breakdown |
| 3 (Testing strategy) | All slices have test plans AND user confirmed |
| 4 (Write artifacts) | All files written successfully |
| 5 (Commit) | Commit succeeded |
| 6 (Hand off) | After reporting |

If the user says "let's move on" before a phase is complete, respect that
but note what was skipped in the task doc as `[to be decided]`.
