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

## Implementation notes

- The architecture writer landed as `tw_write_architecture` in `src/pi.ts`
  with a `publish: true` parameter, mirroring `tw_write_spec`'s named
  stable write; the landed implementation gate refuses a non-stable
  architecture document, so the writer needed the flag.
- The writer carries an additive refusal family beyond the ticket doc's
  letter, each test-pinned: no spec present, a legacy effort-root
  `arch-spec.md` is accepted as input only (never written to), and a
  duplicate architecture document elsewhere is refused (one living
  architecture document per effort).
- The private signature tool rotated to `tw_write_architecture` as
  planned, but `tw_map_finalizable` stays in the to-tickets toolset as a
  disclosed read check: removing it would leave a registered tool
  disclosed by no phase toolset and fail the disclosure invariant.
- Bug-only handling is prose-level in the skill, not tool-enforced (a
  mid-creation tool check would be unsound); the landed implementation
  gate already exempts bug-only efforts.
- Slice 2's tests were green on arrival; they pin the update/publish path
  that slice 1's write path already carried.
- Downstream impact recorded for implement-ticket-skill (17) and
  docs-resync (20): teach the `publish: true` write, do not assume
  `tw_map_finalizable` is gone, treat the writer name as shipped surface.
- Full divergence detail: `deviation-reports/to-tickets-architecture.md`
  alongside this ticket doc.