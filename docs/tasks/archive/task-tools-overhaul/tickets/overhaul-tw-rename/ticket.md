---
type: ticket
title: Rename the tool family to the tw_ prefix
status: deprecated
blocked_by:
- overhaul-graph-tools
subtype: feature
workflow_state: done
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

Two sweep defects found at verification and fixed in review follow-up
commits. First, the sweep renamed the arch-spec's own Old/New table,
collapsing both columns to `tw_`; the table is restored from the pre-sweep
commit, and the arch-spec joins the exemption set (it must keep the old
names to stay meaningful). Second, the sweep replaced tool names inside the
dated historical entries of `docs/tasks/CHANGELOG.md`; those entries are
restored to the names that were live when written, and the changelog joins
the exemption set, same class as the archive.

The whole-task review then widened the historical-record class: decision
records (the synthesis grilling, ADR 0001), audit findings (the inventory
and the usage audit), ideas docs, and the handoff keep their original
tool names, fixing the never-existent mixed state the exact-identifier
sweep had left them in. Living docs swept completely, wildcard included:
`src/pi.ts`, `README.md`, `CONTEXT.md`, `docs/migration-target.yaml`,
`docs/repo-gating.md`, the skills READMEs, the overview, the map doc,
`rewrite-plan.md`, `upgrade-2-to-3.md`, and the to-tickets description.
Two test defects fixed along the way: the gate-active absence test had gone
vacuous (its `task_` filter matched nothing after the rename), and the
corpus assertion gained a wildcard pattern so `task_*` prose references are
guarded too, not only exact identifiers.

`state.yaml` is unchanged and still reads `task: null`. Task status stays
`ready` for finalize-task.
