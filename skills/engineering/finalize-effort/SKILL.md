---
name: finalize-effort
description: "The effort close: one holistic whole-effort review, a triage of every finding into an implementation ticket, an accepted follow-up effort, or an explicit informational acceptance, and the archive through the named archive tool. Read-only toward the code it reviews; a follow-up exists only after a human yes."
---

# Finalize Effort

Every message to the operator follows the `operator-communication`
skill: load it before your first message.

`finalize-effort` is the effort close. It runs one holistic review of the
whole effort, triages every finding, and archives the effort once nothing is
left to resolve. The review is read-only toward the code: this phase never
edits, refactors, or lands a change. Any work the review finds belongs to a
later ticket or a follow-up effort.

It is model-invoked, so the model reaches for it when an effort has nothing
left to build; the human can also run `/skill:finalize-effort
<effort-slug>`.

## Open first

Every run starts by opening the skill: call `tw_open` with
`{ skill: "finalize-effort", effort: "<effort-slug>" }` (the effort slug is
the directory name under `docs/tasks/`). The opener is the gate: it checks
the effort is live, refuses with the legal next calls when it is not, and
activates the toolset only when the check passes. Work only through the
tools the opener discloses, and close the phase with
`tw_close finalize-effort` when the run releases.

## Reconcile the living architecture first

Every end-of-effort reconcile runs before the last landing, so the design
record can be stale exactly where the close matters most. Before the review,
reconcile `architecture.md` against what actually landed: read the deviation
reports, the ticket notes, and the diff, and record the corrected document
through `tw_write_architecture` (this phase holds the writer). Correct the
sections that changed with `section: "<heading>"` rather than resending the
whole body; the whole-body form is for creating the document or a rewrite that
really does touch everything. This reconciles the record; it never fixes code.

Record the outcome when you write the review: `tw_write_review` takes a
`reconcile` argument, and `tw_archive_effort` refuses a finalize review
without one. The three legal shapes are `done: <what changed>`,
`none: <why nothing needed reconciling>`, and `unavailable: <reason>`. The
record is the only proof the step ran, so an omitted one is a close that
never reconciled.

On a schema-4 tree the v5 architecture writer refuses the legacy
`arch-spec.md`, so the reconcile is unavailable until the repo migrates.
Record it as `unavailable: <the migration is the prerequisite>` and treat the
stale legacy document as a recorded gap rather than rewriting it by hand.

## One holistic review pass

Read the effort as a whole, not one ticket at a time: the map, the
specification, the architecture document, the tickets and their
implementation notes, the changelog, and the diff of everything the effort
changed.

Review two levels:

- **the effort's claim:** do the map's success test and non-goals still
  describe what the effort delivered?
- **the delivered code:** correctness, fit with the architecture document,
  duplicated or drifted helpers, missing tests, and anything a later reader
  would trip over.

Write the findings through `tw_write_review`, the only writer of
`docs/tasks/<effort>/review.md`. It writes `type: review` and the flag the
archive reads. The first pass carries the findings without dispositions, so
the flag stays closed; the triage rewrites the artifact as dispositions are
recorded.

The review never fixes what it finds. An in-scope finding becomes an
implementation ticket, and this phase does not implement it.

## Triage every finding

Every finding gets exactly one disposition, and the triage rewrites the
review artifact each pass with `tw_write_review` and its `findings`
argument:

1. **In scope** becomes an implementation ticket in the current effort,
   created with `tw_add_ticket`. The effort stays live and returns to the
   implementation frontier; it is not archived.
2. **Out of scope or too large** becomes a proposed follow-up effort. Stop
   and ask the human; the follow-up exists only after an explicit yes. When
   the human says yes, create it with `tw_create_effort` and pass
   `origin_effort: "<this-effort-slug>"`, so the child's map records where
   it came from. The link is a field on the child, never a graph edge: it
   does not enter the frontier or `blocked_by`.
