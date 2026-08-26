# Architecture specification — human-owned implementation mode

## Shared contracts

- `skills/implement-task/SKILL.md` remains the stable dispatcher and continues to reference the top-level `resources/feature.md` and `resources/bug.md` paths.
- Those top-level files become slim routers. Each router receives the task invocation prose and selects either its autonomous or human resource.
- Human intent is clear natural-language prose after the task reference. Clear intent selects human mode; genuinely ambiguous intent pauses for confirmation. No prose preserves autonomous mode.
- Human-mode resources are orchestration prose, not application code. They must distinguish the read-only verification chain from the approval-gated landing agent.
- Verification agents receive only read/inspection and test-running capabilities. They must not edit source, tests, task documents, or configuration. `land-worker` remains separate and runs only after explicit human approval.
- Existing autonomous resources preserve current behavior and remain the fallback.

## Slice: human-mode-resource-routing

### Exports

- Stable router entry points at `skills/implement-task/resources/feature.md` and `skills/implement-task/resources/bug.md`.
- Mode-specific resources at `skills/implement-task/resources/feature/autonomous.md`, `feature/human.md`, `bug/autonomous.md`, and `bug/human.md`.
- A documented natural-language mode-selection and ambiguity-confirmation contract.

### Existing abstractions to use

- Existing resource dispatch paths in `skills/implement-task/SKILL.md`.
- Existing feature and bug resource contents as the autonomous source of truth.
- Existing `ask_user_question` interaction for ambiguity confirmation.

### Do not reimplement

- Do not duplicate the autonomous pipeline in routers.
- Do not change task type routing or invent a new task type.
- Do not replace natural-language invocation with a strict CLI-only flag.

### Seams

- Resource path references in `SKILL.md`.
- Router prose and mode-selection decision tree.
- Manifest/structure tests that discover resource files.

### Interface contract

Later human feature and bug resources are selected only through these routers and may assume the router has resolved human vs autonomous mode.

## Slice: human-mode-feature-pipeline

### Exports

- A human-mode feature execution protocol covering collaborative architecture-spec planning, per-slice human handoff, read-only verifier-first fast failure, findings approval, separate landing, and collaborative whole-task refactoring.

### Existing abstractions to use

- Feature resource architecture-spec flow and dependency-level slice ordering.
- `slice-verifier`, `deviation-reporter`, `code-reviewer`, and `land-worker` roles.
- Existing task state, slice, and approval interaction conventions.

### Do not reimplement

- Do not let the LLM write slice code before handoff.
- Do not let verification agents edit or land.
- Do not remove the autonomous feature flow.
- Do not make refactoring autonomous without consent.

### Seams

- Architecture-spec review/consent transition.
- Human implementation handoff boundary.
- Verifier-first fast-fail chain and read-only permissions.
- Findings-to-approval-to-landing transition.
- Whole-task refactoring consent transition.

### Interface contract

The bug human resource may reuse the shared human-mode protocol concepts, but its planning entry point is diagnosis/reproduction rather than architecture spec.

## Slice: human-mode-bug-pipeline

### Exports

- A human-mode bug execution protocol covering collaborative reproduction/diagnosis planning, explicit implementation consent, read-only verifier-first fast failure, findings approval, and separate landing.

### Existing abstractions to use

- Existing lean bug resource and diagnosing-bugs/reproduction workflow.
- `slice-verifier` and `land-worker`, plus read-only review/deviation roles where applicable.
- Existing task and slice state transitions.

### Do not reimplement

- Do not force bug tasks through feature architecture-spec planning.
- Do not weaken the autonomous bug path.
- Do not allow verifier agents to edit or land.

### Seams

- Diagnosis/reproduction review and consent.
- Human implementation handoff.
- Verifier-first fast failure.
- Findings-to-approval-to-landing transition.

### Interface contract

The bug router selects this resource only for human/manual intent; otherwise the autonomous bug resource remains authoritative.

## Slice: human-mode-integration-coverage

### Exports

- Regression and structure coverage for both routers, both modes, read-only verification, fast failure, approval-gated landing, and autonomous compatibility.

### Existing abstractions to use

- Existing `tests/skills.test.ts` structure and cross-reference assertions.
- Existing Vitest test conventions and manifest/resource discovery.

### Do not reimplement

- Do not test implementation behavior by weakening autonomous assertions.
- Do not introduce a second routing mechanism in tests.

### Seams

- Resource existence and path references.
- Human/autonomous/ambiguous selection prose.
- Agent frontmatter tool permissions.
- Approval and fast-fail protocol text.

### Interface contract

Coverage must validate the contracts exported by the preceding three slices and remain stable if internal prose is refactored.
