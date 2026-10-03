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
