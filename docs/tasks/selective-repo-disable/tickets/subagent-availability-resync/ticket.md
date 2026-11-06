---
type: ticket
subtype: bug
title: State the pi-subagents 0.84.0 child-tool availability shape in the warning and docs
status: stable
workflow_state: done
blocked_by: []
size: s
---

## Defect record

The session-start peer warning (`src/pi.ts:3832`, comment at `src/pi.ts:3654`) and the "Subagent launch behaviour" section of `docs/repo-gating.md` (with the same claim in `README.md` and `skills/engineering/skill-creator/references/target-pi.md`) state the shape verified against pi-subagents 0.34.0: "a child still launches when a listed tool is missing: pi-subagents does not check the allowlist at launch" and the missing peer costs only the feedback row. The two pinned peer-warning tests assert that wording.

On the lockfile-declared and now-installed pi-subagents 0.84.0 that shape is false. Verified against the 0.84.0 source: every plain name in an agent's `tools` allowlist becomes a required child tool (`child-tool-plan.js` derives `requiredChildTools` from `requestedBuiltinTools`), and the child's `agent_start` hook (`subagent-prompt-runtime.js`) fails the run when a required tool never registers, with the error "Agent '<name>' requested unavailable child tools: <tool>." (formatter in `tool-availability.js`).

Reproduction (2026-11-06, pi-subagents 0.84.0): an agent with `tools: read, totally_bogus_probe_tool` was dispatched; the child launched, replied, and the run was marked failed with exactly that error. A never-registering allowlisted tool no longer passes silently.

Consequence for this package: 10 of the 11 shipped agent allowlists name `submit_feedback`, a pi-telemetry tool. In the exact scenario the peer warning describes (pi-telemetry not installed), every workflow chain child's run now fails at agent start, so the warning's "the chain still launches, the feedback row is lost" misleads the operator debugging a broken chain, and the specification's user story 8 ("the children do not fail at launch") is violated on the current dependency set.

## What to build

Verify the 0.84.0 shape against the installed source, then correct the record everywhere it is stated: the session-start warning text in `src/pi.ts` (keeping the pinned "allowlist" wording and the install command), the doc section, the README paragraph, and the skill-creator reference. State it version-pinned: on pi-subagents 0.84.0 a missing allowlisted extension tool fails the child's run at agent start, so with pi-telemetry absent the shipped chains do not run; install pi-telemetry before dispatching them. Re-pin the two peer-warning tests and any doc-content test asserting the launch section. The 0.34.0 history stays as the verification record it is.

## Acceptance criteria

- [ ] The session-start warning states the verified 0.84.0 consequence for a missing pi-telemetry: chain children fail their runs with "requested unavailable child tools", not "the chain still launches".
- [ ] `docs/repo-gating.md`, `README.md`, and `skills/engineering/skill-creator/references/target-pi.md` carry the corrected, version-pinned shape.
- [ ] Both peer-warning tests and any doc-content test asserting the launch section are re-pinned to the corrected wording.
- [ ] The full test suite passes.

## Out of scope

Redesigning the shipped agents' allowlists (for example dropping `submit_feedback` to soften the pi-telemetry dependency) is a separate decision; this ticket corrects the record, not the allowlists.

## Blocked by

None (can start immediately).

## Implementation notes

Architecture lessons from the knowledge harvest: the defect's root cause was verification against the installed copy rather than the lockfile-declared version (pi-subagents 0.34.0 sat in node_modules while the lockfile declared 0.84.0), so the shipped record was invalidated by the dependency resync; the durable rule, now also in docs/testing.md, is that a ticket verifying another package's behaviour pins the version and verifies against the lockfile-declared version. The 0.84.0 mechanism, verified from source: every plain name in an agent's tools allowlist becomes a required child tool (child-tool-plan.js, requiredChildTools from requestedBuiltinTools), and the child's agent_start hook fails the run with "Agent '<name>' requested unavailable child tools: <tool>." when a required tool never registers; path-like allowlist entries load extensions and are not requirements. Two divergences from the ticket doc, both reasonable: skills/engineering/skill-creator/references/target-pi.md never actually carried the 0.34.0-era claim (grep and git log -S proved the ticket doc wrong there), so a new section was added rather than correcting existing text, and one new doc-content test pins the README and target-pi wording so criterion 2 is test-verified rather than prose-only. The globally installed pi-subagents 0.86.0 shows the same shape in its source; the record stays pinned to the lockfile version 0.84.0 by design. Residual: the shipped agents' allowlists still name submit_feedback (explicitly out of scope), so without pi-telemetry the shipped chain children fail at agent start; installing pi-telemetry before dispatching chains remains the operator's obligation.

Landed from the verified ticket branch (e597d59, commits 7d9dddf + e597d59) with a --no-ff merge (7368ad0) onto a fresh landing branch task/subagent-availability-resync created from main (865a4fd); the ticket branch was deleted after the merge, and the bug flow has no deviation report, so the docs commit (8671258) carries only the workflow tracker's task pointer in docs/tasks/state.yaml, committed verbatim as the tracker set it. The ticket corrects the pi-subagents child-tool availability record to the verified 0.84.0 shape: every plain name in an agent's tools allowlist is a required child tool (child-tool-plan.js derives requiredChildTools from requestedBuiltinTools), and the child's agent_start hook fails the run with "Agent '<name>' requested unavailable child tools: <tool>." when a required tool never registers, so with pi-telemetry absent the shipped chains' children do not run. The session-start pi-telemetry warning in src/pi.ts and the GATED_REGISTERED_TOOLS comment the ticket names now state this consequence, keeping the pinned "allowlist" wording and the pi install npm:@y4shin/pi-telemetry command; docs/repo-gating.md's "Subagent launch behaviour" section, README.md's install paragraph, and a new "The peer packages and the subagent allowlists" section in skills/engineering/skill-creator/references/target-pi.md carry the same version-pinned shape with a re-verify-on-upgrade note; both peer-warning tests in tests/gate-factory.test.ts are re-pinned to the corrected wording (asserting 0.84.0, "requested unavailable child tools", allowlist, the install command, and not "still launches"), the doc-content launch test is re-pinned with negative guards, and one new doc-content test pins the README and target-pi wording. Divergences from the ticket doc: target-pi.md never actually carried the 0.34.0-era launch claim (grep and git log -S confirm the ticket doc was wrong there), so the new section was added to satisfy criterion 2 rather than correcting existing text, and the one new doc-content test goes beyond the ticket's re-pin list so criterion 2 is test-verified rather than prose-only. The 0.34.0 history in docs/tasks/ stays as the verification record. Verification on the landed branch: the merge tree is byte-identical to the verified ticket tip; gate-factory 46/46, full suite 23 files 1376/1376 (baseline 1375 plus the one new test), both typechecks clean. Residuals: the record is version-pinned to pi-subagents 0.84.0 by design, so a future upstream upgrade can stale it again (the doc and the target-pi reference both say to re-verify on upgrade; the globally installed 0.86.0 already shows the same shape, verified during the ticket); the shipped agents' allowlists still name submit_feedback (explicitly out of scope), so without pi-telemetry the shipped chain children fail at agent start, and installing pi-telemetry before dispatching them remains the operator's obligation.
