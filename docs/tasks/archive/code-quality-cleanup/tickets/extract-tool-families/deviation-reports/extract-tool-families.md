---
type: deviation report
title: Deviation report for extract-tool-families
status: stable
---

## Deviation report: extract-tool-families

### API surface changes

- **Planned:** the entry keeps "a `createTools()` that spreads the family
  factories into one record", and the module layout is seven family modules plus
  a support module.
  **Actual:** eight modules exist (`artifacts`, `effort`, `tickets`, `gates`,
  `release`, `feedback`, `skill-creator`, `support`), but only the gate family is
  a factory (`gateTools(gated)`); the other six families export 34 named `Tool`
  consts (`tw_show`, `tw_write_spec`, ...) and `createTools()` enumerates all 34
  by name, then spreads `gateTools(gated)`. The corpus gained 35 top-level
  bindings (34 tool consts plus `gateTools`); all 136 pre-move declarations still
  exist exactly once (checked with a throwaway AST-lite comparison).
  **Impact:** `trim-the-entry` cannot reach its "imports the family factories"
  criterion by deletion alone. It must first turn six named-export families into
  factories (or decide the named exports are the final shape and relax its own
  wording). The previous report for `shape-helpers-module` assumed the families
  would export factories; that assumption holds for one family only.

- **Planned:** the entry "keeps exporting the extension entry point, the tool
  factory, and the configuration-path helper ... sixteen test files import those
  three names"; thin re-exports exist so "every import path the suite already
  uses still resolves".
  **Actual:** the three exports are unchanged at the same path
  (`default`, `createTools`, `notifyConfigPath`), and on top of them the entry
  now re-exports 34 tool definitions in six `export { ... } from "./tools/*.js"`
  lines. Nothing was removed: pre-move `src/pi.ts` exported exactly those three
  names and no tool const, so the re-export block is a pure addition. The 34
  re-exports are not load-bearing for the suite (no test imports a tool name from
  the entry; the new pin only imports the three names).
  **Impact:** `trim-the-entry`'s "no re-export shim survives anywhere" is a
  34-line deletion plus the matching import block and the 34-entry enumeration in
  `createTools()`. Its "same three exports at the same path" criterion is already
  satisfied today.

- **Planned:** the same 41 names in the same shape, order unspecified.
  **Actual:** the registered names are identical (40 from `createTools()`, plus
  `notify_user` in the entry), but `Object.keys(createTools())` order changed for
  two tools: `tw_migrate` and `tw_phase_brief` now sit inside the gate block at
  the end instead of positions 28 and 33, because `gateTools()` is spread as one
  record. `tw_request_tool` also moved after `tw_migrate`.
  **Impact:** none on the suite (every surface assertion sorts) and none on
  lookup, since tools resolve by name. The model sees a differently ordered tool
  listing; if any later ticket ever pins registration order, this is the new
  baseline.

- **Planned:** no import cycle was named; the family modules were expected to be
  leaves apart from the support module.
  **Actual:** `src/tools/gates.ts` imports `createTools` from `../pi.js` so that
  `tw_request_tool`'s `workflowToolNames()` can refuse a name the package does not
  register. It is the only cycle in `src/`, it is documented at the import, and it
  is safe because `createTools` is a hoisted function declaration read at execute
  time.
  **Impact:** `trim-the-entry` must keep the composition in `src/pi.ts` (or rework
  how the request tool learns the registered names) or it inherits a cycle it did
  not intend. If the composition ever moves out of the entry, this import has to
  move with it.

- **No change to the tool surface itself.** All 40 moved definitions are identical
  to their pre-move bodies after stripping whitespace (the move re-indented), so
  argument schemas, descriptions, refusal wording, and disclosure sets are
  untouched. There is exactly one definition of each of the 136 declarations
  across `src/`.

### Abstraction usage

- Used/was specified: **yes** for the modules the architecture named and that the
  families actually need. `src/tools/support.ts` is imported by all eight family
  modules and by the entry; `src/core/git-profile.ts` is read by `gates.ts` and
  `support.ts` (no family re-derives a branch rule); `src/disclosure.ts` is read by
  `gates.ts` and the entry; the seven pins are rewritten over the existing
  `corpusFiles` walk through `SOURCE_CORPUS` / `countInSource` /
  `sourceFilesWith`, as the architecture required, rather than a new walk.
- Used/was specified: **no** for `src/core/shape.ts`. No tool module imports
  `text` or `isObject`. The ticket's own `blocked_by: shape-helpers-module`
  rationale ("the extracted families import the shape guards from their one home")
  does not hold: no family needed either guard, before or after the split. The
  architecture's name-collision instruction therefore never triggered, and three
  `const text` locals survive in `gates.ts`, `artifacts.ts`, and `support.ts`,
  harmless while no family imports the helper, and a shadow hazard again if one
  ever does.
