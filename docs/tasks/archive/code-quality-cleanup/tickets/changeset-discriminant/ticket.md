---
type: ticket
subtype: feature
title: Give the changeset outcome a discriminant instead of an assertion
status: deprecated
workflow_state: done
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

## Implementation notes

### What landed

`Proposal` carries `kind: "proposal"` and `WriteOutcome` carries `kind: "write"`,
and every constructor of the two sets its literal: the proposal entry point, the
resolver's success return, the refusal builder, and both write returns. The tool
handler reads `resolved.kind === "write"` instead of asserting a type, and the
now-unused type import is gone.

The spelling follows what the codebase already does: `art.ts`, `git-profile.ts`,
and `migrate.ts` all name their discriminants `kind`, so the changeset outcome
does not introduce a second convention.

### Lessons

- The internal `ResolvedProposal` needed no field of its own: it extends
  `Proposal`, so it inherits the literal and the refusal path was covered
  without a second constructor change.
- Adding a required literal to a type with several constructors is safe only
  because the compiler points at each one. A default or an optional field would
  have left one constructor silently wrong.
