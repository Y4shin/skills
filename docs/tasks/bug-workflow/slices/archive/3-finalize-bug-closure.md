---
kind: slice
slug: finalize-bug-closure
title: "finalize-task closes bug docs for type: bug"
task: ../task.md
mode: afk
status: done
size: s
blocked_by: []
started_at:
completed_at: 2026-07-30T00:00:00Z
---

# Slice 3: finalize-task bug closure

Extend `skills/finalize-task/SKILL.md`: when the finalized task has
`type: bug`, additionally close the linked bug doc.

- Read the task's `type` (absent → `feature`, no behavior change).
- For `type: bug`: find the linked bug doc (task doc references it —
  establish the convention that promotion records the bug slug in the
  task doc, e.g. frontmatter `bug: <slug>`), then:
  - `status: fixed`, fill `fix_commit`
  - fill root cause + fix summary from the task's implementation notes
  - `git mv docs/bugs/<slug>.md docs/bugs/archive/`
- Feature tasks: unchanged.

## Acceptance criteria

- finalize-task prose contains a `type: bug` branch with the closure
  steps above.
- Convention documented: promoted bug tasks carry `bug: <slug>` in
  task.md frontmatter (coordinate with slice 1's promotion step).
- Structure test asserting finalize-task references `docs/bugs/archive`.
- Full test suite green.

## Test plan

- Layers touched: skill prose, test suite.
- Failure modes:
  1. Closure step missing → prose assertion fails.
  2. Wrong archive path or missing `status: fixed` → prose assertion
     fails.
- Key scenarios: prose test passes; feature-task path explicitly
  unchanged.
- Edge cases: `bug:` field absent on a `type: bug` task → finalize
  asks the user which bug doc to close (must be stated).
