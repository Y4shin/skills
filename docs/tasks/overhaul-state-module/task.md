---
kind: task
type: feature
slug: overhaul-state-module
title: State module v4 - lossless round-trip, real nulls, map and task pointers
map: task-tools-overhaul
status: ready
blocked_by: []
slices: [overhaul-state-module]
---

## What to build

The workflow state module and its two tools move to the version 4
state contract. A state write must never again destroy keys it does
not model (the demonstrated live bug: `task_state_set` wiping
`schema_version`, the key `setup-workflow` keys its detection on).

The state model becomes two pointers, `map` and `task`. The setter
accepts exactly those two fields and rejects anything else with a
clear error. The serializer round-trips every file losslessly: keys
the module does not model (today `schema_version`, a v3 file's legacy
`slice` key) are preserved verbatim through every read-modify-write.
Nulls serialize as real YAML null, never the string "None". The state
tool shows both pointers.

The v3 `slice` field stops being modeled or written; files still
carrying it are preserved untouched until the migration's state-file
rebuild drops it. The file's `schema_version` value stays whatever the
file already carries: stamping 4 is the migration's job, not the
module's.

## Acceptance criteria

- [ ] Planting an unknown key (schema_version) in state.yaml and
      running any state write preserves the key and its value.
- [ ] The state setter accepts `map` and `task` only; other fields
      are rejected with a clear error.
- [ ] The state tool displays both the map and the task pointer.
- [ ] Null pointers serialize as real null; the module never writes
      the string "None".
- [ ] Parse-then-serialize of an arbitrary state.yaml reproduces every
      key (round-trip fidelity).
- [ ] Existing single-pointer callers keep working unchanged.
- [ ] Tests through the registered-tool interface plus unit tests for
      round-trip fidelity.

## Blocked by

- None (can start immediately).
