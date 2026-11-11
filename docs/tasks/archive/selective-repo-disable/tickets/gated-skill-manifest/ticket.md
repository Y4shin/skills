---
type: ticket
subtype: feature
title: Static manifest of the 10 gated workflow skills
status: deprecated
workflow_state: done
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

Landed from the re-verified ticket branch (f23632a) with a --no-ff merge (fb0fc34) onto a fresh landing branch task/gated-skill-manifest created at the merge base ae0af7e (no prior task branch existed for this ticket); the ticket branch was deleted after the merge, and the deviation report landed in commit 8b8329c. The manifest lives in src/disclosure.ts: GATED_SKILL_NAMES, a readonly array of exactly the 10 settled names, exported directly above SKILL_REGISTRY; the /skill: invocation block (src/pi.ts:114) and the prompt strip (src/pi.ts:158) read the import; loadGatedSkillNames and the 8-name fallback constant are gone; session-start diagnostics survive as the narrowed loadSkillNameDiagnostics(), which derives no names and only warns on a genuine package.json read failure. Deliberate behavior change shipped by this ticket: in gated repos the strip and invocation gate now cover only the 10 workflow skills instead of all 31 pi.skills basenames, so generic skills (tdd, research, grilling, and the rest) stay in the system prompt and invocable via /skill: in work repos; ungated repos behave exactly as before. docs/repo-gating.md still documents the old all-skills strip until repo-gating-docs-resync lands. Consistency tests live in tests/skills.test.ts (gated skill manifest describe): the exact 10-name literal, every manifest name as a pi.skills basename, and registry entries outside the manifest exactly ["skill-creator"] (three of the 10 names own no toolset and therefore have no registry entry). tests/gate-factory.test.ts grew three manifest-driven behavior tests. Diagnostic wording changed: the prefix skill-strip: became gated-skill manifest:, and the fallback wording is gone. Tests on the landed branch: the ticket's own tests pass; the full suite is 31 failed / 1332 passed with a failure set identical to the proven main baseline (dependency desync plus local .venv corpus pollution), so AC 4 holds as no new failures relative to main. Carry-forwards: the stale gate-factory fixture comment (runtime derives the list from pi.skills) is pre-assigned to gated-tool-registration; the session-start package.json read-failure diagnostic has no test (module-load-time behavior, untested before and after this ticket).
