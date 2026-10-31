---
type: deviation report
title: Deviation report for opener-gate-and-toolsets
status: stable
---

## Deviation report: opener-gate-and-toolsets

### API surface changes
- **Planned:** the arch spec's entry 9 contract plus the ticket doc's seven
  refusals, with the finalize-effort undispositioned-findings gate implied
  by the ticket doc's acceptance bullet ("finalize-effort refuses while a
  finding is undispositioned") to live in the opener.
- **Actual:** all seven refusals and the two phase-specific openers landed
  as planned. Two contract-level differences:
  1. **The undispositioned-findings gate lives in `tw_archive_effort`, not
     in the finalize-effort opener.** The arch spec itself fixes this
     location ("this archive precondition is a gate, so it lives in the
     finalize-effort tooling"), so this is the spec's own contract, not a
     drift from it; the ticket doc's bullet is satisfied by the archive-time
     gate. Rationale recorded in the TDD report: an opener-level check would
     deadlock recovery, because after an interrupted run the triage tools
     (`tw_add_ticket`, the review writer) are gated or guard-blocked while
     the toolset is closed, so a refused reopen could never complete the
     triage. With the gate in the archive tool, a refused archive still has
     the triage tools declared.
  2. **Missing target is a returned refusal, not a thrown validation
     error.** `tests/disclosure.test.ts` was updated to the new contract;
     the discriminated union schema still declares `target` required for
     implement-ticket (ticket 8's landed shape, unchanged), so a
     schema-enforcing host rejects a targetless call before execute; the
     runtime backstop returns the refusal.
- **Impact:** ticket 18 (`finalize-effort-skill`) must land its review
  writer to set the `dispositioned: true` flag the archive gate reads; the
  gate is one filter clause in `tw_archive_effort`, so if ticket 18 shapes
  the review artifact differently the coherence pass adjusts the read. No
  other downstream contract changes shape.

### Abstraction usage
- Used/was specified: **yes.** The gate reads the scan seam (`scanMemo` +
  `scanArtifacts`) and the pure `art.ts`/`graph.ts` layers
  (`effortGraphs`, `graphForEffortDir`); the registry stays in
  `src/disclosure.ts` and the evaluator in `src/pi.ts`; no frontier, level,
  or finalizability logic was reimplemented; frontmatter reads go through
  `parseArtifactFile`/`fromFrontmatter`.

### Out-of-scope changes
- Foreign tests updated where the real registry table demands it
  (`tests/disclosure.test.ts`, `tests/integration/disclosure.test.ts`,
  `tests/integration/session.test.ts`, `tests/integration/harness.ts`): the
  fixture trees gained the v4-shaped effort the gates need, the
  `tw_dependency_levels` disclosure moved to to-tickets, and the
  uninitialized-tree list test moved to setup-workflow. Every change
  follows from the ticket-owned table and gate; none forced a test green.
- The registry carries two deliberate interim assignments recorded in
  code comments and the TDD report, both owned by later tickets: to-tickets'
  private signature tool stays `tw_map_finalizable` until ticket 11 lands
  the architecture writer and rotates it; intake's toolset discloses only
  what exists until tickets 10 and 15 land the creation tools.
- `tw_mark_blocked` is disclosed to implement-ticket per the arch spec's
  entry-17 landed note, but the landed tool refuses tickets
  (planning-only scope); ticket 17 must widen the scope if its prose has
  implement-ticket block tickets.
- One new em-dash was caught by the repo rule and rewritten; two
  pre-existing em-dashes in test file headers were left (not introduced
  here).

### Ticket doc update needed?
Yes, at landing: a one-paragraph implementation note recording the findings
gate location (archive tool, not opener, per the spec's location contract
plus the deadlock argument), the `dispositioned` flag as the interface
ticket 18's review writer sets, the two interim registry assignments, and
the missing-target refusal shape. The land-worker appends the note; no
frontmatter change is needed.

### User attention needed?
No. No API surface differs from the spec's own contract; both divergences
resolve to the spec's text (the findings gate location is the spec's, and
the missing-target refusal is the ticket doc's own list). The carried
forward items above are downstream obligations already named in the spec's
entry 18 (review writer) and entry 11 (architecture writer), not planning
failures.
