---
kind: slice
slug: implement-task-wrapper
title: implement-task wrapper + feature/bug resources
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: []
started_at:
completed_at:
---

# Slice 2: implement-task wrapper + resources/{feature,bug}.md

Split `skills/implement-task/SKILL.md` into a thin wrapper plus two
resource files.

## Wrapper (`SKILL.md`)

- Read the task's `type` frontmatter (via `task_get`; absent →
  `feature`).
- Dispatch: follow `resources/feature.md` or `resources/bug.md`
  (paths relative to the skill directory).
- Keep the wrapper self-sufficient for routing; all execution detail
  moves to the resource files.

## `resources/feature.md`

- Current implement-task body, moved (mostly) unchanged.

## `resources/bug.md`

Lean single chain (approved design in the idea doc):

- Single chain `tdd-worker → slice-verifier → land-worker`. No
  dependency levels, no arch-spec approval conversation, no coherence
  refactor.
- The chain's spec = bug doc + repro.md + the single slice doc.
- tdd-worker's first job: convert repro.md into the regression test,
  run it against the unfixed code (must be red — the test rule), then
  fix → green → full suite.
- slice-verifier and land-worker behave as in the feature flow.
- Retry/uncertainty routing: same subagent-dispatch discipline as
  feature.md; the parent never implements.

## Failure toolbelt (BOTH feature.md and bug.md)

Hard rule: on subagent resource-exhaustion the parent **never
implements** — its only moves are re-dispatch strategies:

1. Diagnose first (read worker outputs/partial diff), never redo.
2. First failure → **always split** slice N into ad-hoc sub-slices
   Na, Nb, Nc (`slices/<N>a-<slug>.md`, conforming, chained via
   `blocked_by`; task doc `slices:` updated; slice N marked
   `status: split`). Exception: slice already atomic → skip to 3.
3. Second attempt → retry with +50% budgets.
4. Backstop → user escalation (existing "two retries failed" wording).
5. bug.md adds: a budget-exhausted tdd-worker attempt on a nasty bug
   is the preferred diagnostic — its findings seed the sub-slice
   breakdown.

## Acceptance criteria

- `SKILL.md` is a wrapper: reads `type`, dispatches to resources;
  both resource files exist.
- `resources/feature.md` preserves current behavior; `resources/bug.md`
  implements the lean chain.
- Both resources contain the failure toolbelt (split-first ordering).
- Cross-reference tests updated: references previously asserted on
  `SKILL.md` (task_dependency_levels, tdd-worker, slice-verifier,
  land-worker, deviation-reporter) now asserted on
  `resources/feature.md`; new assertions for `resources/bug.md`
  (tdd-worker, slice-verifier, land-worker, red-first test rule).
- Full test suite green.

## Test plan

- Layers touched: skill prose (3 files), test suite.
- Failure modes:
  1. Wrapper loses required references → xref tests fail.
  2. `type` dispatch ambiguity (absent key) → prose must state the
     `feature` default explicitly; assert via prose test.
- Key scenarios: xref tests pass against resources/feature.md;
  bug.md contains the lean chain + test rule; both resources contain
  "split" before "retry".
- Edge cases: tasks without `type:` (old tasks) must route to
  feature.md unchanged.
