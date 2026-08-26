---
kind: map
slug: human-implementation-mode
title: Enable collaborative human implementation with LLM verification
status: active
tasks:
  - decide-human-implementation-mode
  - build-human-implementation-mode
---

## Destination

Enable a workflow mode in which the human implements each feature or bug slice, while the LLM handles surrounding planning and verification: collaborative planning before slices begin, handoff before each slice's implementation, automated tests and review afterward, and collaborative refactoring whenever verification identifies work to do. Verification findings return control to the human rather than triggering autonomous implementation fixes.

## Constraints

- Feature and bug tasks are in scope; research, prototype, grilling, and manual tasks remain on their existing paths unless a later decision expands scope.
- Planning before slice execution is collaborative rather than fully autonomous.
- The human owns implementation changes for each slice.
- The LLM may run tests and perform review, but refactoring decisions and refactoring phases are collaborative.
- Verification failures pause and return actionable findings to the human.
- Preserve the existing task graph, slice, TDD, verification, checkpoint, and finalization concepts unless the grilling task decides otherwise.

## Decisions so far

- The desired mode is per-slice human implementation, not a single handoff for an entire task.
- The LLM should continue to provide tests and review around the human's implementation.
- The human and LLM should collaborate on refactoring.
- Feature and bug tasks should support the mode.
- Human mode is requested through permissive natural-language prose after the task reference, with clear phrases such as “I want to implement this myself” or “Use human/manual mode.”
- Clear human/manual intent selects human mode; genuinely ambiguous intent requires confirmation.
- Autonomous mode remains the fallback when human/manual intent is not expressed.
- Human-mode planning is an interactive back-and-forth focused on the feature task's initial architecture specification; the workflow requires explicit consent at a review gate before switching to implementation.
- Before each slice handoff, the LLM may prepare context and a verification contract but must not write code, including tests. After handoff, it may write code only when the human explicitly requests collaborative implementation.
- The pre-landing verification agent chain is explicitly read-only and must not edit implementation, tests, task files, or other repository content.
- The verifier is a fast-fail gate; if tests fail, findings return immediately to the human. After the chain reports, explicit human approval is required before the next slice or task completion.
- The landing agent is excluded from the verification chain and runs only after explicit human approval; it may perform the normal landing/commit/state updates.

## Fog

- Where the mode is selected and how it is represented (invocation, task/map frontmatter, repository setting, or another mechanism).
- The exact per-slice collaboration protocol and handoff/resume contract after architecture-spec approval.
- How the LLM verification phase reports pass/fail, review findings, and evidence without taking ownership of implementation.
- How the approval-gated landing agent is invoked and what evidence it consumes.
- Exact filenames and compatibility strategy for the autonomous/human/router resource split.
- The top-level `resources/feature.md` and `resources/bug.md` remain routers; mode-specific resources live in `resources/feature/{autonomous,human}.md` and `resources/bug/{autonomous,human}.md`.
- Refactoring is a separate whole-task phase after all slices are verified, explicitly approved, and landed; proposals and changes require collaboration and consent.
- Bug tasks use collaborative reproduction/diagnosis planning and require explicit consent before implementation, rather than using a feature architecture specification.
- Feature and bug execution each gain three resources: autonomous (current behavior), human-mode, and a slim router. The skill references only the router; the router chooses based on human/manual intent.
- How commits, worktrees, retries, deviations, and finalization change under human ownership.
- Whether existing autonomous mode remains available and how the two modes coexist.

## Out of scope

- Redesigning unrelated task types or replacing the existing dependency graph.
- Automatically fixing implementation defects without explicit human collaboration.
- Replacing the existing autonomous behavior; it remains available through the routers' fallback path.
- Making implementation tasks complete from Wayfinder; completion remains the responsibility of execution/finalization.
