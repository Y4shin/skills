---
type: task
subtype: research
title: Design the milestone hook mechanism
status: stable
workflow_state: ready
blocked_by: []
---

# Question

What would a milestone-hook mechanism declared in the local state look like?

- The milestone points available across the arc (intake recorded, map ready, spec written, each ticket landed, effort finalized, and any others the phases expose).
- Declaration format options for the hooks (prose instructions for the agent, structured config, pi settings conventions) and where the declaration sits inside the local state root.
- Notification and gating semantics: how a skill mid-run learns a hook fired, and how a gating hook blocks continuation until its declared work is done (the map's use case: once the spec exists, create a plan artifact in the external tracker and put it up for review before continuing).
- Prior art: git hooks, CI hooks, pi extension events, and the workflow's own phase-gate model.

# Decision it unblocks

The spec's hook section, including the external-tracker use of hooks (the hook-system fact in the map).

# Trusted source boundaries

This repository's skills and `src/`; pi's extension documentation; established hook systems as prior art. Web sources only where pi's own docs point.

# Evidence required

Findings at `docs/tasks/local-state-efforts/tasks/design-hook-mechanism/findings.md`: a milestone inventory across the arc, at least two declaration-format options with trade-offs, and one recommendation covering declaration, firing, and gating semantics.

# Likely dependent tasks

The spec; consumes `research-local-state-root` context for where the declaration lives.
