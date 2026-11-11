---
type: review
title: "Finalize review: add-pr-skill"
dispositioned: true
reconcile: "done: the architecture document's vendoring-stance bullet, surface-map item 1, and do-not-reimplement entry now record the second house adjustment, the domain-language reference adapted from upstream's GLOSSARY.md to this package's CONTEXT.md at the operator's finalize-triage instruction."
---

Holistic finalize review of `add-pr-skill`, read as a whole: the map, the specification, the reconciled architecture document, the ticket with its implementation notes and deviation report, the changelog entry, and the diff of everything the effort changed (`main..feature/pr-skills`, 10 commits after the rebase and the inline fix).

Reconcile outcome: done. The end-of-effort pass reconciled the architecture document against the ticket's deviation report (the house-preamble insertion, the vendored revision, the deliberately not-vendored upstream files), and the finalize triage added a second correction: the operator ordered the body's domain-language reference adapted from upstream's `GLOSSARY.md` to this package's `CONTEXT.md`, and the architecture's vendoring-stance bullet, surface-map item 1, and do-not-reimplement entry now record that second house adjustment.

## Level 1: the effort's claim

- **Success test, met by the automated bar.** A fresh install's auto-invocation rests on the verbatim trigger description and the model-invoked registration, both machine-verified; every promoted-set surface carries the skill and the suite proves it: the manifest at 32 with both pinned counts, both READMEs' Model-invoked groups held to the exact promoted set by the docs-resync tests, the four-section docs page pinned by the docs-page tests, both router mentions, the structure-test file-list entry. The suite is green on the integrated tree (23 files, 1381 tests, both typechecks clean), re-run after the inline fix. The live auto-invocation check remains the human's manual pass (`pi -e ./src/pi.ts`, ask for a PR body), which is the workflow's deliberate handoff, not a gap.
- **Non-goals, all held.** No rework of the upstream substance beyond the mechanical adjustments house rules and the operator demanded (the test-forced preamble and the CONTEXT.md reference); no other upstream skills vendored; no other skill body touched except the router's two mentions; no platform- or house-specific PR conventions; no eval-corpus entries or new tooling. The advisory two-axis review verified the same against the full diff.

## Level 2: the delivered code

The advisory whole-effort review (recorded in `end-of-effort-review.md`) found no blocking findings on either axis and both merge verdicts OK. Post-rebase, the combined tree with main's gating work is green end to end, so the integration holds.

## Findings and triage

1. **GLOSSARY.md reference, resolved inline by operator instruction.** The vendored body's domain-language line referenced `GLOSSARY.md`, a file no consuming repo of this package defines. At the triage the operator ordered the adaptation done inline rather than ticketed: the line now reads `CONTEXT.md`, this package's name for the domain glossary, landed in the finalize run at commit `703a5a9` with the suite re-verified green; the briefly created ticket was removed before any work ran on it, on the operator's proportionality call.
2. **House preamble insertion, informational.** The vendored body carries the house preamble (the operator-communication line plus the canonical workflow-failure reference sentence) that the reference-coverage-suite test seam forces onto every promoted skill. The ticket's mechanical-adjustment allowance covers it, and the deviation report, ticket notes, and reconciled architecture all disclose it.
3. **Workflow bookkeeping outside the nine surfaces, informational.** The state pointer, the root index, the workflow changelog, and the effort's own docs changed outside the ticket's nine surfaces; they are the workflow's own record, not code-surface scope creep.
4. **Upstream revision pinned only in prose, informational.** The vendored revision (mattpocock/skills main at commit `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`) is recorded in the architecture document and ticket notes but pinned nowhere mechanically; a future re-sync has no automated record to diff against.
5. **No Actions-table mirror on the router's docs page, informational.** `docs/engineering/task-workflow-overview.md` carries no Actions-table mirror at all, so the "Write a PR body" row exists only in the router SKILL.md. Pre-existing gap outside this effort's scope; a later effort mirroring that table must add the row.

All five dispositions were put to the operator in the triage round: finding 1 was resolved inline by the operator's instruction, findings 2 through 5 were accepted as informational.

## Dispositions

- The vendored pr body's domain-language line referenced GLOSSARY.md, a file no consuming repo defines; resolved inline by operator instruction at the triage: the line now reads CONTEXT.md (commit 703a5a9, suite re-verified green), and the briefly created ticket was removed before any work ran on it.: informational (accepted)
- The vendored body carries the house preamble forced by the reference-coverage-suite test seam; covered by the ticket's mechanical-adjustment allowance and disclosed in the deviation report, ticket notes, and reconciled architecture.: informational (accepted)
- The effort's workflow bookkeeping (state.yaml, index.md, the workflow changelog, the effort docs) changed outside the ticket's nine surfaces; it is the workflow's own record, not scope creep.: informational (accepted)
- The vendored upstream revision (4ae2317ddb22b046e26455e4f9c9b3aaaf62212d) is recorded in the architecture document and ticket notes but pinned nowhere mechanically; a future re-sync has no automated record to diff against.: informational (accepted)
- The router's docs page has no Actions-table mirror, so the new Write a PR body row exists only in the router SKILL.md; pre-existing gap outside this effort's scope, and a later effort mirroring that table must add the row.: informational (accepted)
