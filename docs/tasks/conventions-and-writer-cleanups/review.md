---
type: review
title: Review of agent-facing-workflow-docs
dispositioned: false
---

> Moved from the effort `agent-facing-workflow-docs`: these findings are the follow-up's work.

Holistic close review over the effort as a whole: map, spec, reconciled
architecture, ticket records, changelog, and the full diff
(856f327..HEAD). Read after the end-of-effort architecture reconcile and
the coherence sweep; verifies the effort's own claim, then the delivered
surfaces.

## The effort's claim

The success test passes exactly as specified: one model-invoked ladder
skill (`workflow-failure`) ships in the package, every promoted `SKILL.md`
and `agents/` profile carries the one-line reference, and
`task-workflow-overview` ships the internals reference with flow charts,
with the repo conventions (README, package skill list, bucket README, docs
page, router) in sync. Verified mechanically, not by impression: the
coverage suite derives the covered set from the package manifest and
directory scans, so a future promoted skill without the sentence fails CI.

Non-goals honored: no changes under `src/` (verified by range diff), no
eval additions, no behavioral verification, `task-workflow-doctor`'s scope
unmodified (its only touched line is the canonical reference sentence, by
design), no inline failure-handling prose in the other skills.

## The delivered code

- The ladder in `workflow-failure/SKILL.md` matches the architecture's
  fixed rung order (refusal reason/legal_next; reorient or route to the
  doctor; tw_feedback; stop-and-escalate in the five-part report) and the
  forbidden moves stand verbatim. Its `resources/report.md` carries the
  five parts in order.
- `WORKFLOW-INTERNALS.md` carries the seven sections in order, valid
  mermaid for both diagrams (independently parsed, negative-tested), a
  pure-ASCII artifact tree, and the tw_* table verified verbatim against
  the registry. Two content resolutions are documented in the architecture
  (banned retired-vocabulary path tokens; pipe-form mermaid labels).
- The threading is additions-only (40 files, 80 insertions, 0 deletions),
  verbatim, in the architecture's slots, and now mechanically pinned.
- Full suite 1308 passed, typechecks clean, on `main` (local, unpushed;
  release decision is the operator's).

## Findings

1. **Convention ruling needed, docs-page re-sync.** AGENTS.md says a
   behaviour change to a promoted skill re-syncs its docs page; this
   effort changed 29 skills' behaviour (each now names workflow-failure)
   and re-synced zero pages, deliberately, because the sentence is
   invisible to the four human-facing sections. Either the rule accepts
   this carve-out, or the pages (or the rule) need amending.
   **Operator ruling at this close:** the carve-out is accepted, and no
   page is re-synced; codifying the carve-out in AGENTS.md rides the
   follow-up.
2. **Convention scatter has no single home.** Shipping one skill touched
   roughly ten convention surfaces (package skill list, two READMEs, docs
   page, CONTEXT.md, migration-target.yaml, changeset, and three test
   maintenance surfaces); the skill-creation ticket's ownership list had
   to absorb two of them ad hoc. A checklist in the skill-creator runbook
   is the natural single home for this list.
3. **Test gate relaxation landed inside a feature ticket.**
   `CORPUS_SKIP_DIRS` grew `.agents` and `dist` mid-ticket, driven by a
   dirty local checkout (gitignored, never shipped, now asserted against
   via git check-ignore). Defensible, but a corpus relaxation inside a
   feature ticket deserves a standing rule (e.g. relaxations ride their
   own ticket) rather than an accidental precedent.
4. **Changelog writer formatting noise.** The changelog prepend inserts
   five consecutive blank lines before new entries. The writer lives under
   `src/`, which this effort was forbidden to touch. Verified still live
   at this close: `docs/tasks/CHANGELOG.md` still accumulates the blank
   lines, and the migration-tool ticket entries written after this effort
   still add them.
5. **Spec-level criterion contradiction (drafting defect, repaired).**
   The skill-creation ticket's "full suite green" acceptance criterion
   clashed with the router-row ownership split and required a
   designed-red close-out with an operator protocol decision mid-run. The
   architecture reconcile replaced the impossible criterion; recorded here
   so future ticket drafting avoids pairing a file-ownership split with a
   suite-green-per-ticket criterion.
6. **Stale workaround anomaly in shipped prose beyond this effort.**
   Documenting the artifact tree exposed that the retired `slices/` and
   `docs/tasks/maps/` path shapes cannot be named in live prose because
   the retired-vocabulary test bans the path strings. Describing legacy
   shapes in internals-style documentation currently requires reopening
   that ban deliberately.
