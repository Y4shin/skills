---
type: deviation report
title: Deviation report for implementation-transition-tools
status: stable
---

## Deviation report: implementation-transition-tools

### API surface changes
- **Planned:** the arch spec's entry 7 exports `tw_write_spec`, `tw_add_ticket`,
  `tw_split_ticket`, ticket `tw_mark_done`, "the changelog writer",
  `tw_record_out_of_scope`, and "the archive move". The ticket doc adds: every
  writer carries its own preconditions, writes through the frontmatter seam,
  `ready_for_spec` is untouched except where a ticket write is also a plan
  change, and no workflow write is left without a named tool.
- **Actual:** seven named tools landed in `src/pi.ts` exactly as planned, plus
  two names the ticket left open: the changelog writer is `tw_write_changelog`
  and the archive move is `tw_archive_effort`, following the existing
  `tw_<verb>_<object>` family. A third addition beyond the spec's list,
  `tw_mark_blocked`, restores the arch spec's named interim gap (marking a
  planning task blocked), which entry 7 explicitly assigns to this ticket.
  The changelog guard now pins `docs/tasks/CHANGELOG.md` as refused for the
  built-in `write`/`edit`, making the changelog writer provably the only
  writer of it. All seven are registered `exposure: "direct"` with
  `defaultActive: false` (gated registration, consistent with the landed
  disclosure core), and the disclosure registry's per-skill private
  signature-tool invariant is untouched.
- **Impact:** the two open names are what downstream prose-writing tickets
  (10-14, 16-19) must call; the tools are registered but not yet in any
  toolset, which is correct: `opener-gate-and-toolsets` (ticket 9) owns the
  phase-to-toolset table that discloses them. No toolset membership exists for
  them yet, so `tw_open` still works for the provisional sets.

### Abstraction usage
- Used/was specified: yes. Every write goes through the frontmatter seam
  (`src/core/frontmatter.ts` `parse`/`dump`); finalizability comes from
  `effortFinalizable`/`effortGraphs` (`src/core/graph.ts`), not a re-check;
  artifact resolution uses `fromFrontmatter`/`validateArtifact` shapes via the
  landed `resolveArt` helpers; the v3-shape refusals reuse the planning
  writers' `requireV4Shape`; the archive move is `renameSync` with no `git mv`
  and no shell; the split's supersession matches the failure toolbelt's
  deprecated-plus-done convention. No parallel versions were invented.

### Out-of-scope changes
- `tw_add_ticket` validates `blocked_by` edges at creation (kind-scoped, same
  effort, no dangling). This deliberately removes the settled to-tickets
  "second wiring pass" (edit frontmatter after all slugs exist): the landed
  write guard refuses hand edits, so the second pass has no legal mechanism
  anymore. Downstream `to-tickets-architecture` and `implement-ticket-skill`
  must teach creation-order wiring instead. This is an interface-contract
  change worth carrying into the spec's entries 11 and 17.
- `ready_for_spec` is untouched by every writer here: the ticket's "except
  where a ticket write is also a plan change" resolves vacuously because
  ticket done-markings, splits, and spec writes are not plan changes; blocking
  a planning task is not done-ness and does not change the frontier. The
  planning half's auto-clear behavior (task added/reopened/un-done, map
  edits) is unchanged.
- The interim "planning half refuses tickets" test was replaced by the ticket
  half's contract (this ticket owns that surface change per the arch spec;
  the planning half's own tests are untouched).
- No removals. `tw_resolve_uncertainty` and `tw_state_set` are untouched and
  their tests pass unchanged.
- The architecture writer is deliberately absent: the arch spec gives
  `architecture.md` to `to-tickets-architecture` (ticket 11) and the review
  writer to `finalize-effort-skill` (ticket 18). Those writes still fail
  closed under the write guard until their owning tickets land; that is the
  recorded interim posture.

### Ticket doc update needed?
Yes: append to `## Implementation notes` that the two open names are
`tw_write_changelog` and `tw_archive_effort` (plus `tw_mark_blocked` for the
named blocked marking), that `tw_add_ticket` validates edges at creation so
the by-hand second wiring pass is retired, and that the changelog path is now
guarded for the built-ins. The land-worker owns that append.

### User attention needed?
No. The names are the natural family reading; the second-pass retirement is a
consequence of the already-landed write guard, and both the spec's exports and
the ticket's criteria are met. The surface changed only in the direction the
spec already planned.
