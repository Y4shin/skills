---
type: ticket
subtype: feature
title: to-tickets produces the architecture document and the ticket graph
status: stable
workflow_state: ready
blocked_by: [implementation-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets]
size: m
---

## What to build

`to-tickets` gains the architecture document as a first-class output. It
produces the architecture alongside the ticket graph: it consumes the
architecture content already recorded in `spec.md`, inlines it in full, then
adds per-ticket exports, existing abstractions to use, do-not-reimplement
notes, seams, and the interface contracts between tickets.

The architecture becomes the living document. Once it exists, the
specification's architecture content is archival, and a note is added to
`spec.md` pointing at the architecture. Nothing is deleted from the
specification.

Bug-only efforts have no architecture document: `spec.md` is always present,
and the architecture exists exactly when the ticket graph needs interface
contracts. The skill reads the spec and writes the architecture and every
ticket through the named transition tools, and it opens through `tw_open`.

## Acceptance criteria

- [ ] `to-tickets` produces the architecture document plus the ticket graph
      from a spec.
- [ ] The architecture inlines the spec's architecture content in full and
      adds exports, existing abstractions, do-not-reimplement, seams, and
      per-ticket interface contracts.
- [ ] A note pointing at the architecture is added to `spec.md`; nothing is
      deleted.
- [ ] A bug-only effort produces tickets with no architecture document.
- [ ] All writes go through the named transition tools; the skill opens
      through `tw_open`.
- [ ] `tests/skills.test.ts` is green.

## Blocked by

- implementation-transition-tools (`tw_add_ticket` and the spec/architecture
  writers are the tools this skill calls).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the to-tickets gate and toolset).