---
kind: slice
slug: overhaul-state-module
title: State module v4 - lossless round-trip, real nulls, map and task pointers
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md (state model v4: two pointers,
lossless round-trip, real nulls). This slice delivers it end to end:
the state module, both state tools, and the tests that prove the
key-wipe bug class dead.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Unit: the state module's parse/serialize round-trip (pure data, no
  file I/O).
- Tool contract: the state and state-set tools invoked the way skills
  invoke them, against a scratch fixture repo.

Failure modes to cover:

- The demonstrated bug: an unknown key (schema_version) survives a
  write.
- Null fidelity: written nulls parse back as null, never "None".
- The setter rejects every field other than map and task.

Scenarios:

- Fresh repo: no state.yaml; the first write creates it with real
  nulls.
- v3 file with unknown keys and a legacy `slice` key: all preserved.
- Map pointer set, task pointer set, both set, both null.

Edge cases:

- Empty or comment-only state.yaml.
- Multiple unknown keys preserved through one write.
- Two writes in a row: preservation holds across sequences.

## Constraints and dependencies

- Do not stamp schema_version; the value on disk is the file's
  business (the migration owns the 3-to-4 flip).
- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), Implementation Decisions,
  state file shape; decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, round 2.
