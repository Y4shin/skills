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

## Downstream work it may create

The schema 5 field, the gate tool behind `to-spec`, and the `to-spec` and
`to-tickets` skill text.
