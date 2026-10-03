---
type: task
subtype: grilling
title: Schema 5 shape and migration
status: stable
workflow_state: ready
blocked_by: [grill-front-door-and-triage, grill-simple-map-and-spec-gate, grill-finalize-effort, grill-gate-model-and-write-lockdown, grill-workflow-vocabulary]
---

# Schema 5 shape and migration

## Decision to settle

The exact schema 5 delta and how existing trees migrate.

## Parent decisions it depends on

The front-door, simple-map, `finalize-effort`, and gate-model decisions, since
those introduce the fields and states.

## Choices already known

- Which fields are added: `simple` on the map, `origin_effort` on the new
  effort, possibly effort-level metadata from the front door.
- Whether legacy `type:` gives way fully to `subtype:` for new artifacts.
- Whether to reuse `src/migrate-cli.ts` and keep v3 and v4 readable.
- Round 1 settled that this is enforcement, not a remodel, so the delta should
  stay small and additive.

## Recommended starting answer

Additive fields only, no structural change to the map, task, or ticket shapes.
Reuse `src/migrate-cli.ts`. Keep v3 and v4 readable during the transition. Bump
`schema_version` to 5.

## Downstream work it may create

The migration task, `setup-workflow`'s templates, and
`docs/migration-target.yaml`.
