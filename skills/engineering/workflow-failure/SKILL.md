---
name: workflow-failure
description: The workflow escalation ladder. Use when the workflow misbehaves, a `tw_*` tool refuses you, an opener refusal blocks a phase, you are stuck mid-phase and tempted to improvise, or you cannot tell the legal next move. Walks four fixed rungs in order and ends in a resolved route or an escalation report to the operator.
---

# /workflow-failure, The workflow failure ladder

Every message to the operator follows the `operator-communication`
skill: load it before your first message.

This skill owns the escalation ladder, the one place the workflow's failure
moves are written down. When the workflow misbehaves, a `tw_*` tool refuses,
or a gate will not open, you walk the rungs in their fixed order. The ladder
is a discipline, not a diagnostician: it names the legal moves, it does not
fix the tree. It ends one of two ways, in a resolved route or in an
escalation report to the operator. It never blocks mid-run on an interactive
question; escalation always ends the run.

## The ladder

Walk the rungs in this exact order. A rung that resolves the snag ends the
walk; none is skipped, and the walk never restarts to hunt for a better
outcome.

1. **Act on the refusal's own answer.** A `tw_*` refusal carries a `reason`,
   and an opener refusal also carries a `legal_next` list that names the
   legal next moves by design. Read the reason, then take the named call or
   run the named skill; `tw_next` repeats the current state when you are
   unsure what it is. A refusal whose own answer resolves the snag ends the
   ladder here.
2. **Reorient from the shipped reference, or route to the doctor.** When the
   refusal does not name your next move, reorient from the internals
   reference, [WORKFLOW-INTERNALS.md](../task-workflow-overview/WORKFLOW-INTERNALS.md),
   shipped under the `task-workflow-overview` skill: the big picture, the
   artifact tree, the gate model, and the refusal shapes with their legal
   routes. When the tree itself is the problem (a legacy layout, missing
   scaffolding, a failed migration), route to the `task-workflow-doctor`
   skill instead. The ladder diagnoses nothing the doctor already owns.
3. **Record the snag.** Call `tw_feedback` with the step that failed and
   what fought back, so the failure becomes workflow telemetry instead of a
   silent workaround. Record it before you escalate.
4. **Stop and escalate.** End the run with the completion report in
   [resources/report.md](resources/report.md), naming the failed step, the
   refusal reason, and the decision the operator must make. The report ends
   the run; it never asks a blocking question mid-run.

## Forbidden at every rung

- **Hand-editing the artifact tree.** The `tw_*` tools are the only writers
  of `docs/tasks/**`; the write guard refuses you anyway.
- **Skipping a gate.** A refused open activates nothing, so there is no path
  around it, only through the route the refusal names.
- **Inventing a workaround.** An unlisted move is not a legal move; the
  ladder and the refusal's `legal_next` list are the whole menu.

## Routing notes

- The `task-workflow-doctor` skill stays the tree and opener diagnostician.
  Route to it; do not re-diagnose a tree symptom here.
- The internals reference is documentation, not a second behavior contract:
  reorient from it, never improvise from package source.
- A refusal that names a skill sends you back to rung 1's answer, not to a
  new plan; run what it names.

## Feedback

`tw_feedback` is the one route for workflow feedback: it labels the row as
workflow feedback, so it stays separable from project findings in the
telemetry store. Rung 3 is not optional paperwork; it is how a snag that
fought back becomes visible instead of staying a private workaround.
