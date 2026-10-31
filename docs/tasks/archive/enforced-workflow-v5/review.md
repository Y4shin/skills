---
type: review
title: Review of enforced-workflow-v5 (second close pass)
dispositioned: true
---

## What this pass read and ran

Second close pass. Read: the map, `spec.md`, `arch-spec.md` (this tree is
schema 4, so that is the architecture document), all 23 tickets and their
notes, `docs/tasks/CHANGELOG.md`, `CONTEXT.md`, the promoted READMEs, the
previous review artifact, the two write-back commits from the last close
(`8e4c718`, `153d5e0`), the three close-out commits (`3476a6a`, `09fb919`,
`9938561`), and the rehearsal issue log `/tmp/mdtoc-lifecycle/issues.md`.

Ran in this tree: `npx tsc --noEmit` (clean), `npx tsc -p tsconfig.test.json
--noEmit` (clean), `npx vitest run` (19 files, 1199 tests, all green), and
`tw_frontier` for the effort (empty). `153d5e0` is a comment-only change and
touches no behaviour.

## The reconcile this pass owes

The phase's first step is to reconcile the living architecture through
`tw_write_architecture`. Two things stopped it, and both are recorded here
rather than worked around by hand:

- The extension loaded in this session predates `8e4c718`, so the
  `finalize-effort` toolset this session holds has no `tw_write_architecture`
  in it at all. The registry in the working tree discloses it
  (`src/disclosure.ts:219-227`) and `tests/opener-gate.test.ts` pins it, so a
  session started after the change has the step; this one does not.
