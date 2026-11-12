---
type: deviation report
title: Deviation report for trim-the-entry
status: stable
---

## Deviation report: trim-the-entry

### API surface changes

- **Planned:** the entry imports the family factories and composes them in one
  record, holds the entry point, the two tool-call handlers, `notify_user`, and
  the two registration name lists, and still exports `default`, `createTools`,
  and `notifyConfigPath` at `src/pi.ts`. The tool record keeps "the same 41 names
  in the same shape".
  **Actual:** satisfied on every count. `src/pi.ts` is 578 lines (was 616): the six
  `export { ... } from "./tools/*.js"` shims and the 34-name enumeration are gone,
  `createTools()` is seven spreads, the three exports are unchanged at the same
  path, and the surface is 40 `createTools()` keys plus `notify_user`, the same set
  as `main`. Key insertion order is not the same: 18 of 40 positions differ,
  because the record is now family-grouped (artifacts 8, effort 8, tickets 11,
  skill-creator 3, release 3, gates 6, feedback 1) where `main` interleaved
  families.
  **Impact:** no dependent ticket remains; this is the last ticket of the effort.
  The only observable effect is the order of the ungated registration listing the
  model sees. Nothing pins order: every surface assertion sorts, and tools resolve
  by name.

- **Planned:** the acceptance criteria speak of importing "the family factories",
  but ticket 4 landed six families as 34 named `Tool` consts, and its own
  deviation report flagged that the trim would need a conversion step its wording
  did not mention.
  **Actual:** the trim performed the conversion. `artifactTools()`, `effortTools()`,
  `ticketTools()`, `skillCreatorTools()`, `releaseTools()`, and `feedbackTools()`
  now each return `Record<string, Tool>`, and the 34 named consts are gone from
  `src/tools/*.ts`. `gateTools(gated)` was already a factory and is unchanged.
  Under `src/` no `export const X: Tool` and no `export { ... } from` re-export
  survives.
  **Impact:** future code importing a tool by name from a family module no longer
  resolves; nothing in the repo, the tests, the scripts, or the package metadata
  did so. The package's public shape (`package.json`'s entry path plus the three
  names) is untouched.

### Abstraction usage

- Used/was specified: **yes.** The composition is one object spread with no
  registry, descriptor table, or decorator layer, which is what the architecture
  required. `src/tools/support.ts` stays the one helper home for the families and
  the entry. `src/core/git-profile.ts`, `spawnVerdict`, and `isSpawnCall` keep
  their callers. The new corpus pin reads the existing `SOURCE_CORPUS` walk rather
  than adding a walk. `src/tools/gates.ts` still imports `createTools` from
  `../pi.js` for `workflowToolNames()`, lazily at call time, which is why the
  composition stayed in the entry; that cycle is unchanged from `main`, not newly
  introduced.
- Used/was specified: **no, carried over from the previous ticket.**
  `src/core/shape.ts` is still imported by nothing outside the git resolver and the
  spawn guard; no family imports `text` or `isObject`.

### Out-of-scope changes

- Ten new pins in a new describe, `the trimmed entry (trim-the-entry)`, in
  `tests/skills.test.ts` (+103 lines), which is where the suite's count goes from
  1595 to 1605. The architecture said "the split needs no new gate: a green suite
  is the proof that the surface is unchanged", so these are additive beyond the
  plan. They only assert the destination shape (each family is a factory, the
  entry imports only the factory, the composition is seven spreads, no re-export
  shim anywhere, the entry still holds the handlers and the name lists, three
  exports). None loosens or replaces an existing pin.
- Whitespace churn across six family modules, about 3,100 changed lines, from
  re-indenting 34 definitions into record members. The content is unchanged:
  `git diff -w` over the six modules contains only the factory wrapper, the
  `export const X: Tool = def(` to `X: def(` prefix change, the terminator change,
  and removed blank lines. A reviewer sees a large diff for a small semantic
  change.
- The entry's header "Principles" comment was rewritten to describe the split
  ("One entry: the extension's wiring, its guards, and its composition"). It is
  now accurate, but it is an edit beyond "delete the wrappers".
- No removals: nothing was deleted except the wrappers and the enumeration, no
  test was dropped, and no `package.json`, gate, disclosure, changeset, or bundled
  profile changed. `docs/tasks/state.yaml` carries the usual uncommitted workflow
  pointer (`task: trim-the-entry`).
- No line-count pin was added. Criterion 6 says the exact count is not a
  criterion, so 578 is reported as evidence only.

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

> Corrections to the notes above: the trim also converted the six families from
> named `Tool` consts to record factories, because ticket 4 landed named exports
> while this ticket's criteria speak of importing factories. The entry is 578
> lines (from 616), `createTools()` is seven spreads, and `Object.keys()` is
> family-grouped, so 18 of 40 positions differ from the pre-trim order even though
> the name set is identical. No order is pinned; if a later ticket pins
> registration order, this is its baseline. The family modules carry a
> whitespace-only diff and `git diff -w` reduces it to the wrapper and prefix
> changes. Ten new pins landed in a new `the trimmed entry (trim-the-entry)`
> describe, and the suite is 1605 tests. `src/tools/gates.ts` still imports the
> entry, unchanged and still lazy at call time.

### User attention needed?

**Yes**, on two counts, neither of which changes behaviour: six family modules lost
their 34 named tool exports and gained one factory each (an internal API change
with no in-repo consumer), and the model-visible registration listing is now
family-grouped rather than interleaved. The tool set, argument schemas,
descriptions, refusal texts, disclosure sets, and gate behaviour are unchanged:
the 40 definitions differ from `main` only in declaration form and indentation,
and the whole suite passes with no behavioural test edited.

**Verification run for this report** (on `ticket/trim-the-entry`, HEAD `39e88f0`,
base `main` at `cecd7ae`): `npm run typecheck` clean, `npm run typecheck:tests`
clean, `npx vitest run` 29 files / 1605 tests passed. Independent checks: the 40
tool names in the family modules form the same set as `main`'s `createTools()`,
with 18 positions differing; `git diff -w` over the six family modules contains
only wrapper, prefix, terminator, and blank-line changes; `src/pi.ts` exports
exactly `createTools`, `notifyConfigPath`, and the default function; no
`export const ...: Tool` and no `export { ... } from` survives under `src/`; and
`src/tools/gates.ts` imports `createTools` exactly as it did at `main`.
