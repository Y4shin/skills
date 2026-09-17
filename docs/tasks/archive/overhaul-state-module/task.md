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

## Implementation notes

### Slice: overhaul-state-module (landed)

State module v4 landed on `slice/overhaul-state-module` (6 commits, merged
into `task/overhaul-state-module`). `WorkflowState` is `{ map, task, rest }`;
`rest` is the lossless bag that preserves `schema_version`, a legacy `slice`
key, and a v1 `active` block verbatim through every read-modify-write.
`task_state_set` accepts exactly `map`/`task`, rejects `slice` and unknown
fields with a clear error, and rejects the literal value `"None"`. `toObject`
never stamps `schema_version` and never writes a `slice` key of its own.

Two implicit resolutions worth remembering: a v1 nested file gains flat
`map`/`task` pointers alongside its preserved `active` block (normalization
is the migration's job), and an empty or comment-only `state.yaml` yields
defaults with the next write recreating the file. `loadState` returns a fresh
default object each call so callers cannot pollute the shared `DEFAULT_STATE`.

Verified: 453/453 non-integration tests, 16/16 integration session tests,
`tsc --noEmit` clean; no lint script is configured. Carried forward:
`skills/engineering/finalize-task/SKILL.md` and
`skills/engineering/setup-workflow/SKILL.md` still reference the `slice`
field and will break until `overhaul-execution-skills` and
`overhaul-v4-migration` land.

### Knowledge harvest (post-review)

- `docs/testing.md`: corrected the stale "harness currently broken on the
  installed pi" section (the `AuthStorage.inMemory` failure no longer
  reproduces; the harness now uses `ModelRuntime.create` +
  `InMemoryCredentialStore` and the integration suite passes on `main` and on
  this branch), and added a "lossless round-trip modules" mock-convention
  entry recording the `rest`-bag pattern and how to test it.
- `CONTEXT.md`: added the **State pointer** term (`map` / `task`, everything
  else unmodeled and preserved) and extended **schema_version** to say the
  module preserves it verbatim while only the migration stamps it.
- Review follow-up: the two em-dashes this ticket's own artifacts carried were
  removed. Their source is the workflow's agent templates
  (`agents/deviation-reporter.md`, `agents/land-worker.md`), which emit the
  em-dash form and are outside this ticket's scope; recorded as workflow
  feedback.
