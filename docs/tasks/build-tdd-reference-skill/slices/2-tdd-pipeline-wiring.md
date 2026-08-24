---
kind: slice
slug: tdd-pipeline-wiring
title: Wire /tdd into implement-task + narrow tdd-worker to RED→GREEN + own refactor at Step 3
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: [tdd-skill-content]
---

# Slice 2: Wire /tdd into the pipeline and relocate the refactor step

## End-to-end behavior

The `tdd-worker` consults `/tdd` (passed via `skill: "tdd"` at dispatch) and
tests only at agreed seams. Its loop is RED→GREEN. Refactoring is owned by
implement-task's Step 3 coherence pass. The feature-path arch-spec template
includes a Seams section.

## Deliverables (land together — refactor always has a home)

### `agents/tdd-worker.md`

- Step 3: change "RED → GREEN → REFACTOR" to "RED → GREEN". Remove the inline
  refactor sub-step. The checkpoint commit after each GREEN remains.
- Add a one-line instruction (near Step 1 or in Constraints): "Consult the
  `/tdd` skill before writing tests; test only at agreed seams — the seams
  listed in the arch spec (features) or the repro's seam (bugs). If you
  believe a test belongs at an unlisted seam, write uncertainty.md and stop."
- Keep frontmatter unchanged (`tools`, `defaultContext: fresh`,
  `inheritProjectContext: true`).

### `skills/implement-task/resources/feature.md`

- tdd-worker chain step: add `skill: "tdd"` to the `subagent({...})` call (the
  object that has `agent: "tdd-worker"`).
- Step 1 (arch spec template): add a **Seams** bullet to the per-slice spec
  draft — "Seams: the public boundaries under test; list them; the user
  approves them; the tdd-worker tests only at these seams."
- Step 3 (coherence refactor): sharpen the prose to explicitly own the
  refactor step the tdd-worker shed — e.g. "This stage owns refactoring; the
  tdd-worker loop is RED→GREEN only. Refactor here, not in the per-slice
  worker." Keep the existing small/medium-vs-escalate rules.

### `skills/implement-task/resources/bug.md`

- tdd-worker chain step: add `skill: "tdd"` to the `subagent({...})` call.
- No arch-spec / Seams change (bug path has no arch spec; repro is the seam).
- No Step 3 / refactor change (bug path stays lean; a bug needing real
  refactor was mis-scoped — per Q5).

## Acceptance criteria

- `agents/tdd-worker.md` Step 3 is RED→GREEN (no inline REFACTOR); the
  consult-`/tdd`-and-test-only-at-agreed-seams line is present; frontmatter
  unchanged.
- `skills/implement-task/resources/feature.md` tdd-worker chain step passes
  `skill: "tdd"`; Step 1 includes a Seams bullet; Step 3 explicitly owns the
  refactor step.
- `skills/implement-task/resources/bug.md` tdd-worker chain step passes
  `skill: "tdd"`.
- Existing cross-reference tests still pass: feature.md references
  tdd-worker, slice-verifier, land-worker, deviation-reporter,
  task_dependency_levels; bug.md references tdd-worker, slice-verifier,
  land-worker and the red-first test rule; both resources keep "split" before
  "retry" and "parent never implements".
- `npm test` green.

## Test plan

- Seams: the pipeline resources and the agent file are the seams; the
  structure/xref tests in `tests/skills.test.ts` verify the references hold
  after edits.
- Failure modes:
  1. Dropping a required agent reference while editing feature.md/bug.md →
     xref test fails.
  2. Reordering the failure toolbelt → "split before retry" test fails.
  3. Leaving the loop as RED→GREEN→REFACTOR or omitting the consult line →
     acceptance criteria fail (and the skill's contract is broken).
  4. Adding `skill: "tdd"` with wrong syntax → the dispatch is malformed.
- Scenarios: after edits, `npm test` is green and the tdd-worker prompt
  (read from the file) contains the consult line and a RED→GREEN loop.
- Edge cases: the `no chain JSON references` and `no supervisor/intercom`
  tests must still pass for the edited resources (avoid those patterns).

## Constraints

- Land all three file changes together: the tdd-worker narrowing, the
  feature.md wiring + Seams + Step 3 sharpening, and the bug.md wiring. This
  guarantees refactor always has a home (no transient void where the worker
  shed REFACTOR but Step 3 doesn't yet own it).
- Parent-never-implements discipline holds: refactor moves to the
  implement-task parent's Step 3 (already a parent-owned stage), not into a
  worker.
- Do not add test-quality judgment to the slice-verifier (sibling task).
- Do not move refactor to a `/code-review` skill (doesn't exist; sibling
  task owns that decision).
