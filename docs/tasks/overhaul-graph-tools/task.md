---
kind: task
type: feature
slug: overhaul-graph-tools
title: Scan-based graph tools and an honest schema reference
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-v4-migration
slices: [overhaul-graph-tools]
---

## What to build

The graph tools and the schema reference rebuilt on scans of the
effort-grouped tree, reading each artifact's own frontmatter (the
map array and its override semantics are gone with the v4 layout).

The frontier, dependency levels, and effort finalizability compute
from directory scans: levels are computed per kind within an effort
(task chains and ticket chains leveled independently); an effort is
finalizable only when every task and ticket is done and, if a spec
exists, at least one ticket exists (the spec-plus-zero-tickets rule
that kills the false-finalizable class); effort readiness at the
feature level derives from blocking efforts' statuses plus the scan
of the effort's own tasks and tickets. The per-task finalizable
check is status-based (workflow_state done), never slice-file-based.
The graph tools report anomalies instead of silently dropping them:
orphaned artifacts, missing blocked_by targets, invalid
status/workflow_state combinations, and deprecated artifacts treated
as done (out of the graph).

The context tool's schema reference is rewritten in full: every
current artifact type with its fields, the two-phase flow including
ticket generation, the conformance rules, mode and size documented,
no slice block, no killed fields; the optional profile appendix
stays. The finalize prose's finalizable gate reads from real
sources.

## Acceptance criteria

- [ ] Frontiers, levels, and finalizability compute from scans of
      fixture trees; no map-array reads.
- [ ] Levels are per kind: task chains and ticket chains level
      independently.
- [ ] An effort with a spec and zero tickets is not finalizable.
- [ ] Each anomaly class (orphan, missing target, invalid combo,
      deprecated-as-done) is reported, never silent.
- [ ] The per-task finalizable check is status-based.
- [ ] The context tool's schema reference describes the v4 flow,
      types, and rules with no slice block and no killed fields.
- [ ] The false-finalizable fixture (a spec-only child) reads as
      unfinished, and the effort reads as not finalizable.
- [ ] Tests through the registered-tool interface against fixture
      trees.

## Blocked by

- overhaul-v4-migration (the graph tools scan the v4 tree this
  ticket's blocker produces).
