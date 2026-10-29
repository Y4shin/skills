---
type: deviation report
title: Deviation report for skill-report-resources
status: stable
---

## Deviation report: skill-report-resources

Verified against the implementation on branch `ticket/skill-report-resources`
(seven wip commits from the landing branch tip `e192408`, the tip of
`task/grilling-delegation-fix`). This report was written on the chain's
recovery rerun: the prior chain completed the tdd and verify steps and timed
out before deviation and land, so this run re-verified the branch state
first (branch intact at `b86ca18`, full suite 1,046 passing across 18
files, typecheck clean, working tree carrying only the parent's unstaged
`docs/tasks/state.yaml` pointer) before reporting.

### API surface changes
- **Planned:** arch-spec entry 13: "exports a per-skill
  `resources/report.md`. Contract: fixed five-part order; no shared report
  artifact or runtime gate." No code exports were promised; the deliverable
  is prose resources plus a prose seam.
- **Actual:** no new exports, no `src/` change at all. The landed change is
  prose plus tests: nine per-skill report resources at
  `skills/engineering/{wayfinder,to-spec,to-tickets,implement-task,finalize-task,triage,setup-workflow,task-workflow-overview,task-workflow-doctor}/resources/report.md`,
  each carrying the fixed five-part order as its only sections, tuned per
  skill, with the failure and escalation variant stated in each intro and
  the never-inline plus language rules stated at the end; a `## Report`
  pointer section in each of the nine SKILL.md files; implement-task's
  feature/bug autonomous resources replaced their thin inline report steps
  with a pointer to the report resource; seams 4, 5, and 6 in
  `tests/skill-rewire.test.ts` pin the whole contract; the nine docs pages
  carry one tight bullet each.
- **Impact:** none on dependent tickets' interfaces. The contract's coverage
  set is the explicit `WORKFLOW_SKILLS` list in the seam (the nine
  run-ending skills that exist now); the pending skill tickets join the
  contract by extending that list and adding their own report resource
  (carry-forward notes below). No interface or tool surface changed.

### Abstraction usage
- Used/was specified: yes. The ticket builds entirely on the landed prose
  seam (`tests/skill-rewire.test.ts` extended with seams 4, 5, 6, not
  replaced) and the repo's skill/docs layout. No shared report skill, no
  shared contract file, and no runtime gate was invented, exactly as the
  spec's report pillar requires. The chain (`scripts/ticket-chain.js`) and
  end-of-effort (`scripts/end-of-effort.js`) return shapes were left
  untouched; seam 5 pins them as a preservation contract.

### Out-of-scope changes
- Dispatch ran this ticket before five of its `blocked_by` tickets
  (intake-skill, to-spec-rescope, implement-ticket-skill,
  finalize-effort-skill, overview-doctor-rescope) landed, so "each workflow
  skill" was implemented over the skill set that exists in the tree now:
  the nine run-ending workflow skills. The coverage list is explicit in the
  test seam; each later skill ticket registers into the contract by
  extending it and adding its own report resource, which keeps the suite
  green by construction. triage/implement-task/finalize-task report
  resources retire together with those skills when
  intake/implement-ticket/finalize-effort land.
- Per the map's vocabulary, the discipline and vocabulary skills (grilling,
  tdd, code-review, domain-modeling, codebase-design, diagnosing-bugs,
  research, prototype, skill-review, eval-review,
  resolving-merge-conflicts, wizard, skill-creator,
  improve-codebase-architecture) and the productivity skills are not
  run-ending workflow skills, so they carry no report resource.
- Criteria 5 and 6 are preservation and negative-existence criteria; their
  tests are guard pins that are green on arrival by nature (the chain and
  end-of-effort scripts were not touched and nothing shared exists).
- The prose greps normalize whitespace before matching, because markdown
  wrapping split a rule phrase across lines. Test-harness detail, not a
  behavior change.

### Ticket doc update needed?
No criterion text changes: all six acceptance criteria are met on the
branch. The implementation note is appended to the ticket doc's
`## Implementation notes` section by the land step, following the landing
convention of the previously landed tickets.

### User attention needed?
No. No scope changed and no planned surface moved: the report contract
landed exactly as specified (fixed five-part order, no shared artifact, no
runtime gate, chain and end-of-effort return shapes unchanged). The only
divergence is the dispatch-order coverage note above, which the effort's
own arch spec anticipates ("each owning ticket updates the registry as it
lands") and which the verify step already saw and accepted.

### Carry-forward notes for pending tickets
- **intake-skill, to-spec-rescope, implement-ticket-skill,
  finalize-effort-skill, overview-doctor-rescope:** each extends the
  `WORKFLOW_SKILLS` list in `tests/skill-rewire.test.ts` (seam 4) and adds
  its own `resources/report.md` with the fixed five-part order; the failure
  mode for a missed skill is loud (red suite).
- **implement-ticket-skill / finalize-effort-skill:** the
  triage/implement-task/finalize-task report resources retire with their
  skills; the successor skills' report resources replace them.
- **to-spec-rescope, overview-doctor-rescope:** the to-spec,
  task-workflow-overview, and task-workflow-doctor resources carry the
  current (still partially v4) next-step phrasing; their re-scope tickets
  own any pointer renames.
- **docs-resync / coherence pass:** per-skill rule wording is allowed to
  drift by design (no shared contract file); the seam pins the category
  list and structure, not exact wording, so semantic drift between
  resources is possible and accepted.
