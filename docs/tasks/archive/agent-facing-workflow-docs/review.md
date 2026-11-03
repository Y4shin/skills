---
type: review
title: Review of agent-facing-workflow-docs
dispositioned: true
reconcile: "done: recorded the as-built state in the end-of-effort pass via two section writes (Interface contracts: ownership additions for migration-target/changeset/test surfaces, placement interpretation, pipe-form mermaid labels, banned-token resolution; Per-ticket interface contracts: designed-red criterion, as-built counts, .work/ checker, exemption direction, directory-derived coverage)"
---

The findings in this review moved to the follow-up effort `conventions-and-writer-cleanups`: the review artifact is at `docs/tasks/conventions-and-writer-cleanups/review.md`.

## Dispositions

- AGENTS.md's rule that a behaviour change to a promoted skill re-syncs its docs page needs a carried exception for the invisible workflow-failure threading sentence; the operator accepted the carve-out in this close (no page re-sync), so codify it in AGENTS.md.: follow-up effort `conventions-and-writer-cleanups`
- Shipping one skill touches about ten convention surfaces (package skill list, two READMEs, docs page, CONTEXT.md, migration-target.yaml, changeset, three test maintenance surfaces) with no single home; make the skill-creator runbook checklist that single home.: follow-up effort `conventions-and-writer-cleanups`
- The CORPUS_SKIP_DIRS corpus relaxation (.agents, dist) landed inside a feature ticket; give test-gate relaxations a standing rule so they ride their own ticket.: follow-up effort `conventions-and-writer-cleanups`
- The ticket changelog writer under src/ inserts blank lines that accumulate in docs/tasks/CHANGELOG.md (verified still live at this close); fix the writer and normalize the committed file.: follow-up effort `conventions-and-writer-cleanups`
- A ticket-drafting defect paired a suite-green acceptance criterion with a router-row ownership split, forcing a designed-red close and a mid-run operator decision; repaired in the architecture reconcile, and recorded so future drafting avoids the pairing.: informational (accepted)
- The retired-vocabulary test bans the legacy slices/ and docs/tasks/maps/ path strings, so live prose cannot describe those legacy shapes; revisit the ban for internals-style documentation.: follow-up effort `conventions-and-writer-cleanups`
