---
type: task
subtype: grilling
title: Simple-map semantics and the to-spec gate
status: stable
workflow_state: ready
blocked_by: [grill-workflow-vocabulary]
---

# Simple-map semantics and the to-spec gate

## Decision to settle

How is a "simple" map represented, and what exactly does `to-spec` gate on?

## Parent decisions it depends on

None.

## Choices already known

- Representation: a frontmatter boolean `simple: true` on the map, a
  `subtype: simple`, or a `decisions: none` marker.
- Mutual exclusion: a simple map must not also carry decision tasks.
- Gate condition: allow `to-spec` when the decision frontier is empty and
  either the map is simple or it has at least one decision task.
- Round 1 already settled that no effort may skip the spec and ticket phases,
  so `simple` means "nothing to research or prototype first", never "skip the
  spec".

## Recommended starting answer

A boolean `simple: true` in `map.md` frontmatter, mutually exclusive with
having decision tasks, enforced by the map-writing tool. `to-spec` is allowed
only when the decision frontier is empty and the map is simple or has at least
one task. Every effort still produces a spec and at least one ticket; a
one-ticket effort is the narrow case.

## Decisions already taken (inputs from the user)

- The `simple map` and `simple effort` concepts are abandoned. No effort starts
  with nothing to grill: a small request, even a one-line bug fix, is a regular
  effort whose map carries exactly one planning task, a grilling task whose job
  is to determine the effort's non-goals and its non-negotiable facts,
  including the effort-level success test.
- Wayfinder must establish those two outputs before it may hand off to
  `to-spec`. That replaces this task's gate condition: `to-spec` is allowed
  when the map carries explicit non-goals and non-negotiable facts, not when
  "the decision frontier is empty and the map is simple or has at least one
  decision task".
- Intake no longer decides simple versus full. It always creates the effort,
  the map, and the non-negotiables grilling task, and it gathers neither the
  non-goals nor the success test.
- The vocabulary's `simple map` term is superseded, and no replacement term is
  needed: such an effort is just an effort.

## Downstream work it may create

The schema 5 field, the gate tool behind `to-spec`, and the `to-spec` and
`to-tickets` skill text.
