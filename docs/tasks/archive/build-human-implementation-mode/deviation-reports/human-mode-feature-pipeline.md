## Deviation report — human-mode-feature-pipeline

### API surface changes
- **Planned:** Add a human-mode feature execution protocol covering collaborative architecture-spec planning, per-slice human handoff, read-only verifier-first fast failure, findings approval, separate landing, and collaborative whole-task refactoring.
- **Actual:** `skills/implement-task/resources/feature/human.md` documents all planned stages and approval boundaries; `tests/skills.test.ts` adds structural coverage for them.
- **Impact:** No public runtime API changes. The next integration slice can rely on the documented human feature resource contract.

### Abstraction usage
- Used/was specified: yes — the resource references the existing architecture-spec flow, dependency-level ordering, `slice-verifier`, `deviation-reporter`, `code-reviewer`, and `land-worker` roles, and preserves autonomous feature behavior.

### Out-of-scope changes
- None. Changes are limited to the human feature resource and its structure tests.

### Task doc update needed?
No — no implementation notes are needed.

### User attention needed?
No — no API surface or scope divergence was found.
