---
kind: slice
slug: overhaul-execution-skills
title: Execution-side skills to v4 (implement-task, finalize-task, standards reads, ui-noter removal)
task: ../task.md
mode: afk
status: done
size: xl
legacy_blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: the implement-task per-ticket
chains with frontmatter-driven routing and the human-mode refusal,
the finalize-task v4 semantics, direct standards reads, and the
ui-noter removal.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Structure tests: prose references to tools, agents, and fields;
  the human-mode hard refusal expressed as a router rule.
- Prose conformance: the per-ticket chain steps name the effort
  frontier tool, the size budget table, and the effort-root arch
  spec.

Failure modes to cover:

- A mode: human ticket dispatched autonomously: the router must
  refuse, not fall through.
- A ticket with no size: defaults to m, never errors.
- A chain failure: the split path registers a sub-ticket (no
  ad-hoc slice docs).

Scenarios:

- Router dispatch by subtype: feature, bug, research, grilling.
- An effort frontier with two ready tickets: chains run per ticket.
- Finalize on a done effort: state via set tool, archive gated on
  scan tools, pointers cleared, index regenerated.

Edge cases:

- A one-ticket effort (the one-off case).
- An empty tasks/ subtree with tickets only.
- Absent mode and absent subtype fields (legacy artifacts).

## Constraints and dependencies

- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), sections Skill-prose
  consequences and Tool surface (human-mode marker); decision
  record docs/tasks/overhaul-synthesis-grilling/task.md, rounds 1
  (pipeline rebasing), 3 (mode: human), 4 (ui-noter), 6 (per-kind
  chains).