3. **Purely informational** stays in the review artifact, recorded as
   accepted by the human.

Two kinds of finding are informational by construction, and neither becomes
a ticket:

- **A finding whose fix lives under `docs/tasks/`.** The map, the spec, and
  the planning tasks are planning-owned artifacts: the implementation phase
  has no writer for them: the write lockdown refuses the built-in tools, and
  the implementation toolset exposes no map or spec writer. Ticketing
  such a finding creates work the chain physically cannot do, and the only
  way out is a shell write the workflow forbids. Record it in the review with
  the file and line, and let a later effort that re-plans that area carry it.
  The living record of what was built is the architecture document, which the
  end-of-effort pass already reconciles.
- **A documentary finding whose subject is already true in code and tests.**
  Stale wording, an unticked acceptance box, a glossary entry that lags the
  chosen name, a testing-protocol sentence that overstates what the suite
  asserts: once the behavior and its tests agree, rewriting prose does not
  change what the tool does. Record it and archive. Without this rule the
  advisory review and the finalize review feed each other new doc findings
  every pass and the effort never converges, which is what a rehearsal run
  hit three times in a row.

Everything else is judged on its merits: a finding that changes what the code
does, or that would mislead the next person to act on the effort's record,
gets a ticket or a follow-up.

The writer sets the archive flag only when every finding in the `findings`
list carries a disposition. Until then the effort stays live, which is the
point: a review finding is never stranded in an archive nobody reads again.

## The accepted follow-up

When the human accepts a follow-up and the child effort exists, call
`tw_write_review` again with `follow_up: "<follow-up-slug>"`. The findings
move into the child's `review.md` (one copy, not two), so they live where
the skills that act on them look. This effort's review artifact keeps the
disposition record naming the follow-up slug, so the trail reads in both
directions. The write marks this effort's review triaged, which releases
the archive.

A follow-up is never created on the model's own initiative, and never
before the human says yes.

## Archive

Archive through `tw_archive_effort`, the named archive move; never use
`git mv` or a shell command for it. The tool refuses while any finding in
the review artifact still lacks a disposition, naming the artifact, so
complete the triage instead of working around the refusal. Once the
dispositions are recorded, it deprecates the finished items, moves
`docs/tasks/<effort>/` to `docs/tasks/archive/<effort>/` as a unit, and
updates the root index.

## Step order

1. Open the phase with `tw_open`.
2. Run the holistic review and write it with `tw_write_review`.
3. Triage every finding; ask the human about anything out of scope or too
   large.
4. Create accepted follow-ups with `origin_effort`, then move the findings
   with `tw_write_review` and `follow_up`.
5. Archive with `tw_archive_effort`. The tool deprecates the finished items,
   moves `docs/tasks/<effort>/` to `docs/tasks/archive/<effort>/` as a unit,
   updates the root index, and clears the state file's `map` pointer when it
   named the archived effort. Commit the move, because the tool writes the
   tree and git makes it history:
   `git add docs/tasks/ && git commit -m "chore: archive <effort>"`. A close
   that leaves the archive uncommitted hands the next phase a dirty tree.
6. Close the phase with `tw_close finalize-effort` and write the report.

## Report

End the run with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.

Keep the report in the operator's terms. Three checks it must pass:

- Every term you coined or read during this run is defined in the sentence
  that first uses it, or it is left out.
- The first sentence gives the state of the work now.
- Nothing is labelled before it is explained: no heading, bold lead-in, or
  bullet label names something the operator has not already seen.

> **Feedback:** if the phase hits a snag (an archive refusal the triage could
> not clear, a review write the tool could not express, or something that
> worked notably well), call `tw_feedback({ kind, data })` autonomously to
> record it. `kind` is one of `good`, `bad`, `friction`, `architecture`;
> `data` is one or two specific, actionable sentences about the *workflow*,
> not the project work. Requires the `pi-telemetry` extension.
