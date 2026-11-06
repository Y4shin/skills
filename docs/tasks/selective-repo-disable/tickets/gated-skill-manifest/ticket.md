---
type: ticket
subtype: feature
title: Static manifest of the 10 gated workflow skills
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

One exported, reviewable list of the 10 gated workflow-skill names living beside the skill registry in the disclosure module: task-workflow-overview, setup-workflow, intake, wayfinder, to-spec, to-tickets, implement-ticket, finalize-effort, task-workflow-doctor, workflow-failure. The prompt-strip handler and the `/skill:` invocation block consume the manifest instead of the removed derivation (`loadGatedSkillNames` and its stale hardcoded fallback of 8 names disappear entirely). A bidirectional consistency test pins the manifest against `package.json`'s `pi.skills` basenames and the registry's workflow entries, so a renamed or added skill fails the test instead of silently changing the strip. The session-start skill-name diagnostics keep firing on a genuine package.json read failure.

## Acceptance criteria

- [ ] A single exported constant carries exactly the 10 settled names, beside the skill registry.
- [ ] `loadGatedSkillNames` and the 8-name fallback constant no longer exist; strip and invocation-block handlers read the manifest.
- [ ] A consistency test fails if a manifest name is missing from `pi.skills`, if a workflow registry skill is missing from the manifest, or if the manifest count differs from 10.
- [ ] Existing repo test suite passes with no other behaviour change (ungated repos behave as before).

## Blocked by

None (can start immediately).

## Implementation notes

Architecture lessons from the knowledge harvest: the per-ticket contract line "manifest names are exactly the registry workflow skills" was not literally implementable, because three of the settled 10 names (task-workflow-overview, task-workflow-doctor, workflow-failure) own no toolset and therefore have no SKILL_REGISTRY entry. The implementable rule pins the registry's complement to exactly ["skill-creator"] plus the exact 10-name literal, which covers all three failure modes the acceptance criteria name. The consistency tests live in tests/skills.test.ts rather than tests/disclosure.test.ts because that file already reads package.json and imports SKILL_REGISTRY; disclosure.test.ts holds tool-behavior tests for tw_open, tw_close and tw_next.
