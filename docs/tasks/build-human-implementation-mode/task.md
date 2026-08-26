---
kind: task
type: feature
slug: build-human-implementation-mode
title: Add human-owned implementation mode with read-only verification
map: human-implementation-mode
status: ready
blocked_by:
  - decide-human-implementation-mode
slices:
  - human-mode-resource-routing
  - human-mode-feature-pipeline
  - human-mode-bug-pipeline
  - human-mode-integration-coverage
---

## User-visible outcome

When a user invokes implementation with prose clearly requesting that they implement the task themselves or use human/manual mode, the workflow collaborates on planning, hands each slice to the human without writing slice code, runs a read-only verification chain with fast failure, presents findings for explicit approval, and only then invokes landing. Without that intent, the existing autonomous feature and bug workflows behave unchanged.

## Scope

- Keep `resources/feature.md` and `resources/bug.md` as slim routers.
- Move the current autonomous resources to `resources/feature/autonomous.md` and `resources/bug/autonomous.md` unchanged in behavior.
- Add `resources/feature/human.md` and `resources/bug/human.md` implementing the settled human-mode protocol.
- Detect clear human/manual intent from prose after the task reference; ask for confirmation on genuinely ambiguous wording.
- Feature human mode: interactive architecture-spec planning with explicit consent before implementation.
- Bug human mode: collaborative reproduction/diagnosis planning with explicit consent before implementation.
- Per slice: non-code context and verification contract, human implementation, read-only verifier-first fast-fail chain, findings presentation, explicit approval, then landing.
- Whole-task collaborative refactoring after all slices land.
- Preserve autonomous mode and existing task graph/finalization concepts.

## Out of scope

- Human mode for research, prototype, grilling, or manual tasks.
- Autonomous implementation fixes in verification agents.
- Removing or silently changing the existing autonomous pipeline.

## Acceptance criteria

- The router files are the only resources referenced by the implementation skill for feature and bug dispatch.
- Autonomous behavior is preserved in the two new `autonomous.md` resources.
- Human mode handles feature and bug tasks according to the approved grilling decisions.
- Verification agents have explicit read-only tool permissions and cannot edit repository content.
- Verifier failure returns promptly to the human and does not invoke later verification/landing steps.
- Findings require explicit human approval before landing, next-slice progression, or task completion.
- Tests cover routing, ambiguity confirmation, read-only chain behavior, approval gates, and autonomous compatibility.

## Existing abstractions to use

- `skills/implement-task/SKILL.md` resource dispatch.
- Existing feature and bug resources, `tdd-worker`, `slice-verifier`, `deviation-reporter`, `land-worker`, task tools, and current test structure.
- Existing natural-language interaction and subagent tool permission mechanisms.

## Architecture decisions

- Human mode is opt-in through permissive invocation prose; ambiguous intent asks for confirmation.
- Planning is collaborative and has an explicit consent gate before implementation.
- No slice code, including tests, is written before the per-slice handoff; after handoff, code assistance requires an explicit human request.
- The pre-landing agent chain is read-only and verifier-first with fast failure.
- Landing is separate and approval-gated.
- Refactoring is a collaborative whole-task phase after landing.
- Resource layout: top-level routers plus `feature/{autonomous,human}.md` and `bug/{autonomous,human}.md`.

## Implementation notes

- Slice `human-mode-resource-routing` landed: split feature and bug dispatch behind slim top-level routers, preserved autonomous resources byte-for-byte, and added human-mode placeholders plus routing/ambiguity contracts. Structure tests passed (`npx vitest run tests/skills.test.ts`, 120/120). The existing deviation report records no blockers; the full project suite remains a residual risk due to pre-existing dependency/environment failures.
- Slice `human-mode-feature-pipeline` landed: documented collaborative architecture-spec consent, per-slice human handoff, read-only verifier-first fast-fail checks, approval-gated findings and landing, and post-task collaborative refactoring, with structural coverage. Structure tests passed (`npx vitest run tests/skills.test.ts`, 125/125). Its deviation report records no blockers; the full project suite remains a residual risk due to the blocked dependency/environment gate.
- Slice `human-mode-bug-pipeline` landed: documented collaborative reproduction/diagnosis consent, human implementation handoff, read-only verifier-first fast-fail checks, findings approval, and separate landing while preserving the autonomous bug path. Structure tests passed (`npx vitest run tests/skills.test.ts`, 129/129). Its deviation report records no blockers; repository-wide verification remains a residual risk from the pre-existing dependency/environment gate.
