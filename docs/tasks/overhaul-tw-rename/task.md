---
kind: task
type: feature
slug: overhaul-tw-rename
title: Rename the tool family to the tw_ prefix
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-graph-tools
slices: [overhaul-tw-rename]
---

## What to build

Every surviving tool renamed from the task_ prefix to the
task-workflow prefix tw_ (show, get, set, list, frontier,
dependency_levels, map_finalizable, state, state_set, context), and
every reference in the package swept in one mechanical pass: tool
implementations and registrations, skill prose, resources, agent
prompts, and test suites, so no old-prefix reference remains. The
tools about to die (resolve, assert_kind, map_tasks, map_tick,
slices, set_slices, and the guidelines pair) are renamed too: this
deliberately keeps the deletion a pure no-references-remain contract
(the names die with the tools; there is no rename to unwind).

One mechanical change, no semantic edits: no behavior, contract, or
description text changes beyond the prefix. Behavior shifts landed
in earlier tickets; prose rework lands in the next ones.

## Acceptance criteria

- [ ] All registered tools answer to their tw_ names.
- [ ] The old task_ names are gone (grep across the whole package
      finds zero old-prefix references, prose included).
- [ ] No semantic edits ride along (diff review confirms: prefix
      only).
- [ ] The full test suite passes with tool names updated.
- [ ] Structure tests that assert tool names in prose are updated.

## Blocked by

- overhaul-graph-tools (the rework lands first; this ticket is the
  mechanical rename of what rework leaves behind, user decision,
  to-tickets quiz 2026-09-16: rename before the prose rewrites, so
  new prose is written against final names).

## Implementation notes

### Slice - overhaul-tw-rename (landed)

All 17 tool identifiers moved from the `task_` prefix to `tw_` in one
mechanical pass, merged into `task/overhaul-tw-rename` as `9617229` (slice
commit `1f01214`). `src/pi.ts` is the whole code change: 18 line edits in
`createTools()`, plus the label derivation at line 969 now strips `^tw_`
instead of `^task_`. The dying tools (`resolve`, `assert_kind`, `map_tasks`,
`map_tick`, `slices`, `set_slices`) renamed with the family, so
`overhaul-dead-surface` stays a pure no-references-remain deletion.
`notify_user` is untouched.

The sweep covered 26 further files: the seven skills that name tools
(wayfinder, to-tickets, implement-task plus its three resources,
finalize-task, task-workflow-overview), `README.md`, `CONTEXT.md`,
`docs/testing.md`, `docs/migration-target.yaml`, `rewrite-plan.md`, the four
test files (`plugin`, `gate-factory`, integration `session`, `skills`), and
the live `docs/tasks/` tree (map doc, handoff, the two audit findings docs,
the synthesis-grilling decision record, and this task's own arch-spec).
`docs/tasks/archive/` is deliberately untouched: archived docs keep the
names that were live when they ran.

New corpus assertion in `tests/skills.test.ts` (`tool prefix rename`):
every file under the package root minus `node_modules`, `.git`, and any
`archive` directory is read and checked against a regex built from the old
prefix plus the 17 suffixes, assembled from parts so the test file itself
carries no old-prefix literal. Zero offenders is the assertion, which makes
the acceptance grep non-regressable.

Verified independently on the merged branch: 666/666 tests across 15 files,
`tsc --noEmit` clean, and the arch-spec's verification grep
(`\btask_\(show|get|set|...|context\)\b`, excluding `node_modules`, `.git`,
`archive`) returns zero hits.

Two cosmetic observations, neither a blocker. First, the arch-spec's
Old/New table renamed its own "Old" column, so both columns now read `tw_`;
the prose around it still explains the rename correctly. Second, the sweep
also replaced tool names inside the dated historical entries of
`docs/tasks/CHANGELOG.md` (the `overhaul-graph-tools`, `overhaul-state-module`,
and `finalize-task-set-e-tool-confusion` entries). That is what the arch-spec
asked for (living docs are swept, only `archive/` is exempt), but it does
mean past entries now name tools by names that did not exist when those
slices landed.

`state.yaml` is unchanged and still reads `task: null`. Task status stays
`ready` for finalize-task.
