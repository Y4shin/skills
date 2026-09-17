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
