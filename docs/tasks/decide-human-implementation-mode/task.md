---
kind: task
type: grilling
slug: decide-human-implementation-mode
title: Decide the collaborative human-implementation workflow
map: human-implementation-mode
status: done
blocked_by: []
---

## Decision to settle

Decide how the task workflow should enable a human-owned implementation mode for feature and bug tasks: collaborative planning before slices begin, a handoff to the human before implementing each slice, LLM-run tests and review afterward, collaborative refactoring, and return-to-human behavior when verification finds a problem.

## Parent decisions it depends on

- The map destination and scope: feature and bug implementation tasks are in scope; other task types remain unchanged unless explicitly expanded.
- The human owns implementation changes, while the LLM owns surrounding verification work.

## Choices already known

- Per-slice handoff before implementation, after all task-level planning is collaboratively settled.
- LLM runs tests and review after implementation.
- Refactoring phases are collaborative rather than autonomous.
- Verification problems return control to the human with actionable findings.
- The mode is selected through invocation prose after the task reference, rather than a strict flag or task metadata field.

## Decisions recorded

### Mode selection

The human-owned mode is an invocation-level opt-in expressed in natural-language prose after the task reference. Phrases such as “I want to implement this myself” or “Use human/manual mode” should select it. The parser should be intentionally permissive rather than requiring a strict command-line flag. Clear human/manual intent selects human mode; genuinely borderline wording triggers a confirmation question before execution. Existing autonomous behavior remains the fallback when the prose does not request human/manual mode.

## Recommended starting answer

Keep the natural-language trigger narrow enough to recognize clear intent, while accepting reasonable wording variants. Introduce the mode without removing the existing autonomous pipeline, and split human mode into clear phases: collaborative planning, per-slice human implementation, LLM verification, and collaborative refactoring. Treat verification output as evidence and findings, not permission for the LLM to edit implementation code.

### Architecture-spec planning

The collaborative planning phase applies specifically to the architecture specification created at the start of feature tasks. It is an interactive back-and-forth whose length depends on the task: the LLM drafts and investigates, and the human answers questions, resolves decisions, and steers revisions. Before the workflow switches from architecture planning to implementation, it must present a review gate and receive explicit human consent. No slice implementation begins without that consent.

### Per-slice handoff and code boundary

For each approved slice, the LLM prepares the slice context and verification contract: acceptance checks, relevant test seam, and other non-code guidance. Before handoff, the LLM must not write slice code, including tests. The human then owns implementation of the slice. After handoff, the LLM may write tests, functional code, or other code only when the human explicitly asks it to collaborate on that work. Without such a request, the LLM remains in a verification/review role.

### Explicit approval gates

Use separate, named approval prompts at every transition: approve the architecture/reproduction plan before implementation begins, approve each slice after its read-only verification findings before invoking landing and moving on, and approve task completion after the whole-task verification/refactoring result. Approval must be an unambiguous affirmative response to the relevant prompt; it must not be inferred from unrelated prose.

### Resource split and routing

For every task type that supports human mode—currently feature and bug—provide three separate resource files: an autonomous resource preserving the current behavior, a human-mode resource implementing this workflow, and a slim router resource. The skill file references only the router. The router selects the human-mode resource when the invocation prose requests human/manual mode, and otherwise selects the autonomous resource. Human-mode resources include the agreed planning, consent, read-only verification, fast-fail, approval-gated landing, and collaborative-refactoring behavior.

The current top-level resource filenames remain the routers for compatibility. The mode-specific files move into a subdirectory so ordinary directory listings are less likely to expose them before the router is read:

- `resources/feature.md` → slim router
- `resources/feature/autonomous.md` → current autonomous feature resource
- `resources/feature/human.md` → human-mode feature resource
- `resources/bug.md` → slim router
- `resources/bug/autonomous.md` → current autonomous bug resource
- `resources/bug/human.md` → human-mode bug resource

### Bug-task planning

Bug tasks use the existing reproduction/diagnosis result as their planning artifact instead of the feature path's architecture specification. In human mode, the LLM and human collaborate on the cause, regression seam, acceptance criteria, and scope; an explicit consent gate is required before handing the bug slice to the human for implementation.

### Collaborative refactoring

Refactoring remains a separate whole-task phase after all slices have been verified, explicitly approved, and landed. The LLM proposes refactoring priorities and discusses them with the human; no refactoring is performed without collaborative agreement and the human's consent. This phase is distinct from per-slice verification and landing.

### Verification chain and fast failure

After the human's implementation handoff, the workflow should retain the downstream agent chain rather than replacing verification and review. The verifier should run first as a fast-fail gate; if tests fail, the workflow immediately returns actionable failures to the human for correction. Only after verification passes should the remaining downstream agents run.

In human mode, the pre-landing agent chain is strictly read-only: agents must not edit implementation, tests, task files, or other repository content. Their tool permissions must explicitly exclude editing/writing tools. The chain produces findings and evidence for the human. Before moving to the next slice—or declaring the task complete—the workflow presents the chain findings and requires the human's explicit approval.

The landing agent remains part of the workflow but not part of the post-implementation verification chain. It runs only after the human explicitly approves the findings, and then lands the slice as in the normal workflow. This is the intentional exception to the read-only verification-chain rule: landing is approval-gated and has the permissions needed to commit/archive/update workflow state.

## Final decision

The three-resource split preserves the current top-level `feature.md` and `bug.md` paths as routers. Autonomous and human resources live below `resources/feature/` and `resources/bug/` as `autonomous.md` and `human.md`. This keeps the skill's references stable while reducing accidental direct discovery of mode-specific resources.

## Alternatives rejected

- Flat names such as `feature-autonomous.md` and `feature-human.md`: rejected because the mode-specific files should be hidden from ordinary top-level directory discovery and the router should remain the obvious entry point.
- A strict CLI flag or task metadata field: rejected in favor of permissive invocation prose with confirmation for genuinely ambiguous intent.
- Autonomous fixes during verification: rejected; verification agents are read-only and return findings to the human.
- Automatic landing: rejected; landing is approval-gated.

## Dependent-task implications

Create a feature task to split and route the existing feature and bug resources, implement the human-mode feature and bug pipelines, preserve autonomous behavior, and add regression/structure coverage. It should be sliced so the routing foundation lands before the feature and bug human-mode paths, with final integration coverage after both paths exist.

## Remaining fog

- Exact implementation of natural-language intent detection and the ambiguity confirmation UX.
- Exact read-only tool allowlists for each verification agent and the approval/landing state transitions.
- Whether collaborative refactoring needs a new agent or can reuse the existing parent/refactor interaction.

## Downstream work this may create

- A feature task to add the mode's representation and routing to `implement-task`.
- A feature or workflow task to implement the collaborative planning and per-slice handoff protocol.
- A feature task to adapt tests/review agents and evidence reporting for human-owned slices.
- A feature task to define collaborative refactoring checkpoints and resume behavior.
- Documentation and structure-test updates, plus regression tests for autonomous-mode compatibility.
- Additional grilling, research, or prototype tasks if the implementation mechanism cannot be decided from the repository.
