---
type: review
title: Review of selective-repo-disable (final close)
dispositioned: true
reconcile: "done: the end-of-effort reconcile pass produced six exact corrections (the tw_open refusal phrasing and the supersession of the pi-subagents 0.34.0-verified passages by the lockfile-declared 0.84.0 shape), applied through the architecture writer in commit 92022a7 and verified by a fresh reconcile with zero further edits; the only later change, the coherence pass's test-helper extraction (2b0cf0c), touches no surface the architecture records."
---

# Review of selective-repo-disable (final close)

The holistic, read-only review at close: the map's destination and success test against what the effort delivered, the specification's user stories against the landed code, the reconciled architecture document, all five tickets with their implementation notes and deviation reports, the changelog, and the whole diff from the effort's planning commit to the current `main` (including the post-planning bug ticket and both wrap-up passes). The effort's claim is delivered and twice-verified: in a gated work repo only the task workflow is off (the 10-name manifest, the passive tool split, the restricted `tw_open`, the re-keyed write lockdown, the resynced docs and warnings), the classification contract is unchanged, and ungated repos are unchanged. The delivered code passed two independent two-axis advisory reviews (both "OK with notes"), two coherence passes, and the final suite gate with no caveats: 1376 of 1376 tests and both typechecks green.

The one finding that changed what the record states (the shipped pi-subagents launch-behaviour text was false on the lockfile-declared 0.84.0) was dispositioned as an implementation ticket in the previous close, landed as `subagent-availability-resync`, and its correction is now the shipped record everywhere; the architecture document carries the supersession, verified by a fresh reconcile with zero further edits.

Every remaining finding is informational and recorded as accepted:

- Skill-creator's `SKILL.md` keeps one stale "nested inside a phase" phrase while its behaviour, its docs page and its tests agree (documentary; the AGENTS.md duty names the docs page, which is re-synced).
- The effort's planning records keep the pre-verification pi-subagents claim as dated history (`map.md` non-negotiable facts hedge, `tasks/tool-use-inventory/task.md` flat statement); the fix lives under `docs/tasks/`, and the living architecture document carries the verified shape.
- `docs/ideas/gate-skills-by-repo.md` still describes the pre-narrowing proposal (historical idea artifact).
- The `docs/testing.md` guidance additions and the corpus walker's `.venv` skip went beyond the specification's lines; accepted per the advisory reviews' verdicts and the repo's testing-lessons convention.
- The "pi-subagents 0.84.0" version pin is restated across five surfaces, so an upstream upgrade forces a five-place re-verify; accepted as a recorded residual, with a shared pin constant as the follow-up shape if the operator ever wants it.
- User story 8 ("the children do not fail at launch") is conditionally delivered: with pi-telemetry absent, chain children fail at agent start under 0.84.0. The warning, the docs and the tests state this honestly, the install guidance is explicit, and allowlist redesign was scoped out of the ticket by design.

## Reconcile

The living architecture document was reconciled after the last landing: the end-of-effort reconcile pass produced six exact corrections (the tw_open refusal phrasing, and the supersession of the pi-subagents 0.34.0-verified passages by the lockfile-declared 0.84.0 shape), applied by the implement-ticket phase through the architecture writer and verified by a fresh reconcile with zero further edits. The only later change, the coherence pass's test-helper extraction, touches no surface the architecture records. The document reads as what was built.

## Verdict

The effort is finalizable: no finding lacks a disposition, no ticket remains at any level, and nothing blocks the archive.

## Dispositions

- The shipped pi-subagents launch-behaviour record was false on the lockfile-declared 0.84.0 (a child whose allowlisted tool never registers fails its run at agent start); dispositioned as the implementation ticket subagent-availability-resync, now landed and done, with the corrected record shipped in the warning, the docs and the re-pinned tests.: ticket `subagent-availability-resync`
- skills/engineering/skill-creator/SKILL.md keeps one stale nested-inside-a-phase phrase while its behaviour, docs page and tests agree; accepted as documentary.: informational (accepted)
- The effort's planning records keep the pre-verification pi-subagents claim as dated history (map.md hedge, tasks/tool-use-inventory/task.md flat statement); the fix lives under docs/tasks/ and the living architecture document carries the verified shape.: informational (accepted)
- docs/ideas/gate-skills-by-repo.md still describes the pre-narrowing proposal; historical idea artifact, accepted.: informational (accepted)
- The docs/testing.md guidance additions and the corpus walker's .venv skip went beyond the specification; accepted per the advisory reviews' verdicts and the repo's testing-lessons convention.: informational (accepted)
- The pi-subagents 0.84.0 version pin is restated across five surfaces, so an upstream upgrade forces a five-place re-verify; accepted as a recorded residual, with a shared pin constant as the follow-up shape if the operator wants it.: informational (accepted)
- User story 8 (children do not fail at launch) is conditionally delivered: with pi-telemetry absent, chain children fail at agent start under 0.84.0; documented honestly in warning, docs and tests, with allowlist redesign scoped out and the install obligation stated.: informational (accepted)
