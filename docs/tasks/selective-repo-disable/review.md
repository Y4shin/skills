---
type: review
title: Review of selective-repo-disable
dispositioned: true
---

# Review of selective-repo-disable

A holistic, read-only review of the effort at close time: the map's claim and success test against what landed, the specification's user stories against the delivered code, the architecture document's fit, the tickets with their implementation notes and deviation reports, the changelog, and the whole diff (the effort's planning commit through the current `main`, including the post-landing dependency resync and the corpus-walker fix).

## The effort's claim

The map's destination and success test are delivered and verified: in a gated work repo the 10 workflow-family skills are stripped and their invocations blocked through one exported manifest pinned by consistency tests; only the passive tools, the skill-creator tools and `notify_user` register; the write lockdown is keyed on its own workflow-enabled condition and does not fire there; `tw_open` offers only non-gated registry entries and refuses every manifest name; `docs/repo-gating.md`, the README and the skill-creator page and reference describe the surface, pinned by doc-content tests. The classification contract is unchanged, ungated repos are unchanged, and the advisory end-of-effort review (recorded in `end-of-effort-review.md`, its standards findings fixed by the coherence commit) found the delivered code correct on both its axes. The suite is now green absolutely after the machine's dependency resync.

One claim does not survive the current dependency set, and it is the review's one material finding: the specification's user story 8 wants the shipped subagents' children to not fail at launch, and the effort's terminal ticket accepted the duty of stating the pi-subagents launch behaviour "from its own source" with any inaccurate warning wording corrected. That verification ran against pi-subagents 0.34.0 because that was what `node_modules` held while the lockfile already declared 0.84.0. On the declared and now-installed 0.84.0, an allowlisted tool that never registers fails the child's run at agent start, and 10 of the 11 shipped agent allowlists name `submit_feedback`, a pi-telemetry tool. In the exact scenario the shipped session-start warning describes (pi-telemetry missing), every chain child now fails, while the warning says the chain still launches and only the feedback row is lost. The finding was verified against the 0.84.0 source and reproduced empirically (an agent allowlisting a never-registering tool ran, replied, and its run was marked failed with "requested unavailable child tools").

## The delivered code

Correct and tested: the advisory review read the full diff in fresh contexts and found no missing or wrong requirement; the coherence pass resolved its findings (unused parameter, test-fixture name collision, the skill-creator docs page) and the suite is green. The residuals below are records, not defects in behaviour.

## Findings and dispositions

1. **The shipped launch-behaviour record is false on the current dependency set** (`src/pi.ts:3832` warning and comment, `docs/repo-gating.md` subagent-launch section, `README.md`, `skills/engineering/skill-creator/references/target-pi.md`, two pinned peer-warning tests): pi-subagents 0.84.0 fails a child whose allowlisted tool never registers, so with pi-telemetry absent the shipped chains' children fail at agent start instead of launching with lost feedback rows. Dispositioned as an implementation ticket in this effort: `subagent-availability-resync`, which corrects the warning, the docs and the pinned tests to the version-pinned 0.84.0 shape.
2. **`skills/engineering/skill-creator/SKILL.md` still says skill-creator is opened "nested inside a phase"**: the docs page was re-synced and the behaviour and its tests agree, so this is stale wording in shipped prose, recorded and accepted; the AGENTS.md duty names the docs page, which was met.
3. **The effort's planning records still carry the pre-verification pi-subagents claim** (`map.md` non-negotiable facts, hedged as "asserted by this package, not yet verified"; `tasks/tool-use-inventory/task.md`, stated flat): the fix lives under `docs/tasks/`, which this phase has no writer for; they stay as dated history, and the living architecture document carries the verified shape (to be re-recorded for 0.84.0 by the ticket above and its reconcile).
4. **`docs/ideas/gate-skills-by-repo.md` still describes the pre-narrowing proposal**: a historical idea artifact, recorded and accepted.
5. **`docs/testing.md` gained four testing-guidance additions no specification line asked for** (flagged by the advisory review as unrecorded scope creep): accepted per that review's own verdict, consistent with the repo's testing-lessons convention; the additions proved useful immediately (the relative-gate protocol governed every suite gate of this effort).

## Reconcile

The architecture document was reconciled after the last landing by the end-of-effort pass's reconciler and recorded through the architecture writer (commit 299a681); the only later change, the corpus-walker `.venv` skip (e6ea1e0), touches no surface the architecture records. The 0.84.0 finding above will need its own reconcile line once the ticket lands.

## Dispositions

- The shipped launch-behaviour record is false on the current dependency set: pi-subagents 0.84.0 fails a child whose allowlisted tool never registers, so with pi-telemetry absent the shipped chains' children fail at agent start; the warning, the doc section, the README, the skill-creator reference and two pinned tests state the 0.34.0 shape.: ticket `subagent-availability-resync`
- skills/engineering/skill-creator/SKILL.md still says skill-creator is opened nested inside a phase; the docs page was re-synced and the behaviour and tests agree, so this is stale wording in shipped prose, accepted.: informational (accepted)
- The effort's planning records still carry the pre-verification pi-subagents claim (map.md non-negotiable facts hedge, tasks/tool-use-inventory/task.md flat statement); the fix lives under docs/tasks/ which this phase cannot write, and they stay as dated history.: informational (accepted)
- docs/ideas/gate-skills-by-repo.md still describes the pre-narrowing proposal; historical idea artifact, accepted.: informational (accepted)
- docs/testing.md gained four testing-guidance additions no specification line asked for; accepted per the advisory end-of-effort review's own verdict and consistent with the repo's testing-lessons convention.: informational (accepted)
