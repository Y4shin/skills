---
type: task
subtype: grilling
title: Front door and its relationship to triage
status: stable
workflow_state: done
blocked_by:
- grill-workflow-vocabulary
---

# Front door and its relationship to triage

## Decision to settle

What is the single front door that always creates an effort and a map, how do
intake, inbox, and triage relate, how do bug reports enter, and who owns the
mandatory first grilling session?

## Parent decisions it depends on

None.

## Choices already known

- Name: `intake` versus `inbox`. `intake` acts (it creates the effort);
  `inbox` reads as a passive queue.
- Relationship: intake absorbs triage, or intake calls triage for externally
  reported items while `triage` stays the queue.
- Bugs: every bug becomes an effort with a simple map, or triage keeps
  minting bare bug tickets that `implement-task` picks up.
- Grilling ownership: intake owns the first grilling session, or wayfinder owns
  it and intake invokes wayfinder.

## Recommended starting answer

`intake` as the user-invoked front door that always creates an effort and a
map, and invokes `wayfinder` for the mandatory first grilling. `triage` stays
the queue for externally reported issues and hands items to `intake`. Bugs
become efforts too, on a simple map, so the bug path stops being a parallel
substrate. The `mode: human` path for human-owned work is preserved.

## Downstream work it may create

The skill surface (`intake` added, `triage` re-scoped), session-start fields
for an effort, and `setup-workflow`'s onboarding templates.

## Settled decisions

### Q1 - Every bug report becomes an effort (settled)

- Intake creates an effort for every new bug report, with a simple map when
  nothing needs research or prototyping, and the defect is a `subtype: bug`
  implementation ticket inside that effort. The full-arc rule holds: map,
  specification, at least one ticket.
- If a report matches an in-flight effort, intake may add it as a bug ticket to
  that effort instead, at the human's decision.
- `docs/bugs/` retires as a live substrate; it survives only as an archive and
  for the migration layer. Consequences: `docs/bugs/**` drops out of the
  write-guard scope, and the bug-doc archiving steps leave with `finalize-task`,
  which is retired separately.
- Rejected: B, keeping the bug doc as the entry artifact (two substrates and
  two lifecycles to maintain); C, bare bug tickets with no effort (the parallel
  substrate this effort exists to remove, and it contradicts the full-arc
  rule).

### Q2 - Intake owns a limited, deterministic first round, not a grilling (settled)

- The first round is not a grilling and does not invoke the `grilling` skill.
  It is intake's own short round: a quick sanity check on the request, then a
  fixed set of pre-determined questions asked only for the facts intake cannot
  derive itself.
- Sanity checks intake runs before asking anything:
  - search active and archived efforts for a duplicate or a fold-in target. If
    an unarchived effort already does this, ask the user why a new effort is
    wanted, or fold the idea into the existing effort;
  - search for related efforts, so the new map can carry the right links;
  - classify the request as a feature or a bug.
- Questions intake asks when it cannot derive the answer: the basic facts of
  the ingested request, including the central user stories (three to five).
- Rejected: making the front door a real grilling session, or having intake
  invoke the `grilling` skill. It would make the door heavy and duplicate the
  map's own planning work.
- Downstream: the question set lives in intake's prose or a resource; the
  gathered facts seed the map's destination, constraints, and out of scope,
  and the user stories seed the specification.

### Q3 - The intake list is deliberately minimal (settled)

- The barrier to entry stays low: a vague idea jotted down must be enough, and
  intake must be quick, so any code search it does is bounded and time-boxed,
  never exhaustive.
- Intake records the raw request verbatim, a one-line destination in the user's
  words, the actor, the classification (feature or bug), and the three to five
  central user stories. For a bug, in place of user stories, its reproduction:
  steps, expected versus actual, and impact.
- Constraints are asked, and "don't know" is a perfectly good answer.
- Duplicate and link checks are bounded and fast: active and archived efforts,
  documentation that already exists (ADRs, `CONTEXT.md`), and a limited,
  time-boxed reach into the code when a targeted check is genuinely useful.
- Removed from intake because they belong to Wayfinder: explicit non-goals and
  the effort-level success test. Those become required map outputs before the
  `to-spec` handoff. See `grill-simple-map-and-spec-gate`.
- Removed from intake with the abandonment of the simple map: the clear-way
  check and the appetite question. Intake no longer decides simple versus full;
  every effort gets the non-negotiables grilling task.
- The trigger is not a concept in this workflow and is not part of intake's
  prose. If the user volunteers a reason unprompted, it is simply part of the
  raw request; nothing asks for it.

## Human confirmation

- The user confirmed the summary above, with the duplicate and link checks
  bounded to a time-boxed code reach, as the shared understanding. The
  planning task is done on that basis.
