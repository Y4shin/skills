---
type: task
subtype: grilling
title: finalize-effort scope and follow-up mechanics
status: stable
workflow_state: done
blocked_by: []
---

# finalize-effort scope and follow-up mechanics

## Decision to settle

What `finalize-effort` owns, and what happens when its holistic review finds
problems.

## Parent decisions it depends on

None.

## Choices already known

- Whether `finalize-effort` absorbs the advisory whole-effort review currently
  inside `end-of-effort.js`, so exactly one holistic pass exists per effort.
- Whether `finalize-effort` owns the archive, taking Step 7 out of
  `finalize-task`.
- Follow-up effort: auto-create, or propose and require a human yes.
- How the link is recorded: an `origin_effort` frontmatter field, a
  `follow_up_of` edge, or a findings artifact referenced from the new map.

## Recommended starting answer

`finalize-effort` absorbs the whole-effort review and owns the archive; it is
read-only toward the code it reviews. Findings are written to an effort review
artifact and proposed as a follow-up effort, which is created only after a
human yes, linked by an `origin_effort` field plus the artifact. Trivial
in-scope items become ordinary follow-up tickets instead.

## Downstream work it may create

Schema fields, the plan-ticket pipeline that carries the review artifact, and
`finalize-task`'s narrowed scope.

## Settled decisions

### Q1 - Findings are triaged, and nothing archives with unresolved findings (settled)

- finalize-effort is read-only toward the code it reviews. It writes the
  review to an effort review artifact and triages every finding:
  - an in-scope finding becomes an implementation ticket in the current
    effort, which stays unarchived and returns to the frontier;
  - an out-of-scope or large finding becomes a proposed follow-up effort;
  - a purely informational finding stays in the review artifact.
- Human gate: when the review finds anything at all, finalize-effort engages
  the user before closing out the map. If the user judges the findings valid,
  the follow-up effort is created before the current effort is archived, so
  the knowledge is not left to rot in an artifact inside an archived effort
  where no skill will ever read it again.
- Archive precondition: an effort does not archive while a finding is
  undispositioned. Every finding must be either resolved into tickets, turned
  into a follow-up effort that the user accepted and that now exists, or
  explicitly accepted by the user as informational.
- Rejected: B, the pure closer, where every finding becomes a proposed
  follow-up and the effort archives regardless (a valid in-scope finding would
  spawn a whole effort for a small fix, and nothing makes the human look); C,
  auto-create without a human gate (effort sprawl).
- Downstream: the archive precondition is a gate, so its check lives in the
  finalize-effort tooling and its model belongs to
  `grill-gate-model-and-write-lockdown`; the finalize-effort sequence is review,
  then triage, then user engagement, then the tickets or follow-up effort,
  then archive.

### Q2 - `origin_effort`, and the review artifact moves with the follow-up (settled)

- The follow-up effort's `map.md` frontmatter carries
  `origin_effort: <slug>`. It is a field on the child, not a graph edge, so it
  never enters frontier or `blocked_by` semantics.
- The review artifact is moved, not copied, into the follow-up effort's
  directory, so the findings live where the skills that act on them look, and
  archiving the origin cannot strand them.
- The origin's review artifact still records the disposition, including the
  follow-up effort's slug, so the trail reads in both directions.
- Rejected: B, a `follow_up_of` edge with the artifact copied or referenced at
  its post-archive path (an edge implies graph semantics that do not apply
  across efforts, and referencing an archived path reintroduces the
  findability problem); C, no link at all (the only trace is prose pointing
  into an archive).
- Downstream: schema 5 gains the additive `origin_effort` map field;
  finalize-effort moves the review artifact as part of creating the follow-up
  effort.

## Remaining fog

- The effort review artifact's own name and location is a schema 5 detail,
  not settled here.
- Whether the holistic review runs as its own step in finalize-effort's
  tooling or reuses the existing `end-of-effort.js` review child is mechanical
  and belongs to the finalize-effort implementation tickets.
