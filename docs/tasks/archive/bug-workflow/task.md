---
kind: task
slug: bug-workflow
title: Bug workflow (report, track, fix)
type: feature
description: Add a bug path to the workflow — report-bug skill, type-dispatched implement-task, bug closure in finalize-task, onboarding + routing support
epic:
slices: [report-bug-skill, implement-task-wrapper, finalize-bug-closure, onboarding-and-routing]
status: done
started_at: 2026-07-30T16:35:00Z
completed_at: 2026-07-30T16:35:00Z
---

# Bug workflow (report, track, fix)

Origin: `docs/ideas/bug-workflow.md` (status: converted — the idea doc is
the authoritative design reference, including the report-bug flowchart).

## Outcome

Repos using this workflow can report bugs without a feature-shaped
interview, track them in git under `docs/bugs/`, fix trivial ones on the
spot (TDD-ordered), and promote the rest to conforming `type: bug` tasks
executed by a lean single chain.

## User stories

- As a repo maintainer, I report a bug in free form and get a tracked
  bug doc — no user-story/boundary/slice interrogation.
- As a repo maintainer, a trivial bug is fixed on the spot with a
  regression test that is red when the bug is present (the test rule).
- As a repo maintainer, a non-trivial bug becomes a conforming task
  without sitting through create-task's interview.
- As the orchestrating session, I never implement in the parent context
  when subagents fail — I split slices or retry bigger, then escalate.

## Boundaries (out of scope)

- Repro-schema templates under `skills/report-bug/resources/repro-schemas/`
  (follow-up; the skill must tolerate their absence).
- `task_*` tool / state.yaml changes (frontmatter parser is permissive —
  verified in `src/core/frontmatter.ts`; `type:` needs no code change).
- Severity automation, SLAs, assignment.
- Fixing the currently-red test suite (18 failures) — handled
  out-of-band before implementation starts. **Prerequisite:**
  implement-task must not start until `npm test` is green on main.

## Architecture notes

- Skills are prose, tested by **structure/cross-reference assertions**
  in `tests/skills.test.ts` (existing pattern: "implement-task
  references tdd-worker"). Each slice extends that file.
- `package.json` `pi.skills` registers skills; the manifest test
  currently asserts `length === 5` (must become 6).
- `task_get`/`task_show` read arbitrary frontmatter fields — the
  implement-task wrapper reads `type` via `task_get`, defaulting to
  `feature` when absent.
- implement-task slice chains share the repo cwd — slices run
  sequentially; no `blocked_by` needed, list order is execution order.
- The subagent failure toolbelt (diagnose → split-first → retry-bigger
  → escalate; parent NEVER implements) goes into **both**
  `resources/feature.md` and `resources/bug.md`.

## Implementation notes

- Slice 1 (report-bug-skill): manifest skill count is 7, not 6 —
  spec/slice-doc baseline claim was stale (refine-idea made 6 at
  baseline; +report-bug = 7). Skill promotion frontmatter should
  enumerate the full task schema (`kind`, `slug`, `slices:`, `type: bug`,
  `bug: <slug>`) — tighten in coherence refactor. `.gitignore` gained
  `.pi-subagents/` (out-of-scope but kept). Full suite green at land
  (154/154).
- Slice 2 (implement-task-wrapper): `implement-task/SKILL.md` split
  into a thin wrapper (reads `type` via `task_get`, absent →
  `feature`, dispatches to resources) plus `resources/feature.md`
  (existing chain body + failure toolbelt) and `resources/bug.md`
  (lean red-first chain). Xref tests retargeted to `resources/*` with
  new bug.md assertions; 160/160 green at land. Deviation-reporter
  follow-ups needing user attention (see
  `deviation-reports/implement-task-wrapper.md`): bug.md Step 0 reads
  repro.md at the pre-promotion path `docs/bugs/<slug>/repro.md`
  (promotion contract puts it next to `task.md`); feature.md silently
  dropped uncertainty.md routing, `task_state_set task <taskSlug>`,
  and the per-level deviation-report review from the old chain-result
  block — restore or ratify the removal; known doc/runtime mismatch,
  `turnBudget` is unsupported on chain steps.

## Coherence-refactor mandate (user-approved, from slice-2 deviation report)

1. Restore in `resources/feature.md`: uncertainty.md routing,
   `task_state_set task` bookkeeping, per-level deviation-report review.
2. Fix `resources/bug.md` Step 0: repro.md lives at
   `docs/tasks/<taskSlug>/repro.md` (next to task.md), not under docs/bugs/.
3. Noted separately (global): `turnBudget` in chain prose is unsupported
   by the subagent runtime — stale in both resources.

- Slice 3 (finalize-bug-closure): `finalize-task/SKILL.md` gained
  **Step 6 — Bug closure (type: bug only)**: reads task frontmatter
  (absent `type` → `feature`, no behavior change), resolves the linked
  bug via `bug: <slug>` (asks the user when absent), sets
  `status: fixed`, fills `fix_commit` and Root cause / Fix summary from
  implementation notes, then `git mv` to `docs/bugs/archive/<slug>.md`.
  Subsequent steps renumbered (Archive → 7, Epic finalization → 8,
  Report → 9). Five prose assertions added to `tests/skills.test.ts`.
  Full suite green at land (165/165).
- Slice 4 (onboarding-and-routing): `onboard-workflow/SKILL.md` now
  creates `docs/bugs/` + `docs/bugs/archive/` (with `.gitkeep`
  handling) and writes a `docs/dev-env.md` template (dev-env start,
  reproduction guidance, or explicit "do not attempt AI reproduction"
  placeholder) with a no-clobber clause on re-run; final report
  mentions `/skill:report-bug`. `task-overview/SKILL.md` routes
  "Report a bug" → `/skill:report-bug`, lists the triage-queue query
  `grep -l "status: reported" docs/bugs/*.md`, and names `docs/bugs/`
  as the bug list location. Six prose assertions added to
  `tests/skills.test.ts`. No divergences from the arch-spec contract
  (see `deviation-reports/onboarding-and-routing.md`); full suite
  green at land (171/171).

## Architecture lessons (harvested at finalize)

- Skill prose is cheap to drift: cross-reference assertions in
  tests/skills.test.ts caught none of the slice-2 behavior loss — the
  deviation-reporter did. Prose tests assert presence of strings, not
  preservation of behavior blocks; deviation review remains essential.
- `turnBudget` in chain prose is unsupported by the subagent runtime
  (rejected at dispatch). Both implement-task resources still mention
  it — global cleanup candidate.
- Unquoted `: ` in YAML frontmatter values silently invalidates a doc
  for the task tools (recorded in docs/testing.md).
- The failure toolbelt was exercised for real on slice 1 (chain
  timeout → continuation re-dispatch instead of parent self-fix) and
  worked as designed.