- Even with the writer in hand, this schema-4 tree refuses the legacy
  document (`src/pi.ts:1871-1882`: "still holds the legacy architecture
  shape ... run the schema-5 migration"), and the SKILL and the docs page say
  that refusal is the schema-4 outcome.

So `arch-spec.md` was not reconciled and was not hand-edited. Its stale
claims are F1 below.

## What the two closed tickets resolved

- `finalize-architecture-reconcile` closed the last pass's F1 structurally:
  the close now owns the architecture reconcile, with the writer in its
  toolset, a skill step that runs it before the review, and the same contract
  on `docs/engineering/finalize-effort.md`.
- `advisory-disposition-target-check` closed the last pass's F3:
  `validateReviewTargets` (`src/pi.ts:928`) is now called from both review
  passes (`src/pi.ts:1988`, `src/pi.ts:2022`), so an advisory disposition
  naming no existing ticket is refused, with the case pinned in
  `tests/lifecycle-hardening.test.ts`.
- `153d5e0` fixed the doc-comment hygiene item the second ticket's note
  recorded.

## Does the effort's claim still describe what was delivered

Yes. The map's success test asks a fresh effort to travel `intake` to
`finalize-effort` with every transition performed by a gated tool and a skip
refused by that tool. The `dirsum` runthrough demonstrates it end to end
(transcripts H to N, 33 tests green, none of D1 to D20 or D23/D24 recurred),
and the gates remain the single source of truth in `src/pi.ts`. The one claim
the effort still does not keep is its own living architecture record, which
cannot be written on this tree at all until the migration runs.

## Findings

### F1. `arch-spec.md` is stale, and no tool can write it on a schema-4 tree
`docs/tasks/enforced-workflow-v5/arch-spec.md:325-326` still says
`finalize-effort` "runs one holistic pass per effort, so there is no second
advisory review", and lines 671-675 and 797 still describe the archive gate as
reading every review artifact's `dispositioned` flag. Both contradict shipped
behaviour: the close re-runs the review, the advisory review has its own
artifact, and `tw_archive_effort` skips `pass: end-of-effort`. The document
also predates the `tickets-ready` gate, `tw_write_task_note`, the `## Fog`
precondition, the state-pointer clear, and the pi-telemetry peer requirement.
`src/pi.ts:1871-1882` refuses the legacy leaf, so no tool corrects it here.
The fix is a planning artifact plus a repo migration, a human
`setup-workflow` action.

### F2. The reconcile step is prose discipline with no verification
`tw_write_architecture` can be skipped, and nothing records whether the close
reconciled or what it changed. This is the same accepted class as the report
templates (prose, not a gate), but it is the one step that keeps the design
record true, so the risk is recorded rather than hidden. A cheap future
improvement would be a reconcile marker on the review artifact, which would
still be self-attestation.

### F3. The reconcile replaces the whole architecture body
`tw_write_architecture` writes the document body wholesale, so correcting a
paragraph at the close means resending the entire document (809 lines here),
while maps have a section-level writer for exactly this reason. Workable, not
cheap, and worth a section-level writer for the architecture in a later effort.

### F4. This session's loaded registry predates the reconcile step
A session that spans the change keeps the old toolset for its lifetime, so the
skill can describe a step the session cannot perform. Restarting the session
resolves it; recorded so an operator reading a close transcript knows why the
step is missing.

### F5. `tw_finalize_map` still counts prose in `## Fog` as an open question
`src/pi.ts:1785-1793` treats every non-blank line as an open decision,
including this effort's own marker, `Nothing open.`
(`docs/tasks/enforced-workflow-v5/map.md:287`). The refusal is specific and
self-correcting, and the convention "empty means empty" is undocumented.
Carried forward from the last pass, still accepted.

### F6. `CONTEXT.md` still lags the two-pass review model
The "Review artifact" entry (`CONTEXT.md:103-110`) names `review.md` and its
`dispositioned` flag, with no entry for the advisory
`end-of-effort-review.md` and no note that the archive skips it. The code and
its tests already agree, so this is prose lag only.

### F7. Three hygiene leftovers, unchanged since the last pass
`skills/engineering/implement-ticket/scripts/ticket-chain.js:205` still has
`});const refs = ...` on one line. `end-of-effort.js:148` still writes
`refs.specText` with no reader. The gate retry at `ticket-chain.js:169-183`
still re-dispatches a gate that already refused. None changes behaviour.

### F8. The second ticket's note records a defect that `153d5e0` fixed
The last paragraph of `advisory-disposition-target-check`'s implementation note
says the `reviewDispositionLine` doc comment is orphaned; `153d5e0` restored
it, so the note now describes a state that no longer exists. Documentary: the
subject holds in code.

## Note on the informational rules

All eight findings are informational. F1 is planning-owned plus a human
migration, F2 to F4 are architecture and operational notes for a later effort,
F5 and F6 are documentary with the behaviour already correct in code and
tests, F7 changes no behaviour, and F8 is a stale sentence whose subject now
holds in code. None of them changes what the tool does, so none becomes a
ticket and this pass fixes nothing it found. With the frontier empty and every
finding dispositioned, the effort is ready to archive.

## Dispositions

- arch-spec.md is stale (lines 325-326, 671-675, 797) and no tool can write it on this schema-4 tree; the fix is planning-owned plus a human setup-workflow migration: informational (accepted)
- the new close reconcile is prose discipline with no verification or recorded marker, so the design record can still be skipped: informational (accepted)
- tw_write_architecture replaces the whole architecture body, so a paragraph-level correction at the close means resending the entire document while maps have a section-level writer: informational (accepted)
- a session whose loaded extension predates 8e4c718 keeps a finalize-effort toolset without tw_write_architecture, so the skill can describe a step that session cannot perform: informational (accepted)
- tw_finalize_map counts any non-blank Fog line as an open question, including this effort's own 'Nothing open.' marker (src/pi.ts:1785-1793, map.md:287): informational (accepted)
- CONTEXT.md still has no glossary entry for the advisory end-of-effort review artifact and its Review artifact entry omits the advisory exemption (CONTEXT.md:103-110): informational (accepted)
- Three unchanged hygiene leftovers: ticket-chain.js:205 joined declaration, end-of-effort.js:148 write-only refs.specText, and a retry that re-dispatches an already refusing gate (ticket-chain.js:169-183): informational (accepted)
- The advisory-disposition-target-check note's last paragraph describes the orphaned doc comment that 153d5e0 already fixed, so the note records a state that no longer exists: informational (accepted)
