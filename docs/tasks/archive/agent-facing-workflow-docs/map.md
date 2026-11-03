---
type: map
title: Agent-facing workflow troubleshooting docs
status: deprecated
ready_for_spec: true
---
# Agent-facing workflow troubleshooting docs

## Destination

Ship an agent-facing documentation layer inside the package so a pi agent
that hits a wall with the skills or the `tw_*` tools reorients from shipped
reference material and escalates to the operator, instead of freelancing
through the package source. Two surfaces: one new model-invoked skill that
owns the unified failure ladder, and an internals reference with flow charts
under `task-workflow-overview`.

## Constraints

- The per-skill surface stays minimal: each promoted `SKILL.md` and subagent
  profile in `agents/` carries a one-line reference to the ladder skill with
  the instruction to invoke it on workflow problems, never inline ladder
  prose.
- Everything ships through the package: the ladder skill in `pi.skills`, the
  internals resources inside `task-workflow-overview`, the docs page per
  repo conventions. No repo-internal-only documentation.
- `src/` stays untouched: the docs describe the tools exactly as they
  behave, and a confusing refusal text becomes a review finding for a
  follow-up effort rather than an inline fix.
- Success is judged docs-complete, not behaviorally: no eval additions in
  this effort.
- The ladder skill must not duplicate the doctor: `task-workflow-doctor`
  stays the tree diagnostician, the ladder is the discipline and routes to
  it.

## Non-goals

- Behavioral or eval-based verification that agents actually route and
  escalate more reliably: settled in `settle-non-negotiables` as
  docs-complete success only; a behavioral follow-up is possible future work.
- Fixing refusal messages or other tool text in `src/` where current wording
  is confusing: recorded as a review-finding disposition if uncovered during
  implementation, not changed in this effort.
- Changing `task-workflow-doctor`'s scope or merging it into the new ladder
  skill: the doctor stays the tree diagnostician; the ladder routes to it.

## Non-negotiable facts

**Success test:** one model-invoked ladder skill ships in the package, every
promoted `SKILL.md` and `agents/` profile carries its one-line reference,
and `task-workflow-overview` ships the internals reference with flow charts,
with the repo conventions (README, `pi.skills`, bucket README, docs page,
router) in sync. No eval gates.

- The package is the delivery vehicle: `package.json` `files` already lists
  `skills`, and a promoted skill's resources travel with it, so the
  internals doc ships the same way pi ships its own docs.
- The ladder discipline is fixed: refusal-reason and `legal_next` first,
  then routing via the internals doc or the doctor skill, then `tw_feedback`,
  then stop and escalate with the five-part report; improvisation
  (hand-editing the tree, skipping a gate, inventing a workaround) is
  forbidden at every rung.
- The escalation always ends the run with the report; it never blocks
  mid-run on an interactive question.

## Decisions so far

Settled in `settle-non-negotiables` (full record in that task's Notes):

1. One new model-invoked skill owns the unified failure ladder: act on the
   refusal's own reason and `legal_next`, route via the internals doc or
   `task-workflow-doctor`, record the snag with `tw_feedback`, then stop and
   escalate with the five-part completion report (failed step, refusal
   reason, decision the operator must make). Never hand-edit the tree, skip
   a gate, or invent a workaround. Working name `workflow-failure`; the
   exact name is a spec-phase decision.
2. Every other promoted `SKILL.md` and every subagent profile in `agents/`
   carries a one-line reference to the ladder skill instead of ladder prose.
3. The agent-facing internals documentation (what the skills and tools do
   in detail and in the big picture) lives as new resources under
   `task-workflow-overview`, referenced from its SKILL.md and from the
   ladder skill.
4. Diagram format: mermaid blocks for flow charts (main flow, phase-gate
   state machine), ASCII trees for the artifact layout.
5. `src/` untouched; confusing tool refusal texts are review findings for
   follow-up work.
6. Adding the promoted ladder skill triggers the convention sync:
   `package.json` `pi.skills`, top-level README, engineering bucket README
   under model-invoked, a `docs/engineering/<name>.md` page with the four
   sections, and the task-workflow-overview router must mention it.

## Fog


