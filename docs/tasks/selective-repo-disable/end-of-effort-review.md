---
type: review
title: "End-of-effort review: selective-repo-disable (second pass)"
pass: end-of-effort
dispositioned: true
---

# End-of-effort review: selective-repo-disable (second pass, after subagent-availability-resync)

Advisory two-axis review of the extended whole-effort diff (effective fixed point 29e7c9e, the parent of the effort's planning commit; the stated fixed point `main` had already absorbed the landings, so the diff is empty against it). Both axes ran as fresh read-only contexts over the full 28-file diff (+2374/-277), covering all five tickets including the post-planning bug ticket.

## Standards

No documented-standard breaches: no skill added, renamed or removed; skill-creator's behaviour change got its docs-page re-sync; the router duty holds; no em-dashes in added prose; the testing-doc conventions were followed, including the new version-pinning rule.

Findings:

1. P2, report-only, already dispositioned: `skills/engineering/skill-creator/SKILL.md` still says the bundled tools are disclosed "nested inside a phase", while the diff opens skill-creator standalone and in gated repos. The AGENTS.md duty names the docs page, which was re-synced; the effort's earlier review accepted the same class. Accepted.
2. Judgement-call smell, the pass's largest: the "pi-subagents 0.84.0" version pin is restated across five surfaces (the session-start warning, `docs/repo-gating.md`, `README.md`, `target-pi.md`, and two re-pinned tests), so an upstream upgrade forcing a re-verify touches all of them. Accepted as a recorded residual; a shared constant or single source for the pin is the obvious follow-up shape if the repetition starts to bite.
3. Suppressed as endorsed: the settled 10-name literal appearing in the manifest, the consistency test and the doc test is the documented bidirectional pin; `workflowEnabled(gate)` as a named predicate is the documented endorsement.

## Spec

Every architecture contract and ticket acceptance criterion is present in the diff, with all three real deviations documented. Nothing missing, nothing implemented wrongly. The one conditional: user story 8 ("the children do not fail at launch") holds only when pi-telemetry is installed; with it absent, chain children fail at agent start under pi-subagents 0.84.0. The diff documents this honestly and the ticket explicitly scopes allowlist redesign out, so it is a dispositioned residual, not a contradiction. Accepted scope creep: the `docs/testing.md` guidance additions and the corpus walker's `.venv` skip, both already accepted in the effort's records. The reviewer's unverifiable-from-the-diff items (suite-green claims and the empirical pi-subagents reproduction) were taken as recorded.

Verdicts: Standards OK with notes. Spec OK with notes.

## Post-review actions

The final architecture reconcile completed as analysis in the same wrap-up: the reconciler found one imprecise sentence (the tw_open notify phrasing) plus, once given the bug ticket's records (its deviation-report inputs could not show them, the bug flow producing no report), four stale pi-subagents passages still recording the 0.34.0-verified shape as current fact. Its six exact edit pairs were applied by this phase through the architecture writer (the child is refused by the docs/tasks write lockdown by design): the refused-outcome phrasing, the supersession of the 0.34.0 correction by the lockfile-declared 0.84.0 shape in the tw_feedback bullet, the Documentation bullet, the repo-gating-docs-resync per-ticket contract, and the engineering checks. The architecture document now reads as what was built.

## Dispositions

- skills/engineering/skill-creator/SKILL.md:314 still says the bundled tools are disclosed nested inside a phase while the effort opens skill-creator standalone and in gated repos; the docs page was re-synced and the class is already an accepted disposition.: informational (accepted)
- The pi-subagents 0.84.0 version pin is restated across five surfaces (warning, repo-gating doc, README, target-pi reference, two re-pinned tests), so an upstream upgrade forces a five-place re-verify; accepted as a recorded residual, with a shared pin constant as the follow-up shape if it starts to bite.: informational (accepted)
- User story 8 (children do not fail at launch) is conditionally delivered: with pi-telemetry absent, chain children fail at agent start under pi-subagents 0.84.0; documented honestly and allowlist redesign is explicitly out of the ticket's scope, so a dispositioned residual.: informational (accepted)
- Accepted scope creep beyond the specification: the docs/testing.md guidance additions and the corpus walker's .venv skip, both recorded and accepted in the effort's own records.: informational (accepted)
