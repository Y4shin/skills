---
type: review
title: "Finalize review: add-pr-skill"
dispositioned: false
reconcile: "none: the end-of-effort pass already reconciled the architecture document against the deviation report, that reconciled document is in the tree, and nothing landed since; the rebase replayed history without changing content."
---

Holistic finalize review of `add-pr-skill`, read as a whole: the map, the specification, the reconciled architecture document, the ticket with its implementation notes and deviation report, the changelog entry, and the diff of everything the effort changed (`main..feature/pr-skills`, 9 commits after the rebase, content identical to what the advisory review covered).

Reconcile outcome: none. The end-of-effort pass already reconciled the architecture document against the ticket's deviation report (the house-preamble insertion, the vendored revision, the deliberately not-vendored upstream files), that reconciled document is the one in the tree, and nothing has landed since; the rebase onto main replayed history without changing the record's content.

## Level 1: the effort's claim

- **Success test, met by the automated bar.** A fresh install's auto-invocation rests on the verbatim trigger description and the model-invoked registration, both machine-verified; every promoted-set surface carries the skill and the suite proves it: the manifest at 32 with both pinned counts, both READMEs' Model-invoked groups held to the exact promoted set by the docs-resync tests, the four-section docs page pinned by the docs-page tests, both router mentions, the structure-test file-list entry. The suite is green on the integrated tree (23 files, 1381 tests, both typechecks clean). The live auto-invocation check remains the human's manual pass (`pi -e ./src/pi.ts`, ask for a PR body), which is the workflow's deliberate handoff, not a gap.
- **Non-goals, all held.** No rework of the upstream substance beyond the one test-forced mechanical adjustment; no other upstream skills vendored; no other skill body touched except the router's two mentions; no platform- or house-specific PR conventions; no eval-corpus entries or new tooling. The advisory two-axis review verified the same against the full diff.

## Level 2: the delivered code

The advisory whole-effort review (recorded in `end-of-effort-review.md`) found no blocking findings on either axis and both merge verdicts OK; its findings carry into this review below. Post-rebase, the combined tree with main's gating work is green end to end, so the integration holds.

## Findings

1. The vendored `pr` body instructs the model to use domain language from `GLOSSARY.md`, and no consuming repo of this package defines that file. The byte-close mandate (map non-goal 1, ADR 0001's adopt-upstream default) accepts the reference; where repos carry a domain glossary it is usually `CONTEXT.md`, and nothing breaks in repos without one.
2. The vendored body is not byte-identical to upstream: it carries the house preamble (the operator-communication line plus the canonical workflow-failure reference sentence) that the reference-coverage-suite test seam forces onto every promoted skill. The ticket's mechanical-adjustment allowance covers it; the deviation report, the ticket's implementation notes, and the reconciled architecture all disclose it.
3. The effort's workflow bookkeeping (the state pointer, the root index, the workflow changelog, the effort's own docs) changed outside the ticket's nine surfaces. These are the workflow's own record, not code-surface scope creep.
4. The vendored upstream revision (mattpocock/skills main at commit `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`, fetched live at implementation time) is recorded in the architecture document and the ticket notes but pinned nowhere mechanically; a future re-sync has no automated record to diff against.
5. The router's docs page (`docs/engineering/task-workflow-overview.md`) carries no Actions-table mirror at all, so the new "Write a PR body" row exists only in the router SKILL.md. This is a pre-existing gap outside the effort's scope; a later effort that mirrors the Actions table into that page must add the row.

Findings 1, 2, and 4 are documentary by construction: their subjects are true in code and tests, their fixes would live in vendored or docs prose, and the living record (the reconciled architecture document) already carries the substance. Finding 3 is the workflow's own bookkeeping. Finding 5 names pre-existing package state this effort did not create and its non-goals exclude.

## Dispositions

- The vendored pr body references GLOSSARY.md for domain language, a file no consuming repo defines; the byte-close mandate accepts it and behavior degrades gracefully.: not yet triaged
- The vendored body carries the house preamble forced by the reference-coverage-suite test seam; covered by the ticket's mechanical-adjustment allowance and disclosed in the deviation report, ticket notes, and reconciled architecture.: not yet triaged
- The effort's workflow bookkeeping (state.yaml, index.md, the workflow changelog, the effort docs) changed outside the ticket's nine surfaces; it is the workflow's own record, not scope creep.: not yet triaged
- The vendored upstream revision (4ae2317ddb22b046e26455e4f9c9b3aaaf62212d) is recorded in the architecture document and ticket notes but pinned nowhere mechanically; a future re-sync has no automated record to diff against.: not yet triaged
- The router's docs page has no Actions-table mirror, so the new Write a PR body row exists only in the router SKILL.md; pre-existing gap outside this effort's scope, and a later effort mirroring that table must add the row.: not yet triaged
