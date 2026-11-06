---
type: review
title: "End-of-effort review: selective-repo-disable"
pass: end-of-effort
dispositioned: true
---

# End-of-effort review: selective-repo-disable

Advisory two-axis review of the whole-effort diff (the effective fixed point is 29e7c9e, the parent of the effort's planning commit; the stated fixed point `main` had already absorbed the landings, so the reviewer resolved it to the pre-effort commit). Spec source: the four ticket docs plus the effort's architecture document. Both axes read the full diff (24 files, +2123/-242).

## Standards axis

Verified correct: no em-dashes in touched prose or code; no skill add/rename/remove, so the promoted-bucket, README, `pi.skills` and router rules are untouched; `docs/repo-gating.md`, `README.md`, `docs/testing.md` and skill-creator's `target-pi.md` re-synced to the narrowed behaviour; effort-tracking records use the CONTEXT.md vocabulary.

Findings, all resolved by the coherence pass (commit 5de60c3) before this record was written:

1. P2, speculative generality: `openableWhenGated` carried a caller-less `tables` parameter. Fixed: the parameter was dropped; the function reads `SKILL_REGISTRY` directly.
2. P2, mysterious name: `tests/gate-factory.test.ts` defined a local `GATED_REGISTERED_TOOLS` with a different set than the module-private constant of the same name in `src/pi.ts`. Fixed: the test fixture was renamed `GATED_TOOL_SURFACE`, mirroring `FULL_TOOL_SURFACE`, with a comment pinning the deliberate non-collision.
3. P2, docs-sync incompleteness: skill-creator's behaviour changed (it now opens standalone in gated repos) but `docs/engineering/skill-creator.md` still described only the nested-open shape. Fixed: the page was re-synced to cover the standalone and gated-work-repo shapes.

Suppressed smells, recorded as endorsed: `workflowEnabled(gate)` is a named predicate the docs explicitly endorse; tests re-deriving `registry minus manifest` instead of calling `openableWhenGated()` are the endorsed bidirectional consistency pin.

## Spec axis

Verified correct: every architecture and ticket requirement is present in the diff with tests, and the three real deviations (refusal in the execute handler ahead of `validateOpenArgs`; description-narrowing instead of a parameter enum; peer checks firing in gated repos) each carry a deviation report plus ticket Implementation notes.

Findings:

1. P2, unrecorded scope creep: `docs/testing.md` gained four testing-guidance additions (offered-surface narrowing via description, the relative-green version-skew protocol, dual-state exact-set pinning, static keep-list consistency tests) that no spec line asks for. The review's own verdict: none needed to merge; the additions are consistent with the repo's testing-lessons convention. The coherence pass declined to touch landed records; the additions are accepted as they stand.

## Verdicts

Standards: OK with notes. Spec: OK with notes. No missing or wrong requirements.

## Post-review actions (coherence pass, commit 5de60c3)

All four supplied coherence inconsistencies were fixed (session-start message family unified on `task-workflow <topic>: <text>`; duplicated test setup extracted into shared helpers with one superseded describe deleted, the file going 46 to 45 tests, all green; the disclosure exports' doc comments de-nested; the pre-split-surface comments in `src/pi.ts` corrected). The three standards findings above were fixed in the same commit. Declined and left for triage: the spec finding (accepted above), and `skills/engineering/skill-creator/SKILL.md`'s "opened nested inside a phase" phrasing, the same incompleteness class as the docs page but not named by the review or the AGENTS.md docs-page duty.

## Residuals for the finalize triage

- The effort's planning records still state the pre-verification pi-subagents claim (`map.md` hedged, `tasks/tool-use-inventory/task.md` flat); the close-out left them as historical records, and the living architecture document now carries the verified shape.
- The corrected wording pins pi-subagents 0.34.0 behaviour; a future upstream launch-time allowlist check would stale it again.
- `docs/ideas/gate-skills-by-repo.md` still describes the pre-narrowing proposal (historical idea artifact, no action taken).

Suite gate at the end of the pass: green relative to the machine's documented baseline (failure and position-stripped typecheck error sets identical to a clean `main` worktree; the change under gate introduced no new failing test and no new typecheck error).

## Dispositions

- Standards P2: openableWhenGated carried a caller-less tables parameter (speculative generality); fixed by the coherence commit 5de60c3.: informational (accepted)
- Standards P2: tests/gate-factory.test.ts used the name GATED_REGISTERED_TOOLS for a different set than the module-private constant; renamed to GATED_TOOL_SURFACE by the coherence commit.: informational (accepted)
- Standards P2: docs/engineering/skill-creator.md was not re-synced to skill-creator's standalone gated-repo opening; re-synced by the coherence commit.: informational (accepted)
- Spec P2: docs/testing.md gained four testing-guidance additions no spec line asks for (unrecorded scope creep); accepted per the review's own verdict, consistent with the repo's testing-lessons convention.: informational (accepted)
- skills/engineering/skill-creator/SKILL.md still says skill-creator is opened nested inside a phase; the coherence pass left it (not named by the review or the AGENTS.md docs-page duty), same incompleteness class as the re-synced docs page.: informational (accepted)
