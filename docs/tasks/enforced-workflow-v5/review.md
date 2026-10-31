---
type: review
title: Review of enforced-workflow-v5
dispositioned: true
---

## What this pass read and ran

Read: the map, `spec.md`, `arch-spec.md` (this tree is schema 4, so that is the
architecture document), every ticket and its landing note, `docs/tasks/CHANGELOG.md`,
`CONTEXT.md`, the promoted READMEs, the five post-landing fix commits
(`a94609f`, `512ab59`, `6f057f4`, `18d56e9`, `e5eeb0f`), and the rehearsal issue
log `/tmp/mdtoc-lifecycle/issues.md` including its verification section and the
`dirsum` from-scratch run.

Ran, in this tree: `npx tsc --noEmit` (clean), `npx tsc -p tsconfig.test.json
--noEmit` (clean), `npx vitest run` (19 files, 1198 tests, all green). The issue
log's claims for D1 to D20, D23 and D24 are backed by sandbox repros and
transcripts; D21 and D22 have their proposed fixes recorded as the informational
rules now in `finalize-effort`'s SKILL, which is the triage rule this pass
applies.

## Does the effort's claim still describe what was delivered

Yes, with one gap. The map's success test asks a fresh effort to travel
`intake` to `finalize-effort` with every transition gated and a skip refused by
the tool. The `dirsum` runthrough demonstrates exactly that (transcripts H to N,
33 tests green, D1 to D20 and D23/D24 did not recur), and the gates are the
single source of truth in `src/pi.ts` rather than prose. The claim the effort
does not keep is its own "living architecture document": after the last ticket
landed, five fix commits changed behaviour and nothing reconciled the design
record. `arch-spec.md` now says the opposite of the shipped tooling in three
places, so the record an agent would read before acting on this area misleads.

## Findings

### F1. No phase owns the living architecture after the last ticket lands
`implement-ticket` holds `tw_write_architecture` and its end-of-effort pass
reconciles the document (`src/disclosure.ts:195-201`), but every reconcile runs
before the last landing. `finalize-effort` declares no architecture writer
(`src/disclosure.ts:211-226`), and the `docs/tasks/**` lockdown refuses the
built-in tools, so the phase that closes the effort, and runs after any later
fix commit, physically cannot update the design record. This is why the five
hotfix commits were never reconciled. The close is the last chance and it holds
no pen.

### F2. The architecture document is stale, and unwritable in this schema-4 tree
`docs/tasks/enforced-workflow-v5/arch-spec.md:325-326` still says `finalize-effort`
"runs one holistic pass per effort, so there is no second advisory review",
while the shipped skill re-runs the review on a later pass and the advisory
review has its own artifact (`end-of-effort-review.md`). Lines 671-675 and 797
say every review artifact's `dispositioned` flag gates the archive, while
`tw_archive_effort` skips `pass: end-of-effort`. The document also predates the
`tickets-ready` gate, `tw_write_task_note`, the `## Fog` precondition, the
state-pointer clear, and the pi-telemetry peer requirement. In this tree the
document cannot be corrected by any tool either: `tw_write_architecture` refuses
a legacy `arch-spec.md` outright (`src/pi.ts:1836-1841`), and no writer targets
the legacy leaf. The fix is a planning artifact plus a repo migration, which is
a human `setup-workflow` action, not implementation work.

### F3. The advisory review pass skips the disposition target check
`tw_write_review`'s finalize branch validates every `ticket` disposition against
an existing ticket in the effort and every `follow-up` against a live effort
stamped `origin_effort` (`src/pi.ts:1979-1992`). The advisory branch, which is
where the finalize triage records dispositions of the end-of-effort findings,
runs no such check (`src/pi.ts:1947`). A typo or invented slug therefore records
"ticketed to X" for a ticket that does not exist, and because the advisory file
is never a gate, the archive still releases. The writer that keeps the trail
honest does not verify its own trail in one of its two passes.

### F4. The Fog precondition counts prose markers as open questions
`tw_finalize_map` treats every non-blank line in `## Fog` as an open decision
(`src/pi.ts:1746-1756`), including an HTML comment or the sentence this effort's
own map uses, `Nothing open.` (`docs/tasks/enforced-workflow-v5/map.md:287`). The
`dirsum` map emptied its Fog to a blank section and passed, so the rehearsal
never exercised the prose form. The convention "empty means empty" is not
documented anywhere. Severity is low: the refusal is specific and self
correcting, and the concrete instance is a map line, which is planning-owned.
Recorded as accepted.

### F5. `CONTEXT.md` lags the two-pass review model
The glossary's "Review artifact" entry (`CONTEXT.md:103-110`) says the
`dispositioned` flag is what the archive gate reads, and gives no entry for the
advisory `end-of-effort-review.md` that `implement-ticket` now writes. The code
and its tests already agree with the two-pass model, so this is prose lag, not a
behavioural gap.

### F6. Three hygiene defects with no behaviour change
`skills/engineering/implement-ticket/scripts/ticket-chain.js:205` has
`});const refs = ...` on one line. `end-of-effort.js:148` writes `refs.specText`
and nothing reads it. The gate retry at `ticket-chain.js:169-183` re-dispatches
the gate even when the child already refused, doubling a refusing gate's cost;
the comment shows this is a considered trade, recorded here so it is not
rediscovered.

## Note on the informational rules

F2 and F5 are documentary and their fixes live in planning-owned or prose
artifacts that the implementation phase cannot write, and F4 and F6 are accepted
as they stand. F1 and F3 change what the tooling does, so they are ticketed. This
pass does not fix anything it found.

## Dispositions

- No phase owns the living architecture after the last ticket lands: finalize-effort declares no architecture writer, so the close cannot correct the design record (src/disclosure.ts:195-226): ticket `finalize-architecture-reconcile`
- arch-spec.md is stale against the shipped two-pass review model and cannot be written in this schema-4 tree (docs/tasks/enforced-workflow-v5/arch-spec.md:325-326, 671-675, 797; src/pi.ts:1836-1841): informational (accepted)
- tw_write_review's advisory pass skips the ticket-target existence check the finalize pass performs, so a disposition can name a nonexistent ticket and the archive still releases (src/pi.ts:1947 against src/pi.ts:1979-1992): ticket `advisory-disposition-target-check`
- tw_finalize_map counts any non-blank Fog line as an open question, including this effort's own 'Nothing open.' marker (src/pi.ts:1746-1756, docs/tasks/enforced-workflow-v5/map.md:287): informational (accepted)
- CONTEXT.md has no glossary entry for the advisory end-of-effort review artifact and its Review artifact entry omits the advisory exemption (CONTEXT.md:103-110): informational (accepted)
- Three hygiene defects with no behaviour change: a joined declaration at ticket-chain.js:205, a write-only refs.specText at end-of-effort.js:148, and a retry that re-dispatches an already refusing gate (ticket-chain.js:169-183): informational (accepted)
