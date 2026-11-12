---
type: ticket
subtype: feature
title: Trim the entry to the wiring and the composition
status: deprecated
workflow_state: done
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

## Implementation notes

### What landed

The entry is 578 lines: the extension entry point, the two `tool_call` handlers,
the transcript and skill handlers, the notification tool, the two registration
name lists, and one composition. The six remaining families became factories, so
`createTools()` is seven spreads and nothing else, and the 34 re-exports are gone.
The entry exports exactly the three names it exported before the effort.

The tool surface is the same 40 keys plus the notification tool. Registration
order is now family-grouped, which differs from the old interleaved order in 18 of
40 positions; nothing pins order, every surface assertion sorts, and tools resolve
by name.

### Divergences carried into the record

1. The six families were named constants at the end of the previous ticket and are
   factories now. The conversion was the ticket's means of reaching its criterion,
   and the previous ticket's deviation report had already flagged that its wording
   did not cover it.
2. The family modules carry a whitespace-only diff from the conversion.
3. `src/tools/gates.ts` still imports the entry. That cycle predates this effort
   and is unchanged.

### Lessons

- Keeping every import resolving during a move creates named exports; reaching the
  promised shape then costs a second pass. Splitting the move from the trim was
  the right call, and the second pass was still smaller than doing both at once
  would have been.
- A composition made of spreads makes the entry's size a function of the family
  count, which is the property the effort wanted.
