---
kind: task
slug: bug-workflow
title: Bug workflow (report, track, fix)
type: feature
description: Add a bug path to the workflow — report-bug skill, type-dispatched implement-task, bug closure in finalize-task, onboarding + routing support
epic:
slices: [report-bug-skill, implement-task-wrapper, finalize-bug-closure, onboarding-and-routing]
status: in-progress
started_at: 2026-07-30T16:35:00Z
completed_at:
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
