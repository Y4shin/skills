---
type: deviation report
title: Deviation report for planning-transition-tools
status: stable
---

## Deviation report: planning-transition-tools

### API surface changes
- **Planned:** Remove `tw_set`; add `tw_write_section` (writer of `## Non-goals`
  and `## Non-negotiable facts`, the only map-body writer), `tw_finalize_map`
  (checking tool, sole setter of `ready_for_spec`, sets it last), and the
  planning half of `tw_mark_done` with a write-back precondition. Preconditions
  read the tree through `art.ts`/`graph.ts`.
- **Actual:** All of the planned surface exists as specified. Three
  refinements beyond the letter of the ticket:
  1. `tw_write_section` is general over section names (it can create any named
     `##` section), not restricted to the two schema-5 sections. The ticket
     names both roles in one sentence: writer of the two sections and "the only
     way a skill updates the map body". The settled Q2 amendment requires
     write-backs to land short statements plus pointers in
     `## Decisions so far`, which only a general section writer can do.
  2. The `tw_mark_done` write-back precondition is implemented as a
     slug-reference check: the effort map's body must reference the task slug
     as a stand-alone token. This fixes the write-back pointer convention;
     `wayfinder`'s resources (ticket 10) must instruct the pointer in that
     shape or `tw_mark_done` refuses.
  3. Planning `tw_mark_done` clears a set `ready_for_spec` on the map. The Q5
     auto-clear list does not name done-markings, but the acceptance criterion
     "every writer that can change the plan clears the flag" and the
     blocked-by-cycle corner (frontier empty with unfinished tasks) argue for
     the clear; it can only force one more reconcile pass, never allow a skip.
  Additional behavior: all three v5 writers refuse v3-shape artifacts (new
  producers write v5 only; bolting v5 fields onto a v3 file would create a
  hybrid). The finalize frontier is the task kind's ready edge, so an
  unfinished ticket does not block finalizing the map.
- **Impact:** Low and mostly positive for dependent tickets.
  - `wayfinder-reconcile-and-passes` (ticket 10): must instruct the write-back
    pointer in the slug-reference shape and use the general section writer for
    `## Decisions so far`.
  - `implementation-transition-tools` (ticket 7): owns the ticket half of
    `tw_mark_done` (this ticket's version refuses tickets with a message
    naming the planning half's scope) and the remaining writers.
  - `opener-gate-and-toolsets` (ticket 9): the to-spec toolset entry is
    provisional; it already swapped `tw_set` for the new writers in the same
    commit as the removal (`3c6b2ef`), so `signatureToolOf` derives exactly and
    no `tw_open` breaks in the interim.
  - Interim named-writer gaps (until ticket 7 lands): no tool marks a TICKET
    done, sets spec `status: stable`, sets archive deprecation, or marks a
    planning task blocked. Affected skill prose states outcomes without
    tool-call syntax and fails closed in the meantime.

### Abstraction usage
- Used/was specified: yes. `resolveArt`, `scanMemo`, `effortGraphs`,
  `effortFrontier`, `readMapSection`, `graphForPath`, `parse`/`dump` via the
  frontmatter seam, and a new pure `writeMapSection` in `src/core/art.ts` as
  the writer side of the existing `readMapSection` seam. `tw_set` was removed
  from `src/pi.ts` only; no fork of the tool layer.

### Out-of-scope changes
- The to-spec registry entry swap in `src/disclosure.ts` (not in the ticket
  text, but required by the carried constraint from the disclosure deviation
  report: the registry needs a private signature tool per skill; `tw_set` was
  to-spec's only one). Done in the same commit as the removal so every
  `tw_open` stays correct.
- Test-suite rewrites forced by the removal: `tw_set` test blocks deleted or
  rewritten, skills-prose assertions now pin `tw_mark_done` plus
  `tw_write_section` and the absence of `tw_set`, disclosure lists swapped dead
  names for live ones.
- Skill-prose edits in `finalize-task`, `to-spec`, and the four
  `implement-task/resources/*.md` removing `tw_set`-era tool syntax and
  stating outcomes without naming tools that do not exist yet (interim
  fail-closed posture, owned back by later tickets).

### Ticket doc update needed?
Yes: append to `## Implementation notes` the three refinements above (general
section writer, slug-reference write-back convention, done-marking clears the
flag), the v3-shape refusals, and the interim named-writer gaps that tickets 7
through 10 restore.

### User attention needed?
No. The scope did not change: every planned capability exists, the surface is
narrower where it is stricter (v3 refusals) and slightly wider where the
settled Q2 amendment requires it (general section writer). The two decisions a
later ticket must honor (slug-reference pointer convention, done-marking
flag-clear) are recorded here and in the ticket doc.
