---
type: deviation report
title: Deviation report for skill-report-resources
status: stable
---

## Deviation report: skill-report-resources

Verified against the implementation on branch `ticket/skill-report-resources`
at `b86ca18` (seven wip commits from the landing branch tip `e192408`, the
tip of `task/grilling-delegation-fix`), and against the landed state on
`task/skill-report-resources` at `16da0b5`. Context: this run is the
recovery rerun after the prior chain timed out following tdd and verify;
the rerun re-verified the branch, replayed the deviation report and the
land step, and left the working branch merged.

### API surface changes
- **Planned:** arch-spec entry 13: "exports a per-skill `resources/report.md`.
  Contract: fixed five-part order; no shared report artifact or runtime
  gate." No code exports were promised; the deliverable is prose resources
  plus a prose seam.
- **Actual:** no new exports and no `src/` change at all. The landed change
  is prose plus tests: nine per-skill report resources at
  `skills/engineering/{wayfinder,to-spec,to-tickets,implement-task,finalize-task,triage,setup-workflow,task-workflow-overview,task-workflow-doctor}/resources/report.md`,
  each carrying the fixed five-part order (what is now true; what needs the
  human; what to run next; what is broken or blocked; one pointer to the
  detail) as its only sections, tuned per skill, with the failure and
  escalation variant stated in each intro and the never-inline plus
  simplified-technical-English rules stated at the end; a `## Report`
  pointer section in each of the nine SKILL.md files (no SKILL.md restates
  the shape inline); implement-task's feature/bug autonomous resources
  replaced their thin inline report steps with the pointer; seams 4, 5, and
  6 in `tests/skill-rewire.test.ts` pin the whole contract (five-part order
  per skill, pointer-not-restate, never-inline categories, failure and
  escalation variants in the same shape, the chain and end-of-effort return
  shapes `ok`/`failed`/`error`/`step`/`refs`/`reviewOk` unchanged, and the
  negative-existence pins: no shared report skill, no shared report file,
  no cross-skill report pointer, no runtime report gate); the nine docs
  pages carry one tight bullet each.
- **Impact:** none on dependent tickets' interfaces; no tool surface moved.
  The contract's coverage set is the explicit `WORKFLOW_SKILLS` list in the
  seam (the nine run-ending skills that exist at dispatch). Pending skill
  tickets join the contract by extending that list and adding their own
  report resource; triage/implement-task/finalize-task report resources
  retire together with those skills when intake/implement-ticket/
  finalize-effort land (carry-forward notes below).

### Abstraction usage
- Used/was specified: yes. The ticket builds entirely on the landed prose
  seam (`tests/skill-rewire.test.ts` extended with seams 4, 5, 6, not
  replaced) and the repo's skill/docs layout. Nothing was invented: no
  shared report skill, no shared contract file, no runtime gate, exactly as
  the spec's report pillar requires. The chain
  (`scripts/ticket-chain.js`) and end-of-effort (`scripts/end-of-effort.js`)
  scripts were left untouched (diff confirms), and seam 5 pins their return
  shapes as a preservation contract.

### Out-of-scope changes
- Dispatch-order coverage: this ticket ran before five of its `blocked_by`
  tickets landed (intake-skill, to-spec-rescope, implement-ticket-skill,
  finalize-effort-skill, overview-doctor-rescope), so "each workflow skill"
  covers the nine run-ending skills present at dispatch. The verify step
  saw and accepted this; the seam list makes later joins loud (red suite)
  by construction.
- The report resources for triage, implement-task, and finalize-task
  describe the current (still partially v4) next-step phrasing; their
  re-scope or retire is owned by the pending skill tickets, not by this
  one.
- The per-skill rule wording is intentionally free-form beyond the pinned
  category list and structure (the map's accepted drift risk: no shared
  contract file).
- The recovery rerun created the landing branch itself (branch-model note
  recorded in the implementation note); the working branch was kept because
  the run's own host gate checks `refs/heads/ticket/<slug>` while the chain
  gate requires the task branch to exist; the branch is fully merged and
  the parent may prune it.
- The land commit stages only the ticket directory, preserving the parent's
  unstaged `docs/tasks/state.yaml` pointer flip, matching the landing
  convention of prior tickets.

### Ticket doc update needed?
No. All six acceptance criteria are met on the branch; the implementation
note is appended to the ticket doc's `## Implementation notes` section by
the land step, following the landing convention of the previously landed
tickets.

### User attention needed?
No. No scope changed and no planned surface moved: the report contract
landed exactly as specified (fixed five-part order, no shared artifact, no
runtime gate, chain and end-of-effort return shapes unchanged). The only
divergence is the dispatch-order coverage note above, which the effort's
own arch spec anticipates and which verify accepted.
