---
type: ticket
subtype: bug
title: Validate advisory review disposition targets
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

Close the integrity gap whole-effort review finding F3 describes.
`tw_write_review`'s finalize branch validates every disposition target against
the tree: a `ticket` disposition must name a ticket this effort already has and
a `follow-up` disposition must name a live effort stamped `origin_effort`
(`src/pi.ts:1979-1992`). The advisory branch, which is where the finalize triage
records its dispositions of the end-of-effort findings, runs no such check
(`src/pi.ts:1947`). A typo or an invented slug records "ticketed to X" for a
ticket that does not exist, and because `tw_archive_effort` deliberately skips
`pass: end-of-effort` artifacts, the effort still archives with a dangling
pointer and the finding is silently stranded.

Extract the target validation the finalize branch performs into one helper and
run it for both passes, keeping the advisory pass's existing restrictions (it
still refuses `follow_up`, and it still never sets a follow-up target).

## Acceptance criteria

- [ ] `tw_write_review` with `pass: "end-of-effort"` refuses a `ticket`
      disposition whose target is not an existing ticket in the effort, and
      refuses a `ticket` disposition whose target names another effort's ticket.
- [ ] The same refusal already covered by the finalize pass keeps its message
      and its test.
- [ ] `tests/lifecycle-hardening.test.ts` gains a case for the advisory pass
      refusal, and the existing advisory-pass cases stay green.
- [ ] Both typechecks and `npx vitest run` are green.
