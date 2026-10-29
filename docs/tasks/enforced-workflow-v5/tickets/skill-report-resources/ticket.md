---
type: ticket
subtype: feature
title: Per-skill report resources and the shared completion-report shape
status: stable
workflow_state: ready
blocked_by: [wayfinder-reconcile-and-passes, to-tickets-architecture, intake-skill, to-spec-rescope, implement-ticket-skill, finalize-effort-skill, overview-doctor-rescope]
size: m
---

## What to build

Every workflow skill ends its run with one shared completion report shape,
tuned per skill and stored in that skill's own `resources/report.md`. There is
no shared report skill, no shared contract file, and no runtime report gate;
enforcement is prose discipline.

The shape is fixed and ordered: (1) what is now true, (2) what needs the
human, (3) what to run next, (4) what is broken or blocked, (5) one pointer to
the detail. A skill may add at most one skill-specific line inside that order;
it may not reorder or add sections.

The language is simplified technical English, compact, written for someone who
did not watch the run. Never inline: subagent run ids, per-step receipts,
output references, harness counts, tool-call detail, raw chain JSON, or
workflow-internal terms the human did not introduce. All of it is reachable
only through the single pointer, and the report offers to expand on request.

The shape applies to completion, refusal, failure, and escalation alike. In a
failure, part 1 becomes "the ticket did not land and the tree is unchanged",
and the escalation question is part 2. The pointer targets durable artifacts
that already exist: the ticket doc, the changelog entry, and the commit for a
landed ticket; the task file for a planning task; the map and the review
artifact for an effort.

The chain and end-of-effort return shapes do not change: they keep returning
`ok`, `failed`, `error`, `step`, and `refs`, because the failure toolbelt
needs `step` and `refs`. This ticket is what keeps them out of the human-facing
message.

## Acceptance criteria

- [ ] Each workflow skill has a `resources/report.md` with the fixed
      five-part order.
- [ ] No skill restates the shape inline; each points at its report resource.
- [ ] No report inlines run ids, receipts, refs, harness counts, or chain
      JSON.
- [ ] The failure and escalation variants follow the same shape.
- [ ] The chain and end-of-effort return shapes are unchanged.
- [ ] No shared report skill or shared report file exists.

## Blocked by

- wayfinder-reconcile-and-passes, to-tickets-architecture, intake-skill,
  to-spec-rescope, implement-ticket-skill, finalize-effort-skill, and
  overview-doctor-rescope: the report resources land on the final skill set,
  so the skills must exist in their v5 shape first.

## Implementation notes

- Landed by the tdd-worker on `ticket/skill-report-resources` (seven wip
  commits merged with `--no-ff`); the deviation report sits at
  `deviation-reports/skill-report-resources.md` in this ticket directory.
- Nine per-skill report resources at
  `skills/engineering/{wayfinder,to-spec,to-tickets,implement-task,finalize-task,triage,setup-workflow,task-workflow-overview,task-workflow-doctor}/resources/report.md`,
  each carrying the fixed five-part order (what is now true, what needs the
  human, what to run next, what is broken or blocked, one pointer to the
  detail) as its only sections, tuned per skill, with the failure and
  escalation variant stated in each intro and the never-inline plus
  simplified-technical-English rules stated at the end.
- A `## Report` pointer section in each of the nine SKILL.md files, so no
  SKILL.md restates the shape inline; implement-task's feature/bug
  autonomous resources replaced their thin inline report steps with the
  pointer.
- Prose seams 4, 5, and 6 in `tests/skill-rewire.test.ts` pin the contract:
  five-part order per skill, pointer-not-restate, never-inline categories
  with no machine receipt shapes, failure and escalation variants in the
  same shape, the chain and end-of-effort return shapes (`ok`, `failed`,
  `error`, `step`, `refs`, `reviewOk`) unchanged, and the negative-existence
  pins (no shared report skill, no shared report file, no cross-skill
  report pointer, no runtime report gate).
- Docs pages re-synced with one tight bullet per page for all nine skills.
- Coverage note: dispatch ran this ticket before five of its `blocked_by`
  tickets landed, so "each workflow skill" covers the nine run-ending skills
  present at dispatch; the pending skill tickets join the contract by
  extending the seam's `WORKFLOW_SKILLS` list and adding their own report
  resource (full detail in the deviation report).