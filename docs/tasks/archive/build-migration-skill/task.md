---
kind: task
type: feature
slug: build-migration-skill
title: Build the reusable migration skill (auto-detecting onboard+migrate) from the proven adoption steps, with upgrade-2-to-3 resource, target-state spec, and tests
map: adopt-mp-skills-way
status: done
blocked_by:
- run-adoption-migration
slices:
- skill-and-detection-and-upgrade-resource
- target-state-spec
- migration-tests
---

# build-migration-skill, feature

## Decision being implemented

Grilling #2 (`design-migration-skill`) designed the migration skill. The
dependency was deliberately reversed so this task runs **after** the actual
adoption (`run-adoption-migration`): the migration skill's
`upgrade-2-to-3` resource is written from the **proven** steps of that run
(not from the theoretical design), so the migration skill is battle-tested.
This task takes the consolidated "what the migration actually did" summary
from `run-adoption-migration`'s final slice notes and distills it into:
the auto-detecting onboard+migrate skill, the `upgrade-2-to-3.md` resource,
the versioned target-state spec file, and structure-assertion tests.

## User-visible outcome

A reusable `migrate-workflow` (or renamed `onboard-workflow`) skill exists,
auto-detects whether a repo is fresh (onboard), old (migrate), or already
new (no-op) via the `schema_version` stamp in `state.yaml`, and, for an
old repo, applies per-upgrade resource files in sequence (currently just
`upgrade-2-to-3`, which encodes the proven adoption). It has dry-run +
backup-branch + idempotent safety. Its first run already migrated this
repo (v2.10.0 → v3.0.0) during `run-adoption-migration`; this task makes
that run **reusable** for any other repo on the old setup.

## User story

As the maintainer, I want a reusable migration skill, so that any repo set
up under the old task-workflow setup can be moved onto the new setup
reproducibly, because the adoption changed which files a repo using this
workflow needs and how they look.

## Scope boundaries

- **In:** the migration skill SKILL.md (auto-detecting onboard vs migrate),
  the `upgrade-2-to-3.md` resource (distilled from the proven run), the
  versioned target-state spec file, dry-run/backup/idempotent safety, and
  structure assertions in `tests/skills.test.ts`.
- **Out:** re-running the adoption on this repo (already done in
  `run-adoption-migration`); migrating other repos (future work); future
  upgrade resources beyond `upgrade-2-to-3`.
- **Constraint:** the `upgrade-2-to-3` resource must match what the adoption
  **actually did** (from the final slice's consolidated summary), including
  any deviations from grilling #2's designed 11 steps. Where the run
  deviated, the resource encodes the deviation (not the design).
- **Constraint:** the migration skill replaces `onboard-workflow` per
  grilling #2 R1Q1 (one skill, auto-detecting). The name is open, decide
  in `skill-and-detection-and-upgrade-resource` (stay `onboard-workflow` or
  become `setup-workflow`/`migrate-workflow`).

## Acceptance criteria

- A skill exists that auto-detects onboard vs migrate vs no-op via
  `state.yaml`'s `schema_version`, applies per-upgrade resources in
  sequence, and has dry-run + backup-branch + idempotent safety.
- `resources/upgrade-2-to-3.md` encodes the proven adoption steps (from
  `run-adoption-migration`'s final slice summary), each tracing to a
  grilling #1 decision.
- A versioned target-state spec file exists (location/format from
  grilling #2 R1Q2, e.g. `docs/migration-target.yaml` or a skill section),
  distilled from grilling #1's decision table and verified against what
  the adoption actually did.
- `tests/skills.test.ts` has structure assertions for the skill (exists,
  references `upgrade-2-to-3`, in `pi.skills`) + a `spawnSync` CLI test if
  the skill ships helper scripts.
- The skill passes `validate_skill.mjs`; telemetry wired; no-em-dashes.
- `npm test` + `npm run typecheck` green.

## Existing abstractions to use

- `skills/skill-creator/` + `validate_skill.mjs` for scaffolding/validating.
- `tests/skills.test.ts` structure-assertion convention (`docs/testing.md`).
- The consolidated step-summary from `run-adoption-migration/slices/
  9-changesets-prose-finalize.md` notes.
- Grilling #1's decision table (`docs/tasks/map-mp-skills-onto-this-repo/
  task.md`) as the target-state source.
- Grilling #2's design (`docs/tasks/design-migration-skill/task.md`).

## Relevant architecture / domain decisions

- Grilling #2 R1Q1 (one skill, auto-detecting), R1Q2 (distill to spec file),
  R2Q1 (version-stamp + per-upgrade resources, sequential), R2Q2 (fixed
  ordered step list per resource), R3Q1 (dry-run + backup + idempotent),
  R3Q2 (first run = this repo, already done), R3Q3 (structure assertions).
- Grilling #1 Q6 (extend onboard-workflow, now superseded by R1Q1's
  one-skill decision), Q11.1 (types scoped by phase).
completed_at: 2026-09-03T20:03:00Z

## Implementation notes (harvested)

The migration skill is `setup-workflow` (replaces onboard-workflow; handles both
fresh onboard + migrate via the `schema_version` stamp in state.yaml).
`resources/upgrade-2-to-3.md` encodes the proven 9-step adoption (with the 6
deviations). `docs/migration-target.yaml` is the versioned target-state spec
distilled from grilling #1's 20 decisions, verified against the actual repo.
Structure assertions in tests/skills.test.ts verify the skill references
upgrade-2-to-3, migration-target.yaml, schema_version, and the
dry-run/backup/idempotent safety guarantees. First run = this repo (the
adoption it distills); reusable for any repo on an older schema.
