---
kind: slice
slug: skill-and-detection-and-upgrade-resource
title: Build the auto-detecting migration skill (replacing onboard-workflow) + the upgrade-2-to-3 resource distilled from the proven adoption
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: []
---

## End-to-end behavior

The migration skill is built per grilling #2 R1Q1 + R2Q1 + R2Q2: a single
skill that auto-detects onboard (no `schema_version`), migrate (old
`schema_version`), or no-op (current `schema_version`) by reading
`docs/tasks/state.yaml`'s `schema_version`. For a migrate repo, it applies
per-upgrade resource files in sequence (2→3, then 3→4, ...). It replaces
`onboard-workflow` (R1Q1: one skill owns both onboarding and migration,
branching on detected state). The `resources/upgrade-2-to-3.md` resource
is **distilled from the proven adoption** recorded in `run-adoption-
migration/slices/9-changesets-prose-finalize.md`'s consolidated summary:
not from grilling #2's theoretical design. The skill has dry-run +
backup-branch + idempotent safety (R3Q1). The skill name is decided here
(stay `onboard-workflow` vs `setup-workflow`/`migrate-workflow`).

## Acceptance criteria

- A skill (decided name) exists that: reads `state.yaml`'s
  `schema_version`; branches onboard (absent) / migrate (old) / no-op
  (current); for migrate, loops `resources/upgrade-<from>-to-<to>.md` in
  sequence from the repo's version to current.
- `onboard-workflow` is replaced by this skill (the old skill's
  onboarding knowledge is absorbed; the new skill's fresh-repo branch
  does what onboard-workflow did). Update `pi.skills`.
- `resources/upgrade-2-to-3.md` encodes the proven adoption steps (from
  the final slice summary), as a fixed ordered step list, each tracing to
  a grilling #1 decision. Deviations from the designed 11 steps are
  encoded as they actually happened.
- Dry-run mode (print plan + affected files, no writes); backup git
  branch before applying; idempotent (re-run no-ops if current; resumes
  from last completed step if mid-migration, per-step completion
  tracking).
- Telemetry wired; no-em-dashes; passes `validate_skill.mjs`.
- `tests/skills.test.ts` updated for the skill rename/replacement; `npm
  test` + typecheck green.

## Test plan

Seams: `validate_skill.mjs`, `tests/skills.test.ts`, typecheck. Failure
modes: the `upgrade-2-to-3` resource disagrees with what the adoption
actually did (must match the proven run); dry-run writes (must not);
idempotence broken (re-run mutates); `onboard-workflow` references
dangling after replacement (grep + fix). Scenarios: on a fixture old-
  setup `state.yaml` (schema_version: 2), the skill detects migrate + lists
  the upgrade-2-to-3 steps. Edge cases: the skill name decision (record
  choice + rationale).

## Constraints and dependencies

- Unblocked (the adoption it distills from is the task-level dependency;
  this slice reads that task's completed slice notes).
- Grilling #2 R1Q1, R2Q1, R2Q2, R3Q1. Grilling #1 Q6 (superseded by R1Q1).
- Source: `run-adoption-migration/slices/9-changesets-prose-finalize.md`
  consolidated summary + each prior slice's notes.
