## Deviation report — human-mode-resource-routing

### API surface changes
- **Planned:** Preserve `skills/implement-task/resources/feature.md` and `bug.md` as slim routers; add `feature/{autonomous,human}.md` and `bug/{autonomous,human}.md`, with clear human/manual prose selecting human mode and ambiguous wording prompting confirmation.
- **Actual:** Implemented both top-level routers and all four nested resources. The routers document clear phrase variants, ambiguity confirmation via `ask_user_question`, and autonomous fallback. The autonomous files are byte-for-byte equivalent to their pre-slice top-level counterparts.
- **Impact:** Downstream human feature/bug slices can fill in the nested `human.md` resources without changing the stable top-level paths. Autonomous behavior remains available through the routers.

### Abstraction usage
- Used/was specified: yes — existing top-level resource dispatch paths, existing autonomous resource content, and `ask_user_question` are referenced. Structure tests in `tests/skills.test.ts` cover router/resource layout and cross-references.

### Out-of-scope changes
- No human pipeline implementation was added; `feature/human.md` and `bug/human.md` are protocol placeholders as required by this routing slice.
- Updated `tests/skills.test.ts` to assert the nested autonomous paths and routing contracts; no source, application, or manifest files changed.

### Task doc update needed?
no — implementation matches the slice and architecture specification; no new implementation note is required.

### User attention needed?
no — no API surface or scope divergence found.

## Review findings

- No blockers or deviations found. The autonomous resource copies match the original resources exactly.
- `npx vitest run tests/skills.test.ts` passed: 1 test file, 120 tests.

## Residual risks

- Natural-language intent matching is currently documented in router prose rather than implemented as a runtime parser; the human-mode pipeline slices must preserve and operationalize this contract.
- The repository-wide suite may remain affected by pre-existing dependency/environment failures reported by the verifier; this slice-specific structure suite is green.
