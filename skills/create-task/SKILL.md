---
name: create-task
description: Interview-only. Grills you relentlessly about a task until the decision tree is resolved. Optionally starts from a refined idea in docs/ideas/; redirects large or vague requests to refine-idea. Never implements anything.
---

# Create Task

**Interview-only. You never write code, never edit source files outside `docs/tasks/`.**
**You never start implementing. Refuse if asked.**

## Intake

**With an idea** (`/skill:create-task <idea-slug>` where `docs/ideas/<idea-slug>.md` exists):
- Read the idea doc. If `status` is `proposed` or `in-grilling`, warn that it
  isn't fully grilled and ask whether to continue anyway or run
  `/skill:refine-idea <idea-slug>` first.
- The doc *is* the task definition: recap your understanding of it and ask for
  confirmation. Only ask about genuine gaps — never re-interview settled ground.
- Ideas may be stale: verify any codebase claims by exploring the current code,
  not by asking. Surface material drift and let the user adjust.

**Without an idea:** triage first. Proceed only if this is a small,
well-understood change — single outcome, obvious boundaries, roughly ≤3 slices.
Ask the user directly whether that bar holds, and give your recommended judgment.
If not, stop here: offer to seed `docs/ideas/<slug>.md` from what you've heard
so nothing is lost, and hand off — "This needs fleshing out first. Run
`/skill:refine-idea <slug>`."

## Style

Grill the user relentlessly about the task until every decision is resolved.
- **One question at a time.**
- **For every question, propose a concrete recommended answer** — never ask an open-ended question without giving your best guess first.
- **If the answer can be found by exploring the codebase, do that instead of asking.** Inspect relevant files, then propose what you found.
- **Drive toward resolution.** Follow up on vague answers. Point out inconsistencies. Ask "what about X?" when something is underspecified.
- **Summarize and confirm before writing.** Once all questions are settled, recap the full task definition and ask for confirmation. Then write the artifacts in one shot.

## Guardrails

1. **One question at a time.** Never batch.
2. **Do not implement.** No code, no file edits outside `docs/tasks/<slug>/`.
3. **If the user asks you to implement**, refuse: "This skill only plans tasks. Run `/skill:implement-task <slug>` once I've created the doc."
4. **If the user says "let's move on", respect that** but mark skipped decisions as `[to be decided]` in the task doc.
5. **Redirect if the scope outgrows a task.** If the grilling reveals multiple
   outcomes or boundaries the user can't pin down, pause. Offer to seed
   `docs/ideas/<slug>.md` (status `proposed`, with an Open questions queue)
   from everything gathered so far, then hand off to `/skill:refine-idea <slug>`.
   Never discard gathered context.

## Topics to resolve (in any order the conversation flows)

Let the conversation be organic, but make sure these are all covered:

### Task shape
- **Title & description** — what outcome does this deliver?
- **User stories** — who benefits and how?
- **Boundaries** — what's explicitly out of scope?

### Codebase context
- **Layers touched** — explore the codebase to identify relevant files. Don't ask; inspect.
- **Architecture notes** — existing abstractions the task MUST use and MUST NOT reimplement. Inspect before asking.

### Slice breakdown
- Split into vertical, independently-testable slices.
- For each slice: title, acceptance criteria, size (S/M/L/XL), `blocked_by`.

### Testing strategy
- For each slice: layers touched, failure modes (≥2), key scenarios, edge cases.

## Writing artifacts

Only after everything is confirmed. Derive slug from title (kebab-case, check `task_list` for collisions). Write `docs/tasks/<slug>/task.md` and `docs/tasks/<slug>/slices/<n>-<slug>.md` files.

If the task came from an idea, also update `docs/ideas/<idea-slug>.md`:
`status: converted`, `converted_to: <task-slug>`. This is the one allowed
exception to editing outside `docs/tasks/`.

Commit. Hand off with the slug and slice count: "Next: `/skill:implement-task <slug>`"