- Also a spec itemization miss rather than a defect: the architecture expected
  "the artifact-title and slug helpers" in `support`. `readArtifactTitle` is
  there; the slug helpers stayed in `src/core/slug.ts` and `tickets.ts` and
  `effort.ts` import `slugRejection` from them directly. No duplicate was
  created, which is the property that mattered.

### Out-of-scope changes

- `SKILL_SCRIPTS_DIR` in `src/tools/skill-creator.ts` gained one `..`, because
  the module sits one directory deeper than the entry did. Six bundled-script
  tests fail without it. Path resolution only.
- The entry's header comment was rewritten: its old bullets ("One file, one
  extension", "All file I/O is in this file") were made false by the split.
- Two pins were strengthened beyond a straight rewrite: each call-site pin now
  resolves the module that defines the writer and requires the call sites inside
  that same module, and the root-index pin gained a call-site count
  (`writeTasksIndex(` at least three times) that the old pin never had. Stronger,
  not looser, but more than "rewrite the seven pins as corpus counts".
- Four new pins landed in a new describe, `the tool families
  (extract-tool-families)`, one of which adds `expect(names).toHaveLength(40)` on
  `createTools()`'s ungated key count. That is a third surface count beside
  `gate-factory`'s 41-name list and its gated-surface list.
- `src/tools/support.ts` is far wider than the architecture itemized. Besides the
  refusal text builder and `readArtifactTitle`, it holds the tool record's types
  (`Tool`, `ToolContext`, `ToolOutcome`, `ToolInfo`), the definition and argument
  helpers (`def`, `defStructured`, `Str`, `OptStr`, `OptBool`, `OptStrArray`),
  the artifact-tree plumbing (`findRoot`, `taskRoot`, `resolveArt`, `scanMemo`,
  `parseArtifactFile`, `readText`, `readYaml`, `isDir`, `isFile`, `isInside`,
  `relPosix`, `listSubdirs`, `directoryLeaf`, `liveEffortDir`, `isInitialized`,
  `loadState`, `saveState`, `requireV4Shape`, `clearReadyForSpec`,
  `normalizedBody`, `graphForPath`), and `sendWorkflowFeedback`. The implementer
  chose this over a ninth module, which the layout forbids. It is a defensible
  reading of "the helpers two or more families need", but it makes `support` the
  extension's real I/O layer, and the architecture's itemization should not be
  read as an inventory.
- No removals: nothing was deleted except the code that moved out of the entry.
  No new dependency, no gate change, no disclosure change, no bundled profile
  change. The `docs/tasks/CHANGELOG.md` entry is the close-out step, not an
  out-of-scope edit. `docs/tasks/state.yaml` carries the usual uncommitted
  one-line workflow pointer (`task: extract-tool-families`).

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

> Corrections to the notes above: the entry is 616 lines at HEAD, not 605 (the
> count was taken before the commit that documented the gate cycle and added the
> composition comment). The four new pins are 41 assertions, not "four pins" in
> the sense of four counts: one of them pins `Object.keys(createTools())` to
> exactly 40 keys and another asserts the entry contains no `def(` call, so
> `trim-the-entry` inherits both. A third pre-existing `--noUnusedLocals` hit
> exists beyond the two listed: `activeAfterClose`'s `closing` parameter in
> `src/tools/gates.ts` is unused, exactly as it was in the pre-move entry. The
> `blocked_by: shape-helpers-module` reason in this ticket ("the extracted
> families import the shape guards") turned out to be false: no family imports
> `text` or `isObject`, so that edge serialized the effort without buying
> anything.

### User attention needed?

**Yes**, on four counts, none of which change the tool's behaviour: the families
are named exports rather than the planned factories (so `trim-the-entry` needs a
conversion step its own wording does not mention), the entry now re-exports 34
tools it did not export before, `src/tools/gates.ts` imports the entry back (an
import cycle), and `support.ts` is much larger than the architecture itemized. The
tool surface, schemas, refusal texts, and disclosure sets are unchanged: the 40
moved bodies are textually identical to their pre-move bodies after whitespace
normalization, and the suite passes.

**Verification run for this report** (on `ticket/extract-tool-families`, HEAD
`73d55cb`, base `main` at `772ff31`): `npm run typecheck` clean,
`npm run typecheck:tests` clean, `npm test` 29 files / 1595 tests passed,
`npx vitest run tests/skills.test.ts` 623 tests passed. Independent checks: all 40
tool definition bodies compare equal to `git show main:src/pi.ts` after stripping
whitespace (0 differing, 0 missing, 0 extra); all 136 pre-move top-level
declarations exist exactly once across the new tree with 35 additions (the 34 tool
consts plus `gateTools`); the two pinned writers and their three call sites each
sit in `src/tools/effort.ts`; pre-move `src/pi.ts` exported only `createTools`,
`notifyConfigPath`, and the default function.
