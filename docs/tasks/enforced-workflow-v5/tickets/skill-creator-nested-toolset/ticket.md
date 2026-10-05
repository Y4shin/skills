---
type: ticket
subtype: feature
title: skill-creator bundles its scripts as a disclosed nested toolset
status: stable
workflow_state: ready
blocked_by: [disclosure-open-close-core, opener-gate-and-toolsets]
size: m
---

## What to build

`skill-creator` gains a disclosed toolset built from its bundled scripts
(`validate_skill.mjs`, `scaffold_skill.mjs`, `discover_skill.mjs`). It is the
one tool-owning discipline and the concrete justification for nested opens.

Opening `skill-creator` inside an open phase adds its toolset without closing
the phase, and closing it leaves the phase open with its own tools intact.
The scripts stop being called through the shell and become registered tools
that the discipline can call directly.

This is also the real user of the nested-open path, so the acceptance here is
the same union-and-intact assertion the disclosure ticket proves.

## Acceptance criteria

- [ ] The three bundled scripts are registered as tools.
- [ ] `skill-creator` opens nested inside a phase and adds its toolset.
- [ ] Closing `skill-creator` leaves the phase open with its own tools
      intact.
- [ ] The scripts are no longer invoked through the shell by this skill.
- [ ] `tests/skill-creator-scripts.test.ts` is green after the rewiring.

## Blocked by

- disclosure-open-close-core (nesting and the toolset activation mechanism).
- opener-gate-and-toolsets (the registry that maps `skill-creator` to its
  toolset).