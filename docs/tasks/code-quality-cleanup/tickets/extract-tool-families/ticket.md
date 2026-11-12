---
type: ticket
subtype: feature
title: Extract the tool families into their own modules, entry still re-exporting
status: stable
workflow_state: done
blocked_by:
- shape-helpers-module
size: l
---

## What to build

The 41 tools the extension registers stop living in one 4501-line file. Each
tool definition moves into the family module it belongs to: artifacts, effort,
tickets, gates, release, feedback, and the bundled-script wrappers, with one
support module for the helpers two or more families need.

This ticket does the extraction, not the trim. The entry file keeps thin
re-exports so that every import path the suite already uses still resolves, and
so the whole suite stays green at the end of it. Nothing about the tools changes:
the same names, the same argument schemas, the same refusal texts, the same
disclosure sets.

Two boundaries are not free choices. The seven source-text pins in the suite read
the entry file as one string and count definitions and call sites, and two of them
count call sites. So the effort-root writer travels with the specification and
architecture writers that call it, and the root-index writer travels with both the
effort creation and the effort archive paths. Those pins are rewritten as counts
over the whole source corpus in this ticket, so they keep guarding against a
second copy without naming one file.

## Acceptance criteria

- [ ] Every tool definition and every helper private to one family lives in that
      family's module; the entry holds thin re-exports only.
- [ ] The entry still exports its default extension entry point, the tool
      factory, and the configuration-path helper, at the path the manifest names.
- [ ] The seven source-text pins become corpus-wide counts that still fail when a
      duplicate definition appears anywhere in the source tree.
- [ ] The tool surface pins, the disclosure sets, and every refusal text pass
      unchanged: 41 names, same schemas, same wording.
- [ ] No tool definition is edited while it moves, other than the import lines its
      new home requires.
- [ ] Both typechecks are clean and the whole suite is green.

## Blocked by

- `shape-helpers-module`: the extracted families import the shape guards from
  their one home, so it lands first.


## Implementation notes

### What landed

The tool record is eight modules under `src/tools/`: `artifacts` (the read-only
inspectors and the context reader), `effort` (creation and archiving, the
planning-task creator, the map writers, and the spec, architecture, and review
writers), `tickets`, `gates`, `release`, `feedback`, `skill-creator`, and one
`support` module. Every definition and every helper is in exactly one of them:
the whole source corpus now holds 136 top-level declarations, each once.

The two shared writers travel with their callers, as the pins require. The
effort-root writer sits in `effort` beside `tw_write_spec`,
`tw_write_architecture`, and the root-index writer sits there too, beside
`tw_create_effort` and `tw_archive_effort`. The entry is 605 lines: the manifest
sanity check, the skill-invocation and prompt-strip handlers, the tool factory
with its 34 named exports and the gate family's spread, the re-export block, the
write lockdown, the spawn guard, the transcript replay, the configuration path,
the registration name lists, `notify_user`, and the extension entry point.

The seven pins in `tests/skills.test.ts` count over the source corpus through
`SOURCE_CORPUS` / `countInSource` / `sourceFilesWith`, built on the existing
`corpusFiles` walk. The two call-site pins got stronger while they moved: each
now resolves the module that holds the writer definition and requires the call
sites inside that same module, which is what the original single-file counts
were standing in for.

### How it was verified

- The 40 moved tool definitions were compared line by line against their
  pre-move bodies in `git show HEAD~1:src/pi.ts`. Ignoring indentation and the
  `export const <name>: Tool =` wrapper, all 40 are byte-identical, so nothing
  was edited while it moved.
- Every one of the 136 pre-move top-level declarations exists exactly once in
  the new source tree.
- The new structural pins were run against the un-split source first and failed
  (the family modules did not exist, and the entry defined 40 tools), so they are
  red-first rather than written to fit.
- A duplicate `writeTasksIndex` was dropped into a throwaway source file and the
  root-index pin failed with `expected 2 to be 1`, which is the property the
  corpus counts exist for. The probe file was removed.
- `npm test` (1595 tests), `npm run typecheck`, and `npm run typecheck:tests`
  are green.

### Divergences and judgement calls

- **The support module is wider than the architecture document's list.** The
  document names the refusal text builders and the artifact-title and slug
  helpers. The module also holds the tool record's types, the
  `def`/`defStructured`/argument helpers, and the artifact-tree plumbing (the
  root walk, the resolver, the scan memo, the state readers, and the
  v3-shape and ready-flag guards), because every family builds its tools with
  them and reads the tree through them. The alternative was a ninth module,
  which the layout forbids.
- **The gate family is a factory, not a record constant.** `tw_open`'s parameter
  schema narrows to the openable skills when the repository is gated, so
  `gateTools(gated)` builds that family per gate state and the entry spreads it.
  The other 34 tools are named exports this ticket, which is the list
  `trim-the-entry` replaces with the family factories.
- **One import points back at the entry.** `tw_request_tool` refuses a tool this
  package does not register, through `workflowToolNames()`, which reads
  `createTools()`. Since no tool may be edited while it moves, the gate family
  imports the factory from `../pi.js`: the tree's only cycle, safe because the
  binding is a function declaration read at call time. `trim-the-entry` is the
  place to revisit it if the composition changes shape.
- **`SKILL_SCRIPTS_DIR` gained one `..`**, because the module sits one directory
  deeper than the entry did. That is path resolution only.
- **The entry's header comment changed.** Its old bullets ("One file, one
  extension", "All file I/O is in this file") were made false by the split.
- The unused `Bool` argument helper stayed in `support` and was dead before the
  move too; deleting an unused export is not this ticket's scope.
