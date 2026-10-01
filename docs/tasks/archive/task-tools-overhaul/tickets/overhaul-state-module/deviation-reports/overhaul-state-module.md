---
type: deviation report
title: overhaul-state-module
status: stable
---
## Deviation report: overhaul-state-module

Branch compared: `task/overhaul-state-module..slice/overhaul-state-module`
(6 checkpoint commits, `6b0e1fb`..`28d5a98`).
Spec: `docs/tasks/overhaul-state-module/arch-spec.md` (approved).
Slice doc: `docs/tasks/overhaul-state-module/slices/1-overhaul-state-module.md`.

### API surface changes

- **Planned:** `WorkflowState { map, task, rest }`; `DEFAULT_STATE`; `fromObject`;
  `toObject` returning `{ ...rest, map, task }`; `saveState(root, state)`
  unchanged; `task_state_set` vocabulary exactly `{ map, task }`.
- **Actual:** exactly that. `src/core/state.ts` exports `WorkflowState`
  (line 13), `DEFAULT_STATE` (19), `fromObject` (43), `toObject` (79); the
  two private helpers `isPlainObject` (22) and `pointer` (30) are not
  exported. `toObject` is `{ ...state.rest, map: state.map, task: state.task }`
  (line 80). `saveState` keeps its signature; `task_state_set` accepts
  `map`/`task` only (pi.ts:711-713).
- **Impact:** none on dependents. The `rest` bag is the interface the
  migration ticket consumes to read `schema_version` and to drop the legacy
  `slice` key; it is present and behaves as specced. No dependent slice
  calls a changed signature.

Two additive, non-surface details worth recording:

- `src/pi.ts` gained a private `freshDefault()` (line 400) so `loadState`
  returns a fresh `rest` object instead of sharing the module-level
  `DEFAULT_STATE.rest`. Private, no interface change; it is the correct
  reading of the spec's "fresh clone of `DEFAULT_STATE`".
- `task_state_set` rejects the literal value `"None"` (pi.ts:716) before
  touching disk. The spec listed this under `fromObject` coercion and under
  the setter's rejection rules; the implementation does both, and the
  tool-seam test asserts no `state.yaml` is created when the write is
  rejected.

### Abstraction usage

- Used/was specified: **yes.** `YAML`/`readYaml`/`writeYaml`, `taskRoot`,
  `findRoot`, `isInitialized`, and the `def`/`Str` tool-factory helpers are
  all reused; `mkTmp`/`seedTree`/`ctx(directory)` are reused at the tool
  seam. No new YAML or file-IO helper was introduced. `frontmatter.ts` and
  `art.ts` are untouched. No `slice` compatibility shim was added to the
  setter, per the spec's explicit prohibition.
- Both approved seams are respected: `tests/state.test.ts` exercises only
  the pure exports; `tests/plugin.test.ts` exercises `createTools()` against
  scratch fixture directories. No test imports a private helper from
  `src/pi.ts`.

### Out-of-scope changes

- **None.** `git diff --name-only task/overhaul-state-module..slice/overhaul-state-module`
  lists exactly four files: `src/core/state.ts`, `src/pi.ts`,
  `tests/plugin.test.ts`, `tests/state.test.ts`. Within `src/pi.ts` the
  change is confined to the state helpers block and the `task_state` /
  `task_state_set` definitions; `task_context`'s schema text (which still
  documents `kind: slice`) is untouched, as the spec required. No skill
  prose, no migration, no `frontmatter.ts`/`art.ts` edit.
- The slice branch carries no staged or uncommitted files.

### Divergence from the slice doc's acceptance criteria

All seven criteria are met; verification I ran independently:

| Criterion | Verdict | Evidence |
|---|---|---|
| Unknown key (`schema_version`) survives any state write | met | `tests/plugin.test.ts` "the demonstrated bug: a planted schema_version key survives a state write"; also v3-file and two-consecutive-writes tests |
| Setter accepts `map` and `task` only, clear error otherwise | met | rejection tests for `slice` and `bad`, error text names both fields (pi.ts:713) |
| `task_state` displays both pointers | met | `expect(out).toMatch(/map:\s+auth/)` and `/task:\s+login/` |
| Nulls are real null, never the string `"None"` | met | unit `toObject` + a real YAML stringify/parse cycle; tool tests read the file back and assert no `None` |
| Parse-then-serialize reproduces every key | met | unit round-trip block: v3 file, multiple unknown keys, two consecutive writes, v1 nested |
| Existing single-pointer callers keep working | met | `tests/integration/session.test.ts` 16/16, unchanged, including the `task_state_set`/`task_state` round-trip |
| Tests at both seams | met | 14 unit tests + 13 tool-contract tests |

