---
type: ticket
subtype: feature
title: Trim the entry to the wiring and the composition
status: stable
workflow_state: ready
blocked_by:
- extract-tool-families
size: m
---

## What to build

The extension's entry file becomes the entry and the composition, and nothing
else. The thin re-exports the previous ticket left behind are deleted, the family
factories are imported and spread into the single tool record that
`createTools()` returns, and the file that results holds the extension entry
point, the two tool-call handlers, the notification tool, the registration name
lists, and the composition.

A reader who opens the entry now sees how the extension is wired, and a reader who
wants one tool family opens that family's module. The tool record itself is the
same record it was before the effort: the same 41 names in the same shape, with
the same schemas, refusal texts, and disclosure sets.

## Acceptance criteria

- [ ] The entry imports the family factories and composes them in one record;
      it defines no tool and no family-private helper.
- [ ] The entry still holds the extension entry point, the two tool-call
      handlers, the notification tool, and the registration name lists, and
      still exports the same three names at the same path.
- [ ] No re-export shim survives anywhere for a tool definition.
- [ ] The tool surface pins, the disclosure sets, the argument schemas, and the
      refusal texts all pass unchanged.
- [ ] Both typechecks are clean and the whole suite is green.
- [ ] The file's size is consistent with holding the wiring alone; the exact
      count is not a criterion.

## Blocked by

- `extract-tool-families`: the families must exist as modules before the entry
  can compose them.
