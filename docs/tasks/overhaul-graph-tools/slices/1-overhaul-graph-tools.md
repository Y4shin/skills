---
kind: slice
slug: overhaul-graph-tools
title: Scan-based graph tools and an honest schema reference
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: scan-based frontier, per-kind
levels, status-based finalizability with the spec-plus-zero-tickets
rule, anomaly reporting, and the fully rewritten schema reference.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Tool contract: every graph tool invoked the way skills invoke
  them, against scratch fixture effort trees (the seam the spec
  approved).

Failure modes to cover:

- The false-finalizable class: a spec-only child must read as
  unfinished and the effort as not finalizable.
- Orphan artifacts, missing blocked_by targets, invalid
  combinations, deprecated treated as done: each reported, never
  silently dropped.
- Cycle handling in blocked_by graphs.

Scenarios:

- Mixed readiness: one done task, one ready task, one blocked
  ticket.
- Levels per kind: a task chain and a ticket chain in one effort
  leveling independently.
- Effort-to-effort edge on a map delaying readiness.

Edge cases:

- Empty effort (map only).
- All-done effort with a spec and one ticket: finalizable.
- All-done effort with a spec and zero tickets: not finalizable.
- Deprecated artifact with workflow_state done: out of the graph,
  reported.

## Constraints and dependencies

- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), sections Graph
  semantics and Tool surface; decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, rounds 2 (spec
  visibility), 5 (scan-based tools), 6 (per-kind scoping).
