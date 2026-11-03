---
type: task
subtype: grilling
title: Settle non-negotiables
status: deprecated
workflow_state: done
blocked_by: []
---

# Decision to settle

The effort's non-goals, non-negotiable facts, and effort-level success
test, returned to the map by the end of this task.

# Raw request (verbatim)

"Basically I want to create some documentation, that is delivered with the pi
package, which can help pi understand how the skills and their tools are
supposed to work in case they hit a wall and need to debug on the fly. My
issue is that currently the agent just goes on a random goosechase through
the package and latches on to the first thing it can find and just does some
stuff it was never supposed to do. I want to edit the instructions for the
skills to include some minimal prose that instructs the agent on what to do
when things don't go as expected, which in last consequence means escalating
to me rather than just doing random stuff, but it should have some
documentation on what the skills do in detail and in the big picture with
some flow charts and whatnot, similarly to how pi ships with it's own docs
so the agent can understand how it itself functions."

# One-line destination (operator's words)

Documentation shipped inside the package, plus minimal failure-handling prose
in the skills, so a stuck agent reorients from the shipped docs and escalates
to the operator instead of improvising.

# Actor

The pi agent running these skills and `tw_*` tools in a target repo; the
beneficiary is the operator, who gets a bounded-stop-escalate behavior
instead of freelancing.

# Classification

Feature.

# Stories

1. As the agent, when a `tw_*` tool refuses or errors mid-flow, I want one
   shipped reference that explains the phase machine, the artifact tree, and
   each refusal shape, so I can route myself from the doc instead of grepping
   the package source.
2. As the agent, when the doc does not resolve my situation, I want a short
   failure ladder spelled out in the skill I am running, so my last action is
   a concrete escalation to the operator, never an invented workaround.
3. As the operator, when the agent escalates, I want the escalation to name
   the failed step, the refusal reason, and what I must decide, so I can
   answer in one message.
4. As the operator, I want the big-picture doc to include flow charts of the
   main flow, phase gates, and artifact tree, so a stuck agent reorients the
   way pi's own docs reorient pi.

# Constraints

- The per-skill prose stays minimal: a failure ladder, not walls of text.
- Everything shipped through the package (`package.json` `files` and
  `pi.skills`), never repo-internal-only documentation.
- Comparable in spirit to how the pi harness ships its own docs for
  self-understanding.

# Related prior work (link check)

Archived: `build-task-workflow-doctor-skill` (tree-opener triage routing),
`backfill-skill-docs-pages` (human-facing docs pages), `gate-tools-and-injection`
and `enforced-workflow-v5` (the gate model itself). The shipped
`task-workflow-overview` (router) and `task-workflow-doctor` (tree diagnosis)
are the nearest existing surfaces; this effort must define its relationship
to both: deepen them, or stand alongside them.

# Notes from intake's code reach

- No mermaid or flow-chart doc ships today (only the improve-codebase-architecture
  report vendor).
- `skills/engineering/task-workflow-overview/PHASE-BOUNDARIES.md` covers context
  management only, not the phase machine or failure routing.
- `docs/<bucket>/<skill>.md` pages are human-facing by convention (AGENTS.md);
  this effort introduces an agent-facing layer the conventions do not yet name.

## Notes

## Grilling record

Round 1 (frontier before the change):

- **Q1 Doc home** - inside `task-workflow-overview`, as new resources under
  that skill carrying the internals reference (phase machine, `tw_*` gate
  model, artifact tree, refusal shapes) and flow charts. Rejected: new
  standalone internals skill (convention churn, overlaps the router);
  package-root docs page (weak mid-run discoverability, breaks the
  human-facing docs-tree convention).
- **Q2 Prose scope** - all promoted `SKILL.md` files plus the subagent
  profiles in `agents/` get the escalation surface. Rejected: workflow-phase
  skills only; SKILL.md files only.
- **Q3 Terminal escalation** - fixed ladder ending in the five-part
  completion report that ends the run, naming the failed step, the refusal
  reason, and the decision the operator must make. Never hand-edit the tree,
  skip a gate, or invent a workaround. Rejected: blocking ask_user_question
  mid-run; per-skill tailored prose.
- **Q4 Success test** - docs-complete only. Rejected: behavioral success
  test; behavioral test plus small eval additions.

Round 2:

- **Q5 Diagrams** - mermaid blocks for flow charts (main flow, phase-gate
  state machine), ASCII for the artifact tree. Rejected: ASCII only;
  mermaid only.
- **Q6 src/ scope** - docs only; `src/` untouched. A confusing tool refusal
  text becomes a recorded review finding for a follow-up effort. Rejected:
  docs plus small src/ wording fixes.

Confirmation round (operator's adjustment, verbatim intent): "not every
skill should carry the minimal failure ladder, but rather we have one
unified failure ladder as a skill, that the model can invoke and the line in
each skill becomes a reference to that skill with the instruction to invoke
it if the agent encounters any problems with the workflow."

## Settled decisions

1. One new model-invoked skill owns the failure ladder (bounded
   stop-and-escalate discipline: act on the refusal's own reason and
   `legal_next`, route via the internals doc or the doctor skill, record the
   snag with `tw_feedback`, then stop and escalate with the five-part
   report). Every other promoted `SKILL.md` and subagent profile in
   `agents/` carries a one-line reference to it instead of inline ladder
   prose. The exact skill name is a spec-phase decision; working name
   `workflow-failure`.
2. The agent-facing internals documentation (what the skills and tools do
   in detail and in the big picture, with flow charts) lives in
   `task-workflow-overview` as skill resources behind its SKILL.md.
3. Diagrams: mermaid for flows, ASCII for trees.
4. `src/` untouched; confusing refusal texts surface as review findings for
   follow-up work, not inline fixes.
5. Success is judged docs-complete: the ladder skill exists, every promoted
   surface references it, the internals doc ships inside the package, and
   the repo's own gating checks pass. No eval additions.

## Constraints and rationale

- The per-skill surface stays minimal: one reference line, not walls of
  text. That was the operator's correction to the inline-ladder variant.
- Everything must ship through the package (`package.json` `files`,
  `pi.skills`) the way pi ships its own docs.
- Adding a new promoted engineering skill triggers the repo conventions:
  top-level README reference, `pi.skills` entry, bucket README one-liner
  under model-invoked, docs page with the four sections, and the
  task-workflow-overview router must mention it.

## Dependent-task implications

The spec must settle the ladder skill's name and its exact relationship to
`task-workflow-doctor` (the ladder routes tree problems to the doctor; the
doctor stays the tree diagnostician) and to the internals doc (the ladder
references it for reorientation). to-tickets will produce roughly: write
the internals reference; create the ladder skill with its convention sync;
thread the reference line through every promoted SKILL.md and agents/
profile; a gating/test ticket asserting the reference coverage.

## Remaining fog

None.
