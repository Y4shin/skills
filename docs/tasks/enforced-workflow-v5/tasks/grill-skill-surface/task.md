---
type: task
subtype: grilling
title: Skill surface after the tool layer owns the rules
status: stable
workflow_state: ready
blocked_by: [grill-front-door-and-triage, grill-simple-map-and-spec-gate, grill-disclosure-mechanics, grill-gate-model-and-write-lockdown, grill-finalize-effort, grill-workflow-vocabulary, grill-implement-task-split]
---

# Skill surface after the tool layer owns the rules

## Decision to settle

Which skills are added, merged, re-scoped, or shrunk once the tools own the
state machine, and how much prose remains in each.

## Parent decisions it depends on

Every other grilling task in this effort, because the skill boundaries follow
the decided tool boundaries.

## Choices already known

- Add `intake` (front door) and `finalize-effort` (holistic pass plus
  archive).
- Shrink each workflow skill to "what the allowed action means and how to do
  it well", since the gate is no longer prose.
- Whether `task-workflow-overview` becomes a thin table over the `tw_next`
  oracle, and whether `task-workflow-doctor` is still needed.
- Whether any planning-subtype resources move or merge.

## Recommended starting answer

Add `intake` and `finalize-effort`. Shrink every workflow skill's prose to the
meaning and craft of its allowed action. Keep `task-workflow-overview` as the
model-invoked router over `tw_next`, and keep the vocabulary skills
(`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`)
unchanged. Leave the chain internals and the 11 agents untouched.

## Downstream work it may create

The spec's skill inventory, the eventual tickets, and the documentation
re-sync ticket that closes the effort.

## Decisions already taken (inputs from the user)

### `finalize-task` retires; the ticket close-out is inlined

- `finalize-task` is retired as a skill. Separating implementation from
  finalization buys nothing: the implementation run already owns review work,
  and the separate invocation is a seam where the agent waits for the human to
  invoke a second skill.
- Its per-ticket steps (the CI gate, the knowledge harvest, the changelog, the
  done-marking through the set tool, the per-ticket close-out, the merge to
  main) become the closing phase of the ticket-execution skill, in the same
  autonomous run that landed the ticket.
- `finalize-effort` stays: the effort-level holistic pass plus archive.
- The one-owner rule is preserved. The inlined closing phase is still the only
  thing that sets a ticket's `workflow_state: done`.
- Ripples: the skill inventory loses `finalize-task`; `package.json`'s
  `pi.skills` array, the top-level `README.md`, `skills/engineering/README.md`,
  the docs page under `docs/engineering/`, and `task-workflow-overview`
  follow; every instruction that says to run `/skill:finalize-task` goes away.
- Downstream interaction: the planned split of `implement-task` into planning
  and ticket execution must place this closing phase on the ticket-execution
  side. See `grill-implement-task-split`.
