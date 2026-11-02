# workflow-failure

## What it does

`workflow-failure` owns the escalation ladder: the fixed order a stuck run
walks when the workflow misbehaves, a `tw_*` tool refuses, or a gate will
not open. The model invokes it on its own (or you type
`/skill:workflow-failure`), and its instructions walk four rungs in order:

1. **Act on the refusal's own answer.** A `tw_*` refusal carries a
   `reason`, and an opener refusal also names its `legal_next` moves by
   design. That answer is the first route, not a suggestion; a refusal
   whose own answer resolves the snag ends the walk there.
2. **Reorient from the shipped internals reference**, `WORKFLOW-INTERNALS.md`
   under `task-workflow-overview`, or **route to
   `/skill:task-workflow-doctor`** when the tree itself is the problem: a
   legacy layout, missing scaffolding, a failed migration.
3. **Record the snag with `tw_feedback`**, so the failure becomes workflow
   telemetry instead of a silent workaround.
4. **Stop and escalate** with the five-part completion report, naming the
   failed step, the refusal reason, and the decision the operator must
   make. The report ends the run; it never asks a blocking question
   mid-run.

Three moves are forbidden at every rung: hand-editing the artifact tree,
skipping a gate, and inventing a workaround.

The ladder is a discipline, not a diagnostician. It names the legal moves;
it does not fix the tree. `task-workflow-doctor` stays the tree and opener
diagnostician, and the ladder routes to it rather than duplicating it.

## When to reach for it

The model reaches for it when a run hits a wall the skills and tools do not
already answer: an opener refusal whose `legal_next` does not fit the
situation, a phase that will not open, or the point where improvising looks
like the only way forward. You can also type `/skill:workflow-failure` the
moment a run looks stuck. It is an escape hatch, not part of the happy
path: a run that goes well never visits it.

## Common questions

**Why act on the refusal itself before anything else?**
The opener names the legal next moves by design, so the refusal's own
answer is the most informed route available. Retrying blind fails the same
way, and reopening through another path is not one of the options.

**The ladder and the doctor both mention refusals. Which one runs?**
The refusal's own `reason` and `legal_next` come first. The doctor is the
route when the tree is the problem or the refusal leaves no legal move;
the ladder never re-diagnoses what the doctor already owns.

**Why does the run end instead of asking me a question?**
A blocking question mid-run leaves an agent idle on a wall it cannot climb.
The five-part report ends the run with the decision in your hands, and the
work resumes from your answer.

**Can it fix the tree while it is there?**
No. Hand-editing the artifact tree is forbidden at every rung: the `tw_*`
tools are the only writers of `docs/tasks/**`, and a fix belongs to the
owning skill the refusal or the doctor names.

## It's working if

- The refusal's own `reason` and `legal_next` are acted on before anything
  else is tried, and a refusal is never retried blind or reopened by
  another path.
- A tree symptom routes to `/skill:task-workflow-doctor` instead of being
  re-diagnosed or patched by hand.
- Snags reach the telemetry store: the run records `tw_feedback` before it
  escalates, so the same snag is not hit silently twice.
- An escalation ends the run with the five-part report: the failed step,
  the refusal reason, and the one decision you must make, with one pointer
  to the detail.
- No gate was skipped and no workaround was invented on the way.
