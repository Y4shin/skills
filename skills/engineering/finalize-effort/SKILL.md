---
name: finalize-effort
description: "The effort close: one holistic whole-effort review, a triage of every finding into an implementation ticket, an accepted follow-up effort, or an explicit informational acceptance, and the archive through the named archive tool. Read-only toward the code it reviews; a follow-up exists only after a human yes."
---

# Finalize Effort

Every message to the operator follows the `operator-communication`
skill: load it before your first message.

If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.

`finalize-effort` is the effort close. It runs one holistic review of the
whole effort, triages every finding, and archives the effort once nothing is
left to resolve. The review is read-only toward the code: this phase never
edits, refactors, or lands a change it found. Any work the review finds belongs
to a later ticket or a follow-up effort. The one git operation the close does
perform is landing the finished effort branch, once everything else is done.

It is model-invoked, so the model reaches for it when an effort has nothing
left to build; the human can also run `/skill:finalize-effort
<effort-slug>`.

## Open first

This phase's first action is its branch step, and the branch step comes from the
profile rather than from this file. Call `tw_phase_brief` with
`{ skill: "finalize-effort", effort: "<effort-slug>" }`: it reports the branch
this phase must be on, the step that creates it off the trunk when it does not
exist yet, the trunk it lands into, the profile's merge flag and push policy,
the push step that policy renders, and the trunk-merge mode. Perform the step it
reports, then open.

Every run starts by opening the skill: call `tw_open` with
`{ skill: "finalize-effort", effort: "<effort-slug>" }` (the effort slug is
the directory name under `docs/tasks/`). The opener is the gate: it checks
the effort is live, refuses with the legal next calls when it is not, and
refuses a checkout that is not on the branch the brief reported, naming the
current branch, the required branch, and the step that creates it. Nothing
latches: perform that step and retry, and the open passes. It activates the
toolset only when the check passes. Work only through the tools the opener discloses. When a step genuinely needs
a tool this phase does not disclose, call `tw_request_tool` and let the
operator decide: never close the phase early to reopen another one for its
tools. Close the phase with `tw_close finalize-effort`, naming the effort it
closes: `{ skill: "finalize-effort", effort: "<effort-slug>" }`. The close reads
the same profile row the open did, and a row that carries a closing gate refuses
to close from any other checkout, naming the branch to check out. The bundled
`default` carries no closing gate here, because the local landing has already
moved the checkout onto the trunk and deleted the effort branch by the time this
phase closes, so a gate on the effort branch could never pass.

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

## Author the changesets

The effort's changesets are what a user of the package or product can
observe: one entry per observable change, naming the workspace package, the
bump level, and the summary that becomes the entry body. Refactors, tests,
and internal docs are not changesets. An effort with nothing observable gets
the generic performance and stability patch instead, and an identical entry
that is already staged is not repeated.

The human confirms the entries, so the proposal comes first and the write
second:

1. Call `tw_write_changesets` with `effort`, the proposed `entries`, and
   `dry_run: true`. It writes nothing and answers with the entries it would
   write, the entries it would skip as already staged, and whether the
   generic entry applies.
2. Show that answer in the close-out report, entries verbatim, so the human
   confirms the exact entries and not a description of them.
3. Call `tw_write_changesets` again with the same arguments and no
   `dry_run`, only after the human confirms. It writes one file per entry
   under `.changeset/` and reports what landed and what was skipped.

A refusal names its reason and writes nothing: no `.changeset/config.json`,
a package that is not in the workspace, a level that is not patch, minor, or
major, or a staged changeset file the reader cannot parse. Fix or remove
what the refusal names and retry. The unparseable-file refusal exists so the
dedupe is never blind: a writer that guessed would stage a second copy of an
entry the tree already holds, and the package would be versioned twice for
one change.

## Land the effort branch

Once the archive commit lands, the effort branch is finished and the profile
says how it lands. Every name and every decision in this step comes from this
phase's brief, so none of them is a fixed rule here: the effort branch (the
brief's required branch), the trunk, the merge flag, the push policy, and the
trunk-merge mode.

**The `local` mode**, the default, merges the effort branch into the trunk with
the merge flag the brief reports, deletes the effort branch, and pushes the
trunk when the brief's push step names a command. Complete the tree first: the
archive commit is on the effort branch, so the merge carries it.

**The `handoff` mode** is for a repository that forbids a local trunk merge. Do
not merge and do not delete the effort branch. Push the effort branch when the
brief's push step names a command, and print the pull-request instruction with
the branch and trunk names filled in, for the human to open:

> Open a pull request from `<effort-branch>` into `<trunk>`: the effort's
tickets are landed, reviewed, and archived.

A profile that carries no merge flag carries no landing step at all: report
that the close leaves the branches alone, and stop there.

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
5. Propose the changesets with `tw_write_changesets` and `dry_run: true`,
   show the proposal, and write the entries only after the human confirms.
6. Archive with `tw_archive_effort`. The tool deprecates the finished items,
   moves `docs/tasks/<effort>/` to `docs/tasks/archive/<effort>/` as a unit,
   updates the root index, and clears the state file's `map` pointer when it
   named the archived effort. Commit the move, because the tool writes the
   tree and git makes it history:
   `git add docs/tasks/ && git commit -m "chore: archive <effort>"`. A close
   that leaves the archive uncommitted hands the next phase a dirty tree.
7. Land the effort branch: merge it into the trunk with the merge flag the
   brief reports and push when its push step names a command, or hand off per
   the trunk-merge mode (see [Land the effort branch](#land-the-effort-branch)).
8. Close the phase with `tw_close finalize-effort`, naming the effort, and
   write the report.

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
