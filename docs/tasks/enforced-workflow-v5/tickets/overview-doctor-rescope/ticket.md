---
type: ticket
subtype: feature
title: task-workflow-overview and task-workflow-doctor re-scoped
status: stable
workflow_state: ready
blocked_by: [opener-gate-and-toolsets]
size: m
---

## What to build

Two model-invoked skills narrowed to what is left for them.

`task-workflow-overview` stays a progressively disclosed explainer of the v5
workflow plus a fast track that points at `tw_next` for the live answer. It
is a router over the phase skills and the flows between them; it must name
every user-reachable skill and reflect the v5 surface (`intake`,
`wayfinder`, `to-spec`, `to-tickets`, `implement-ticket`, `finalize-effort`,
`setup-workflow`). Its explainer content stays layered so a reader can stop
at any depth.

`task-workflow-doctor` narrows to what the tools cannot self-diagnose: a
legacy or unversioned tree, missing `CONTEXT.md` or `docs/tasks/`, a failed
migration, and routing when an opener refuses. Its resources that addressed
now-retired substrates are removed or repointed.

## Acceptance criteria

- [ ] `task-workflow-overview` names every user-reachable v5 skill and points
      its fast track at `tw_next`.
- [ ] Its explainer stays layered and progressively disclosed.
- [ ] `task-workflow-doctor` covers only legacy trees, missing scaffolding,
      failed migrations, and opener-refusal routing.
- [ ] Doctor resources for retired substrates are removed or repointed.
- [ ] `tests/skills.test.ts` and `tests/skill-rewire.test.ts` are green.

## Blocked by

- opener-gate-and-toolsets (the overview's `tw_next` fast track and the
  doctor's opener-refusal routing depend on the opener surface).

## Implementation notes

- Landed on `task/overview-doctor-rescope`, merged `--no-ff` at bdfb18f. The
  work is aaa3276 (criteria 1-2: the overview names the seven v5 phase skills,
  puts the `tw_next` fast track first, and stays layered; eight contract tests
  in `tests/skills.test.ts` pin the surface), 8a0941a (criteria 3-4: the
  doctor's four scopes, plus the resource removals and repoints), and c28c754
  (the two fixes below and their pins).
- The deviation report at `deviation-reports/overview-doctor-rescope.md` is
  folded into this landing docs commit. Both of its findings were fixed in
  c28c754, so neither is outstanding work:
  - Headline (the `USER_REACHABLE_V5` narrowing): reading "every
    user-reachable skill" as exactly the seven parenthesized phase names
    silently dropped the two review on-ramps the previous overview carried.
    c28c754 restores `/skill:eval-review` and `/skill:skill-review` to the
    overview's action table and to its docs page, and pins both in a new test
    so the narrowing cannot recur silently. `/skill:handoff` stays where it
    now lives, in the deep `PHASE-BOUNDARIES` layer. `code-review`,
    `skill-creator`, and `tdd` were unnamed before this ticket and stay
    unnamed; whether the router should also carry them is still a product
    question for `docs-resync`, not a defect here.
  - Minor: the archive-precondition row in `resources/opener-refusal.md` is a
    thrown error from `tw_archive_effort` (`src/pi.ts:2114`), not a `tw_open`
    result, so it carries neither `opened: false` nor `legal_next` and does
    not fit the resource's premise. c28c754 removes the row, and the refusal
    test now asserts its absence.
- Four divergences from the ticket's letter, all deliberate:
  - Two doctor resources the ticket does not name, `resources/failed-migration.md`
    and `resources/opener-refusal.md`, because the mandated scopes ("a failed
    migration", "routing when an opener refuses") had no existing home. The
    backup branch the migration resource tells the human to restore
    (`migrate/schema-<from>-to-5`) is the one `setup-workflow/SKILL.md:107`
    actually creates; the refusal shapes match the real `phaseGate` reasons in
    `src/pi.ts`.
  - `resources/missing-bugs-dirs.md` was deleted, not repointed. The ticket
    allows either, and `docs/bugs/` is archive-only now, so the retired
    substrate has no live failure mode left to route.
  - The overview's main flow was re-ordered to the v5 arc (`intake` ->
    `wayfinder` -> `to-spec` -> `to-tickets` -> `implement-ticket` ->
    `finalize-effort`, with `setup-workflow` once per repo), replacing the
    previous grilling-first narrative and its `handoff`/`prototype` bridge.
    This is the rescope the spec calls for, but it moves more prose than the
    two criteria strictly require.
  - Both docs pages were re-synced, which the repo mandate requires and the
    ticket does not name.
- `finalize-effort` is named by the overview although that skill does not exist
  yet. That is deliberate: `finalize-effort-skill` closes it, so the name stays.
- Verification at bdfb18f: `tests/skills.test.ts` and
  `tests/skill-rewire.test.ts` green (2 files, 537 tests), full suite green
  (18 files, 1104 tests, against the 1095 baseline at c814913: +9 contract
  tests, no file-count drift), `tsc --noEmit` exit 0. No linter is configured
  in this repo, so typecheck is the static gate.
- `docs/tasks/state.yaml` landed in the docs commit as it stood (the
  dispatcher pointer naming this ticket). Acceptance checkboxes are left
  unticked, matching every other landed ticket in this effort.