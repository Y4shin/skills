---
kind: slice
slug: target-state-spec
title: Distill grilling #1's 20 decisions into the versioned target-state spec file, verified against the actual adoption
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
- skill-and-detection-and-upgrade-resource
---

## End-to-end behavior

Grilling #2 R1Q2: the target-state spec file is created — a stable,
versioned, machine-readable distillation of grilling #1's 20 decisions
(Q1-Q20), verified against what `run-adoption-migration` actually did on
disk. The migration skill reads this spec as its target state (decoupled
from the grilling #1 task body, which is a grilling artifact). Location/
format decided here (e.g. `docs/migration-target.yaml`, or a section in
the migration skill, or `docs/migration-target.md`).

## Acceptance criteria

- A target-state spec file exists at the decided location, encoding the
  grilling #1 target state (the 20 decisions' on-disk consequences: which
  skills exist in which buckets, which repo-root docs exist, the planning
  flow, the conventions, the keep-as-ours items).
- The spec is **verified** against the actual post-adoption repo state
  (what `run-adoption-migration` landed) — where the adoption deviated
  from grilling #1, the spec records the deviation as the truth.
- The spec is versioned (ties to `schema_version: 3` / package version) so
  future migrations to later states are reproducible.
- The migration skill references the spec as its target-state source.
- No-em-dashes; `npm test` green.

## Test plan

Seams: `npm test`, manual review (the spec is the durable artifact).
Failure modes: the spec disagrees with the actual repo state (must
verify); the spec duplicates the grilling #1 task body verbatim (must be
a distillation). Scenarios: a future migration reads the spec to know the
target. Edge cases: format choice (YAML vs Markdown section — record
rationale).

## Constraints and dependencies

- Blocked by `skill-and-detection-and-upgrade-resource` (the skill
  references the spec; build the skill first, then the spec it reads).
- Grilling #2 R1Q2. Source: grilling #1 decision table + the actual
  post-adoption repo.
