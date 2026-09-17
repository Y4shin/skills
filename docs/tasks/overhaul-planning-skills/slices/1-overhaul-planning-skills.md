---
kind: slice
slug: overhaul-planning-skills
title: Planning-side skills to v4 (wayfinder, to-spec, to-tickets, doctor, router)
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: wayfinder, to-spec, to-tickets,
the doctor conformance symptom, and the router map, all producing
v4-conformant output by construction.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Structure tests: skill registration facts, resource presence and
  absence, tool names in prose (the existing pattern).
- Conformance: produced artifacts validated against the combination
  rules by the doctor's symptom.

Failure modes to cover:

- A producer emitting a killed field (slice list, kind, slug, map)
  must be impossible by construction; assert the templates carry
  none.
- A planted nonconformant file is reported by the doctor with a
  routing remedy.

Scenarios:

- Wayfinder creates a map and tasks on a fresh v4 tree: every file
  conforms.
- To-tickets breaks a spec into tickets: every ticket.md conforms,
  no slice-list field anywhere.
- Resume: state pointers set from an existing effort.

Edge cases:

- A one-off effort (map with exactly one ticket, empty tasks/).
- A spec-only effort at planning time (zero tickets yet).

## Constraints and dependencies

- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), section Skill-prose
  consequences; decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, rounds 1
  (wayfinder resource deletion), 5 (index), 6 (task/ticket split).
