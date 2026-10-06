---
type: ticket
subtype: feature
title: Wayfinder absorbs planning, bounded passes, and the reconcile
status: stable
workflow_state: ready
blocked_by: [planning-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets]
size: l
---

## What to build

`wayfinder` becomes the single planning-phase skill. It creates the map and
the planning tasks, works the planning frontier (delegating `research` and
`prototype`, running `grilling` and `manual` itself), writes results back, and
runs the reconcile pass. The planning half of `implement-task` is folded in
here; there is no `plan-task`.

A pass is bounded to one frontier snapshot and at most one grilling. It works
the non-grilling ready tasks, runs exactly one grilling, then releases. It
never rolls into the next frontier. When the ready frontier is empty, the
pass runs the reconcile step and releases. Planning work is serialized per
kind: never two grillings at once, while research and prototype may run
concurrently.

Every planning task writes its own results back to the map through
`tw_write_section` as its final step, before it marks itself done. Wayfinder
never re-synthesizes decisions from task bodies; the reconcile pass verifies
and fixes what is missing through the writer, then sets the flag through
`tw_finalize_map`.

`wayfinder` stays user-invoked (`disable-model-invocation: true`). Resources
consolidate under `wayfinder/resources`, and the duplicate planning files
under `implement-task/resources` are deleted. `wayfinder/resources/grilling.md`
keeps creating the task document and stops describing how questions are asked.

## Acceptance criteria

- [ ] The planning frontier, the per-kind serialization, and the bounded pass
      are the skill's stated behavior.
- [ ] One pass works non-grilling ready tasks and at most one grilling, then
      releases; it never continues into the next frontier.
- [ ] An empty ready frontier triggers the reconcile step, which sets
      `ready_for_spec` only through `tw_finalize_map`.
- [ ] Each planning task writes its results back to the map before marking
      itself done.
- [ ] Resources live under `wayfinder/resources`; the duplicate
      `implement-task/resources` planning files are gone.
- [ ] `wayfinder` is user-invoked with the correct frontmatter.
- [ ] `tests/skills.test.ts` and `tests/skill-rewire.test.ts` are green.

## Blocked by

- planning-transition-tools (`tw_write_section` and `tw_finalize_map` are the
  writes this skill performs).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the Wayfinder gate and toolset come from the
  registry).

## Implementation notes

- Landed from `ticket/wayfinder-reconcile-and-passes` (5 wip commits on top of
  cfbb199) into `task/wayfinder-reconcile-and-passes` via an `--no-ff` merge;
  no conflicts.
- `skills/engineering/wayfinder/SKILL.md` rewritten to the absorbed planning
  phase: bounded pass (one `tw_frontier` snapshot, non-grilling ready tasks, at
  most one grilling, release, never the next frontier), per-kind serialization
  (never two grillings at once; research and prototype may run concurrently),
  per-task write-back via `tw_write_section` before `tw_mark_done`, and the
  reconcile on an empty ready frontier with the ready flag set only through
  `tw_finalize_map`. Map body template at schema 5. Frontmatter
  `disable-model-invocation: true`.
- Resources consolidated under `wayfinder/resources/` (research, prototype,
  grilling, manual); the duplicate `implement-task/resources/` planning files
  are deleted; the `implement-task/SKILL.md` router and `research/SKILL.md`
  repointed; `grilling.md` keeps the task document and delegates every session
  to the `grilling` skill.
- `docs/engineering/wayfinder.md` re-synced per project convention. New
  `wayfinder v5` describe in `tests/skills.test.ts` and seam 2d rewritten in
  `tests/skill-rewire.test.ts`; full suite 970/970 green, typecheck clean.
- Divergence: prose says "the ready flag" rather than the literal
  `ready_for_spec` token, because the landed opener-gate guard refuses that
  token in phase-skill prose; behavior unchanged and pinned by tests.