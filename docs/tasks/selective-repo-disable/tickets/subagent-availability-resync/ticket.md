---
type: ticket
subtype: bug
title: State the pi-subagents 0.84.0 child-tool availability shape in the warning and docs
status: stable
workflow_state: ready
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
