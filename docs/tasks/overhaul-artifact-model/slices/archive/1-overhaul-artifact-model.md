---
kind: slice
slug: overhaul-artifact-model
title: v4 artifact model - dual-shape frontmatter parsing and resolution
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: the v4 frontmatter model
(type, subtype, status/workflow_state split, mode, size, scoped
blocked_by) and a dual-shape resolver that reads both the current
tree and the version 4 effort-grouped layout, spec-only directories
included.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Unit: the model's parse/validate/emit against frontmatter samples
  of every artifact kind.
- Tool contract: get and show invoked the way skills invoke them,
  against fixture trees in both shapes.

Failure modes to cover:

- Invalid status/workflow_state combinations surface as anomalies,
  never silently accepted.
- The audited kind-confusion regression: a wanted kind ignored on
  the slug-resolution branch now errors or resolves correctly.
- An unresolvable slug produces a clear error naming the wanted kind.

Scenarios:

- Old-shape fixture (flat task dirs, maps/ subtree, v3 fields).
- New-shape fixture (effort dir with map.md, spec.md, tasks/, and
  tickets/ subtrees).
- Mixed tree: both shapes present and resolvable in one repo.
- Spec-only effort directory; aux files (findings, deviation report)
  inside task and ticket directories.

Edge cases:

- Orphan artifact directory (no frontmatter match anywhere).
- blocked_by referencing a missing target.
- Empty effort directory; empty frontmatter.

## Constraints and dependencies

- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), sections Layout and
  artifacts, Frontmatter (OKF 0.2 unification), and the resolver
  paragraph under Tool surface; decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, rounds 3, 5, 6.
