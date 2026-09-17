---
kind: slice
slug: overhaul-v4-migration
title: One v4 migration from any vintage, plus setup-workflow v4
task: ../task.md
mode: afk
status: todo
size: xl
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: the any-vintage-to-v4
transformation as one tested unit, plus setup-workflow v4 keying on
schema_version 4.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- The migration seam (user-approved): the transformation tested as
  a unit against fixture trees, one fixture per vintage, asserting
  end state, idempotence, resumability, and corruption safety.
- setup-workflow's detection: schema_version keyed branch selection.

Failure modes to cover:

- Malformed or partially written frontmatter mid-migration: the
  tree stays untouched (inject a failure, assert no corruption).
- An interrupted run (simulated): resume completes to the same end
  state.
- Unresolvable blocked_by references: reported, not dropped
  silently.

Scenarios:

- Every vintage: fresh, unversioned, v1 nested state, v2, v3, flat
  layout, maps-subtree layout, archived tree.
- The live corpus patterns: spec-only directories, aux files without
  frontmatter, the vendored matt-skills snapshot, the current
  state.yaml with unknown keys.
- A second run over an already-migrated tree: zero changes.

Edge cases:

- Effort directory with only a map (no tasks, no tickets).
- Archive trees in old shapes (nested task dirs, slices/ dirs).
- Empty docs/tasks (fresh-repo branch end state).
- state.yaml with schema_version present but tree unversioned.

## Constraints and dependencies

- This slice is deliberately XL: one contract keeps
  "migrates everything no matter the current version" a single
  testable guarantee (user decision, to-tickets quiz 2026-09-16).
- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), section Migration; the
  decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, round 3 (migration
  scope) and round 5 (layout, vendored trees, index).
- The migration is not run against this repo's live tree by this
  ticket; that flip is a user call at run time.
