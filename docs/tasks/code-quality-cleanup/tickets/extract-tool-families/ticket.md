---
type: ticket
subtype: feature
title: Extract the tool families into their own modules, entry still re-exporting
status: stable
workflow_state: ready
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
