---
kind: task
type: feature
slug: overhaul-dead-surface
title: Delete the dead tool surface (zero references remain)
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-planning-skills
- overhaul-execution-skills
slices: [overhaul-dead-surface]
---

## What to build

The deletion ticket: the dead surface goes, with zero references
remaining anywhere in the package. Nothing new is built.

Deleted tools: resolve, assert_kind, map_tasks, map_tick (the
array died with the v4 layout), the slice pair (enumeration and
list-writer). Deleted feature: the guidelines tools (both) plus the
before_agent_start injection hook and the discovery machinery behind
them (user decision: the feature is deprecated in this overhaul, not
redesigned; a later effort revamps repo-standards delivery). The
notification tool stays untouched, workflow-external.

Because the rename ticket already swept these tools to their final
names and the prose tickets already re-pointed every consumer, this
ticket is a pure no-references-remain contract: remove the
implementations and registrations, remove the tests that cover them,
and verify the package carries zero references to anything deleted.

## Acceptance criteria

- [ ] The deleted tools are unregistered and their implementations
      gone.
- [ ] The guidelines injection hook and discovery machinery are
      gone.
- [ ] Package-wide search finds zero references to any deleted
      tool or the guidelines feature.
- [ ] The full test suite passes; deleted-tool tests are removed,
      not skipped.
- [ ] The notification tool is untouched (verified by diff).
- [ ] The doctor's conformance and routing prose no longer mentions
      the deleted surface.

## Blocked by

- overhaul-planning-skills and overhaul-execution-skills (every
      consumer re-pointed first; deletion stays pure).