Three behaviors the spec left implicit and the implementation resolved; none
contradicts the spec, but a reviewer should confirm each is intended:

1. **v1 nested write appends flat pointers.** A v1 file
   (`active: { map, task }`) round-trips with `active`, `last_action`,
   `next_action` preserved verbatim *and* new top-level `map`/`task` keys
   appended, so the written file carries both representations. This follows
   from the spec's "v1 normalization is a non-goal" plus `toObject`'s
   unconditional pointer emission. It is asserted in
   `tests/state.test.ts` ("v1 nested file round-trips with active
   preserved"). The migration's state-file rebuild is what normalizes it.
2. **Empty or comment-only `state.yaml`** parses to `null`, so `loadState`
   yields defaults and the next write creates `map: null` / `task: null`.
   Matches the slice doc's edge case.
3. **Error strings use a colon, not an em-dash** (`unknown field 'slice':
   use 'map' or 'task'`). The repo rule forbids em-dashes in prose this
   workflow writes; the pre-existing code used the em-dash form. The spec's
   "clear error" is satisfied.

### Downstream breakage this slice creates (not a deviation, but it must be tracked)

`task_state_set` now rejects `slice` by design, and two pieces of skill prose
still instruct exactly that. Both are outside this slice's scope and owned by
later tickets of the map, but they are live breakage until those tickets land:

- `skills/engineering/finalize-task/SKILL.md:127` instructs
  `task_state_set slice null`. This will now throw on every finalize. The
  owning ticket is `overhaul-execution-skills`, whose acceptance criteria
  already cover "pointers cleared" and "the set tool" usage.
- `skills/engineering/setup-workflow/SKILL.md:49` writes a fresh
  `state.yaml` template containing `slice: null` (and `task: null` without
  `map`). The owning ticket is `overhaul-v4-migration` ("setup-workflow
  moves to version 4"), whose criteria cover the fresh/migrate/no-op branch.
  The module already preserves a legacy `slice` verbatim, so nothing is lost
  in the interim.

No structure test asserts either line, so the full suite stays green; the
breakage is latent until a human or agent runs finalize-task against this
package's own repo.

### Task doc update needed?

**Yes.** Append to `## Implementation notes` in
`docs/tasks/overhaul-state-module/task.md`:

> State module v4 landed on `slice/overhaul-state-module` (6 commits).
> `WorkflowState` is `{ map, task, rest }`; `rest` is the lossless bag that
> preserves `schema_version`, a legacy `slice` key, and a v1 `active` block
> verbatim through every read-modify-write. `task_state_set` accepts exactly
> `map`/`task`, rejects `slice` and unknown fields, and rejects the literal
> value `"None"`. `toObject` never stamps `schema_version` and never writes a
> `slice` key of its own. Two implicit resolutions worth remembering: a v1
> nested file gains flat `map`/`task` pointers alongside its preserved
> `active` block (normalization is the migration's job), and an empty or
> comment-only `state.yaml` yields defaults with the next write recreating
> the file. Verified: 453/453 non-integration tests, 16/16 integration
> session tests, `tsc --noEmit` clean. Carried forward: `finalize-task`
> SKILL.md:127 and `setup-workflow` SKILL.md:49 still reference the `slice`
> field and will break until `overhaul-execution-skills` and
> `overhaul-v4-migration` land.

### User attention needed?

**No.** No scope change and no API surface differs from the approved spec:
the four in-scope files are the only ones touched, both seams are as
approved, and every acceptance criterion is met with a named test. The two
downstream prose references are already inside the acceptance criteria of
tickets later in this map, so they need no new decision.

### Commands run for this report

- `git diff task/overhaul-state-module..slice/overhaul-state-module` (full
  diff read, plus `--stat` and `--name-only`)
- `npx vitest run --exclude tests/integration/session.test.ts` → 453 passed
  (10 files)
- `npx vitest run tests/integration/session.test.ts` → 16 passed
- `npm run typecheck` → clean
- em-dash scan over added diff lines: two found and fixed (this report's own
  header and the task doc's Implementation notes heading, both emitted by the
  pre-existing `agents/deviation-reporter.md` / `agents/land-worker.md`
  templates, which still carry the em-dash form and are outside this ticket's
  scope).
