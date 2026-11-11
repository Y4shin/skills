---
type: ticket
subtype: feature
title: Split tool registration by gate state and re-key the write lockdown
status: deprecated
workflow_state: done
blocked_by:
- gated-skill-manifest
size: m
---

## What to build

In a gated (work) repo, the extension registers the passive tool set `tw_open`, `tw_close`, `tw_feedback`, the three skill-creator tools (`skill_validate`, `skill_scaffold`, `skill_discover`, registered inactive as today), and `notify_user` (which moves out of the ungated-only branch of the entry point); every other `tw_*` tool stays unregistered. In an ungated repo the registration surface is unchanged. The `docs/tasks/**` write lockdown stops registering behind the plain "gate inactive" boolean and gets its own explicit "workflow enabled in this repo" condition, with refusal wording and the two exemption segments unchanged; the transcript declared-set replay stays on the same workflow-enabled condition. The stale "gated five" factory fixture and its now-flawed strip assertions are replaced by dual gate-state factory tests: gated registers exactly the passive set plus the skill-creator tools plus `notify_user`, ungated registers the full surface.

## Acceptance criteria

- [ ] In the gated shape, the registered tool set is exactly {tw_open, tw_close, tw_feedback, skill_validate, skill_scaffold, skill_discover, notify_user}.
- [ ] In the ungated shape, the full tool set and `notify_user` register as today; no visible change.
- [ ] The write lockdown fires in an ungated repo and does not fire in a gated repo, driven by an explicit workflow-enabled predicate, not by the gate boolean.
- [ ] `restoreDeclaredSetFromTranscript` is skipped in gated repos.
- [ ] The dual gate-state factory tests pass; the stale fixture and its test are replaced; the full test suite is green.

## Blocked by

- `gated-skill-manifest` (the manifest is consumed by the strip and invocation handlers whose behaviour these tests pin).

## Implementation notes

Architecture lessons from the knowledge harvest: the architecture's sentence "the peer-extension checks (pi-subagents, pi-telemetry) stay" was ambiguous about where they fire; the implementer read it as "keep firing in gated repos", inverting the previously pinned test "work repo skips session_start peer warnings", and the orchestrator accepts that reading (the sentence's justification clause, tw_feedback and the subagents in gated repos, only makes sense that way). If the reading is ever judged wrong, the revert is confined to the session_start handler and that one test. The architecture's "export to the next ticket" phrase turned out to be a handed-forward guarantee, not a code export: tw-open-gated-restriction consumes the registered tw_open through the normal registerTool surface, and the new names GATED_REGISTERED_TOOLS, SKILL_CREATOR_TOOL_NAMES and workflowEnabled are module-private with no new exports.

Landed from the re-verified ticket branch (e939886) with a --no-ff merge (9eac2da) onto a fresh landing branch task/gated-tool-registration created at the merge base 9c26ba3 (no prior task branch existed for this ticket); the ticket branch was deleted after the merge, and the deviation report landed in commit ef43341 together with the workflow tracker's own task line in docs/tasks/state.yaml (untouched by the landing, committed verbatim). Tool registration is now a pure function of the gate result in src/pi.ts: a gated repo registers exactly tw_open, tw_close, tw_feedback plus the skill-creator trio (skill_validate, skill_scaffold, skill_discover, registered inactive as today) through the same shared registerTool loop, notify_user moved out of the ungated-only branch and registers in both states, and an ungated repo keeps the full surface with no visible change. A new module-private workflowEnabled(gate) predicate owns both the docs/tasks/** write-lockdown tool_call handler and restoreDeclaredSetFromTranscript, replacing the raw gate-boolean branch; refusal wording (lockdownReason) and the two exempt segments (.work/ and deviation-reports/) are untouched, the lockdown fires in ungated repos and never in gated ones, and gated resume never calls setActiveTools. The session-start early return is gone: gate diagnostics and the peer-extension checks (pi-subagents, pi-telemetry) now fire in both gate states, while the prompt strip and the /skill: invocation hooks stay gated-only; the stale test "work repo skips session_start peer warnings" was replaced by its inverse on purpose (the architecture reading is recorded in the harvest note above; the revert is confined to the session_start handler and that one test). No new public surface: GATED_REGISTERED_TOOLS, SKILL_CREATOR_TOOL_NAMES and workflowEnabled are module-private, and the architecture's "export to the next ticket" is a handed-forward guarantee (a registered tw_open in both states, which tw-open-gated-restriction restricts), not a code export. Fixture replacement: the stale GATED_NAMES list was renamed FULL_TOOL_SURFACE with its stale comment corrected; the stale local five-name strip fixture was deleted and the strip tests now bind to the static GATED_SKILL_NAMES manifest imported from src/disclosure.ts, asserting all 10 manifest names stripped and non-manifest skills (oracle, tdd) intact. Tests on the landed branch: tests/gate-factory.test.ts is 34/34 (re-run post-merge); the full suite was 31 failed / 1333 passed with the failure set proven byte-identical to a clean main baseline by reproduction (the two-test delta reproduced on main itself once the checkout's gitignored .venv was copied in, so it is environmental), and both typechecks are error-identical to main with positions stripped. Carry-forwards: tw_feedback and the skill-creator tools register inactive in gated repos, and whether pi-subagents' launch check accepts a registered-but-inactive allowlisted tool is verified against the pi-subagents source by repo-gating-docs-resync, which also owns re-syncing docs/repo-gating.md (its prose still says work repos register no tools); tw_open's gated narrowing and refusal is tw-open-gated-restriction's contract, this ticket only guarantees registration in both states; CORPUS_SKIP_DIRS lacks .venv, so full-suite runs in this checkout show two environmental corpus-scan failures (pre-existing test gap).
