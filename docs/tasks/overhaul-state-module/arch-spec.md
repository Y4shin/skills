# Architecture spec: overhaul-state-module

Status: approved (user, single conversation).
Scope: `src/core/state.ts`, the `task_state` / `task_state_set` tools in
`src/pi.ts`, and their tests. No other file changes.

## Exports

`src/core/state.ts`:

```ts
export interface WorkflowState {
  map: string | null;
  task: string | null;
  rest: Record<string, unknown>;
}

export const DEFAULT_STATE: WorkflowState = { map: null, task: null, rest: {} };

export function fromObject(raw: unknown): WorkflowState;
export function toObject(state: WorkflowState): Record<string, unknown>;
```

`rest` is the lossless bag of every frontmatter key the module does not model
(today `schema_version`, a legacy `slice` key, v1's `active` / `last_action` /
`next_action`). It is what the v4 migration reads to stamp `schema_version: 4`
and to drop `slice`.

## fromObject behavior

- `null`, `undefined`, or a non-object (string, number, array) returns a fresh
  clone of `DEFAULT_STATE`.
- **v1 nested format:** when `active` is a plain object and there is no
  top-level `map` / `task`, pointers read from `active.map` / `active.task`.
  `rest` holds every original top-level key verbatim, including `active`.
- **flat format (v2, v3, v4):** pointers read from top-level `map` / `task`.
  `rest` holds every other top-level key verbatim, including `slice` and
  `schema_version`.
- Only string values become pointers. Any other value (number, boolean, the
  string `"None"`) resolves to `null`.
- Never throws on shape.

## toObject behavior

- Returns `{ ...rest, map, task }`: unmodeled keys first in their original
  relative order, the modeled pointers last.
- Null pointers serialize as real YAML `null`, never the string `"None"`.
- Never stamps `schema_version`; the file's value stays whatever it already
  carried.
- Never writes `slice`; a legacy `slice` key survives only inside `rest`, and
  the migration's state-file rebuild is what drops it.

## Non-goals

- Comment preservation in state.yaml.
- v1 normalization (the nested `active` block is preserved, not rewritten).
- `schema_version` stamping (the migration owns the 3-to-4 flip).
- Any change to `frontmatter.ts`, `art.ts`, `task_context`'s schema text, or
  skill prose. Those belong to later tickets of this map.

## Tools

- `loadState(root)`: `fromObject(readYaml(sp))`; a missing or unparseable file
  yields a fresh default. An empty or comment-only file parses to `null`, so it
  also yields defaults, and the next write creates `map: null` / `task: null`.
- `saveState(root, state)`: `writeYaml(sp, toObject(state))`; signature
  unchanged.
- `task_state`: prints `map:` then `task:`, `(none)` for a null pointer.
- `task_state_set`: accepts exactly `map` and `task`. `"null"` clears the
  pointer. Any other field (notably the legacy `slice`) is rejected with a
  clear error naming the allowed fields. The literal string `"None"` is
  rejected as a pointer value.

## Existing abstractions to use

- `YAML` (already imported in `src/pi.ts`), `readYaml`, `writeYaml`,
  `taskRoot`, `findRoot`, `isInitialized`.
- The `def` / `Str` tool-factory helpers and the `createTools()` return shape.
- Test helpers `mkTmp` / `seedTree` / `ctx(directory)` in
  `tests/plugin.test.ts`.

## Do NOT reimplement

- No new YAML helper, no new file-IO helper; both already exist in `src/pi.ts`.
- Do not touch `frontmatter.ts` or `art.ts`.
- Do not rewrite `task_context`'s schema text, the `slice`-related tools, skill
  prose, or the migration: those are other tickets of this map.
- Do not add a `slice` compatibility shim to the setter; the field is gone
  from the model by design.

## Seams (user-approved)

1. **Unit seam:** the pure exports of `src/core/state.ts` (`fromObject`,
   `toObject`, `DEFAULT_STATE`), no file I/O.
2. **Tool-contract seam:** `createTools()` then `task_state` / `task_state_set`
   executed against a scratch fixture directory, the way skills invoke them.

Tests reach only these two seams. No test imports a private helper from
`src/pi.ts`.

## Interface contract for dependents

- `WorkflowState.rest` is the lossless bag the v4 migration reads
  (`schema_version`) and prunes (`slice`).
- `task_state_set`'s field vocabulary is exactly `{ map, task }`.
- `saveState` keeps its `(root, state)` signature so no caller changes.
- Single-pointer callers (the existing session integration test, skill prose
  that sets only `task`) keep working unchanged.

## Test plan

`tests/state.test.ts` (unit seam), rewritten for the new model:

- Round-trip fidelity: `fromObject` then `toObject` reproduces every key of an
  arbitrary state object, including unknown keys and a legacy `slice` key.
- Multiple unknown keys survive one write; preservation holds across two
  consecutive writes.
- v1 nested format: pointers from `active`, `active` itself preserved.
- Null fidelity: nulls parse back as `null`, and no serialized output contains
  the string `"None"`.
- Non-string pointer values coerce to `null`.
- Defaults for `null` / `undefined` / non-object input.

`tests/plugin.test.ts` (tool-contract seam):

- The demonstrated bug: plant `schema_version: 3` in `state.yaml`, run any
  state write, assert the key and its value are still on disk.
- Fresh repo: no `state.yaml`; the first write creates it with real nulls.
- `task_state_set` rejects `slice` and any other unknown field with a clear
  error naming `map` and `task`.
- `task_state` displays both the `map` and the `task` pointer.
- Clearing with `"null"` writes a real null, not `"None"`.
- A v3 file carrying unknown keys plus a legacy `slice` key keeps all of them
  through a write.

`tests/integration/session.test.ts`: the existing `task_state_set` /
`task_state` round-trip test must keep passing unchanged (single-pointer
caller).

## Constraints and dependencies

- Do not stamp `schema_version`; the value on disk is the file's business (the
  migration owns the 3-to-4 flip).
- Design context: `docs/tasks/task-tools-overhaul/spec.md`, Implementation
  Decisions, state file shape; decision record
  `docs/tasks/overhaul-synthesis-grilling/task.md`, round 2.
- No em-dashes in any prose this workflow writes.
