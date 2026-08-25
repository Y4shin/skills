## Deviation report — doctor-routing-tests

### API surface changes
- **Planned:** Add two xref assertions to the existing `skill cross-references` describe block in `tests/skills.test.ts`: (1) `skills/task-workflow-doctor/SKILL.md` references `onboard-workflow`; (2) the doctor SKILL.md contains `diagnoses` and `routes` (the not-a-fixer contract).
- **Actual:** Exactly that. Two tests added — `task-workflow-doctor references onboard-workflow` and `task-workflow-doctor has not-a-fixer contract` — at lines 368–377, both inside the `skill cross-references` block, using the existing `readFile` + `expect(...).toContain` pattern.
- **Impact:** None. The routing contract is now locked; a future edit that drops `onboard-workflow`, `diagnoses`, or `routes` from the doctor SKILL.md will fail the test suite.

### Abstraction usage
- Used/was specified: yes. The implementation uses the existing `skill cross-references` describe block, the `readFile` helper, and the `expect(...).toContain` assertion style — exactly as the arch spec directed. No new helpers or patterns introduced.

### Out-of-scope changes
- None. The diff is `tests/skills.test.ts` only (1 file, 11 insertions). The doctor SKILL.md was NOT touched (confirmed: empty diff for `skills/task-workflow-doctor/SKILL.md`). No other files changed in the slice branch diff. The modified `docs/tasks/state.yaml` and the archived slice-1 doc are workflow state/land artifacts, not part of this slice's changes.

### Task doc update needed?
No. The `## Implementation notes` section does not need updating for this slice. The two xref assertions are a clean addition with no divergence to record.

### User attention needed?
No. No scope change, no API surface difference, no out-of-scope additions.
