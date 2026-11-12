---
type: ticket
subtype: feature
title: Give the changeset outcome a discriminant instead of an assertion
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

The changeset writer's two outcomes stop being told apart by a type assertion at
the call site and start carrying a discriminant of their own. A caller that gets
a proposal cannot read the written files, and the compiler says so instead of the
runtime.

Today the tool handler resolves one of two shapes depending on whether the call
is a dry run, then reads the write-only field through an assertion. After this
ticket, the outcome type names which one it is, the handler narrows on that name,
and the assertion is gone. Every field the two outcomes carry today stays, so the
existing changeset assertions keep their subjects and the tool's texts are
unchanged.

## Acceptance criteria

- [ ] The proposal outcome and the write outcome are distinguishable by a field
      on the returned type, not by the caller's assumption.
- [ ] The tool handler narrows on that field and holds no type assertion for it.
- [ ] Every existing outcome field and every printed line is unchanged.
- [ ] A test reads the narrowing field, so a caller that branches the wrong way
      fails to compile.
- [ ] Both typechecks are clean and the whole suite is green.

## Blocked by

None (can start immediately).
