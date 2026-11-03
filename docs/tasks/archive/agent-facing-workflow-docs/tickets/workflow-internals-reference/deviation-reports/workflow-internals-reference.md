---
type: deviation report
title: Deviation report for workflow-internals-reference
status: stable
---

## Deviation report: workflow-internals-reference

### API surface changes
- **Planned:** `skills/engineering/task-workflow-overview/WORKFLOW-INTERNALS.md` with seven sections in order, referenced from the overview SKILL.md (Internals pointer), plus the workflow-failure router row and the canonical reference sentence verbatim after the operator-communication preamble. No other skill directory touched.
- **Actual:** Exactly that. `WORKFLOW-INTERNALS.md` (364 lines) carries the seven mandated headings in order (`The big picture`, `The artifact tree`, `The main flow: idea to ship`, `The phase-gate state machine`, `The tw_* tools, by phase and disclosure scope`, `The refusal shapes and their legal routes`, `The escalation ladder, in brief`). SKILL.md has the canonical sentence at line 11 directly after the operator-communication preamble, an Internals pointer in the main-flow section, and the Actions-table router row for `/skill:workflow-failure` at line 178. Diff under `skills/` is limited to these two files.
- **Impact:** None for dependent tickets. The exported surface (resource path, pointer naming, router row, canonical sentence placement) matches the architecture document's interface contract, so `thread-reference-everywhere` and `reference-coverage-suite` can build against it as specified.

### Abstraction usage
- Used/was specified: yes. The resource follows the `PHASE-BOUNDARIES.md` deep-layer pattern (capitalized sibling, inline link from SKILL.md), points to the doctor's `resources/opener-refusal.md` conceptually rather than duplicating the refusal catalog, and names `workflow-failure` as the behavior contract without restating the ladder. File-ownership split honored: no edits outside `task-workflow-overview/`.

### Out-of-scope changes
- Committed: none. Only the two owned files changed.
- Noted but not committed by this ticket: `docs/tasks/state.yaml` shows as modified in the worktree (the orchestrator's task pointer); deliberately left unstaged.
- No test additions, per the architecture's assignment of `tests/` to `reference-coverage-suite`. The shipped router test went red-to-green as the one committed criterion signal.

Deviation details (documented, spec-compliant resolutions):

1. **Artifact-tree section vs retired-vocabulary ban.** The ticket asked the artifact tree to be "verbatim faithful to the scanner's rules," but two of the scanner's six container directories (`slices/`, `docs/tasks/maps/`) are banned path shapes under the shipped end-of-effort-reconciliation vocabulary test. Resource states the slug rule generically, names the live containers, and records the tolerated legacy `maps/` scope and the migration's report-and-leave-in-place behavior without the banned tokens. Recorded as a review finding per the ticket's rule; no `src/` change. This is a spec conflict, resolved source-wins.
2. **Mermaid edge labels use the pipe form (`-->|"label"|`).** The independent parser available in the tree (grok-mermaid) drops the quoted dash form mid-label. Both forms are valid mermaid; the canonical pipe form was chosen so the blocks verify with zero warnings everywhere available. No CI impact (the repo has no mermaid CI).

### Ticket doc update needed?
Yes: append to `## Implementation notes` that (a) the artifact-tree section documents the scanner's slug rule generically and names only the live container directories because the retired-vocabulary test bans the `slices/` and `maps/` path tokens in live prose, and (b) mermaid edge labels use the pipe form because the quoted dash form fails the only available independent parser. Both are already recorded in the tdd-worker result and this report.

### User attention needed?
No. The exported API surface matches the interface contract exactly; the two documented deviations are internal wording choices forced by a spec-internal conflict and tooling availability, and both followed the ticket's own review-finding rule.
