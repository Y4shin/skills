---
type: ticket
subtype: feature
title: finalize-effort runs the holistic review, triages findings, and archives
status: stable
workflow_state: ready
blocked_by: [implementation-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets]
size: l
---

## What to build

`finalize-effort`, the model-invoked skill that absorbs the whole-effort
review and owns the archive. It is read-only toward the code it reviews and
runs one holistic pass per effort, so there is no second advisory review.

It triages every finding:

- an in-scope finding becomes an implementation ticket in the current effort,
  which stays unarchived and returns to the frontier;
- an out-of-scope or large finding becomes a proposed follow-up effort;
- a purely informational finding stays in the review artifact.

A follow-up effort is created only after a human yes. It is linked by an
additive `origin_effort` field on its map frontmatter, a field on the child,
not a graph edge, so it never enters frontier or `blocked_by` semantics. The
review artifact is moved, not copied, into the follow-up effort's directory.
The origin's review artifact still records the disposition, including the
follow-up effort's slug, so the trail reads in both directions.

An effort does not archive while a finding is undispositioned: every finding
must be resolved into tickets, turned into a follow-up effort the user
accepted and that now exists, or explicitly accepted by the user as
informational. This archive precondition is a gate, so it lives in the
finalize-effort tooling.

The skill writes the review artifact at the effort root as `type: review`,
moves it when a follow-up is accepted, and performs the archive move through
the named archive tool.

## Acceptance criteria

- [ ] `finalize-effort` exists as a model-invoked skill and opens through
      `tw_open`.
- [ ] It runs one holistic review pass and is read-only toward the code.
- [ ] Every finding is dispositioned into a ticket, an accepted follow-up, or
      an explicit informational acceptance.
- [ ] A follow-up is created only after a human yes, linked by
      `origin_effort`, with the review artifact moved into it.
- [ ] The effort does not archive while a finding is undispositioned, and the
      precondition lives in the tooling.
- [ ] The archive move uses the named tool, not the shell.
- [ ] `tests/skills.test.ts` is green.

## Blocked by

- implementation-transition-tools (ticket creation, the review artifact
  write, and the archive move).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the finalize-effort gate).