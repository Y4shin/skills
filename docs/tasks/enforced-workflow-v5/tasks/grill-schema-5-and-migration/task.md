---
type: task
subtype: grilling
title: Schema 5 shape and migration
status: stable
workflow_state: done
blocked_by:
- grill-front-door
- grill-non-negotiables-and-spec-gate
- grill-finalize-effort
- grill-gate-model-and-write-lockdown
- grill-workflow-vocabulary
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

## Settled decisions

### Q1 - The schema 5 delta is small and additive (settled)

- Map frontmatter gains `ready_for_spec` and `origin_effort` (optional). The
  `simple` field is NOT added, because the simple-map concept is abandoned.
- Type rename: `arch spec` becomes `architecture`, and the file `arch-spec.md`
  becomes `architecture.md`, still at the effort root (`docs/tasks/<effort>/`).
- A new auxiliary type `review` is added for the effort review artifact.
- Map body: `## Out of scope` is renamed `## Non-goals`, and
  `## Non-negotiable facts` (opening with the bolded effort-level success-test
  line) is added. These are body sections, not frontmatter.
- No new front-door metadata fields on the map. Intake's gathered facts seed the
  map body and the specification, not frontmatter.
- `type:` continues to carry only the artifact kind and `subtype:` only the
  workflow category. The broad legacy `type:` value set stays migration-only,
  as it already is in v4.
- No structural change to the map, task, or ticket shapes.

### Q2 - `ready_for_spec` is a boolean map field (settled)

- `ready_for_spec` is a boolean on `map.md` frontmatter, omitted by default. It
  is set to `true` last by the dedicated finalize tool and auto-cleared by any
  plan or map change.
- Amendment from the user: the field does not have to be omitted when false. An
  explicit `ready_for_spec: false` is allowed, and an absent field is read as
  `false`. The gate and the finalize tool must treat absent and `false`
  identically.
- Rejected: a `map_state: planning | ready_for_spec` enum, which invents
  partial states for a two-state fact and adds no checkability.

### Q3 - The effort review artifact is `review.md`, type `review` (settled)

- The artifact is `docs/tasks/<effort>/review.md` with `type: review`, an
  auxiliary artifact with no `workflow_state`, added to `KNOWN_TYPES`.
- It is moved into the follow-up effort when a follow-up is created, per
  `grill-finalize-effort` Q2.
- Rejected: `findings.md` (collides with research findings); keeping it inline
  in the follow-up map (it is a long artifact, not an index).

### Q4 - One idempotent hop to schema 5, reusing the existing migration (settled)

- `state.yaml` carries `schema_version: 5`. `src/migrate-cli.ts` and
  `src/core/migrate.ts` are reused; `detectVintage` gains a version-5 branch
  and `migrate()` gains the v4-to-5 reshape.
- Any vintage (unversioned, v1 to v4) migrates to 5 in one idempotent,
  resumable hop over the existing `TreePort` staging and undo journal.
- v3 and v4 frontmatter stay readable in `fromFrontmatter` during the
  transition; new producers write v5 only.
- The v4-to-5 reshape performs the body and filename renames from Q1, not a
  frontmatter-shape change.

### Q5 - Rename scope covers archives; `docs/bugs/` stays put (settled)

- The v5 renames (`arch-spec.md` to `architecture.md`, `type: arch spec` to
  `architecture`, `## Out of scope` to `## Non-goals`) apply to live and
  archived trees alike, because tools read archives (duplicate and link checks)
  and one name is simpler than a permanent dual reader.
- The reader stays tolerant of the legacy `arch-spec.md` filename and
  `arch spec` type during the transition as a safety net, even though the
  migration rewrites them.
- `docs/bugs/` is left in place as a static archive. It is not moved or
  rewritten; it simply stops being a live substrate. Moving it into
  `docs/tasks/archive/` is rejected because it buys nothing and touches files no
  live skill will read again.

## Frontier for round 2

Q6 (does this effort also update `setup-workflow`'s migration templates and
`docs/migration-target.yaml` to schema 5, or is that a later cleanup?).

### Q6 - The `setup-workflow` ripple is in scope, narrowly (settled)

- This effort updates `docs/migration-target.yaml` for schema 5 and adds
  `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md`, with
  whatever scripts and tests the existing 3-to-4 path carries, so the migration
  path is complete end to end.
- Running the migration on a downstream repo stays out of scope. It remains a
  human-driven `setup-workflow` action once v5 lands.
- Rationale: shipping a package that writes and expects schema 5 while its own
  setup skill still treats 4 as current leaves a known gap, where a downstream
  repo on 4 would be told "already current" and then fail against v5 skills.
  The map's migration-path constraint is read literally.
- Rejected: deferring the whole ripple to a follow-up effort, which keeps the
  v5 effort smaller but knowingly ships that gap.

## Frontier empty

Q1 to Q6 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q6 summary as the shared understanding, with the
  one refinement that `ready_for_spec` may be written as an explicit `false` and
  an absent field reads as false. The planning task is done on that basis.
