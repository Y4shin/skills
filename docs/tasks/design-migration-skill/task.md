---
kind: task
type: grilling
slug: design-migration-skill
title: Design a reusable migration skill that moves any repo set up under the current setup onto the new (largely-adopt-Matt) setup
map: adopt-mp-skills-way
status: done
blocked_by:
- map-mp-skills-onto-this-repo
completed_at: 2026-09-03T19:25:00Z
---

# design-migration-skill, grilling

## Decision to settle

Design a **migration skill** that moves any repo set up under the *current*
task-workflow setup onto the *new* setup produced by this map's adoption
decisions. The adoption will likely change which files a repo using this
workflow needs on disk and how they look, the migration skill is the
repeatable way to make that transition.

Two sub-decisions are in scope and must be settled:

1. **Create vs reuse:** is there an existing skill in this repo to extend
   (e.g. `onboard-workflow`, which already creates the current on-disk
   scaffold), or must a new migration skill be created from scratch? (Entry
   grilling Q4 deliberately left this to grilling #2.)
2. **The migration design itself:** inputs, detection of the old setup,
   target state, transformations (files added/removed/rewritten), safety
   (dry-run, backup, idempotence), validation, and how it consumes the
   decision table from grilling #1 as its target-state spec.

The skill must be **reusable for any repo**, not one-shot for this repo.
Migrating this repo is its first run / proof, not its only purpose.

## Parent decisions it depends on

- **Migration skill target = reusable for any repo** (entry grilling Q4:
  settled). This grilling designs it; it does not re-ask reusability.
- **grilling #1's decision table** (blocked_by) is the target state. This
  grilling cannot design the migration without knowing what the new setup
  looks like on disk. If grilling #1 left structural axes (onboarding/setup,
  repo-root docs, spec/ticket step) unresolved, this grilling returns upward
  rather than guessing.
- **Extraction scope = skills + concepts only** (entry grilling Q2:
  settled). The migration moves on-disk workflow files, not CI/build tooling.

## Choices already known

## Decisions settled in this grilling (round 1)

- **Create vs reuse (R1Q1): ONE SKILL, onboard + migrate.** Replace
  `onboard-workflow` with a single skill that handles both initial onboarding
  (nothing → new) AND migration (old → new), auto-detecting which to do by
  inspecting the repo's detected state. Rationale: one entry point owns the
  entire on-disk scaffold lifecycle; the skill branches on detected state
  (no markers → onboard; old markers present → migrate; new markers present
  → no-op/already-on-new). Rejected: new `migrate-workflow` skill (migration
  is a distinct lifecycle event, but the user preferred one smart entry);
  extend `onboard-workflow` with a `--migrate` mode (two modes bloat one
  skill). Consequence: `onboard-workflow` is renamed/rewritten to the
  auto-detecting skill; the migration knowledge and the onboarding knowledge
  live in one skill that branches; the skill name is open (decide in
  implementation, could stay `onboard-workflow` or become `setup-workflow`).
- **Target state source (R1Q2): DISTILL TO A SPEC FILE.** Distill grilling
  #1's decisions into a stable, versioned target-state spec file that the
  migration reads, decoupled from the grilling task body. The grilling #1
  decision table is the *source*; the spec file is the durable,
  machine-readable *distillation*, versioned with the package. Rationale:
  the task body is a grilling artifact, not a stable machine-readable spec;
  reading it directly is fragile coupling. Rejected: read the task body
  (fragile); hardcode in the skill (decisions live in two places). Consequence:
  a new target-state spec file is created (location/format open, e.g.
  `docs/migration-target.yaml` or a section in the skill); it encodes the
  grilling #1 target state; the migration skill reads it; the spec is
  versioned with the package so migrations to future states are reproducible.

## Decisions settled in this grilling (round 2)

- **Detection (R2Q1): VERSION-STAMP + PER-UPGRADE RESOURCE FILES.** A version
  stamp in `docs/tasks/state.yaml` (e.g. `schema_version: 2`) is the fast path:
  the skill reads it; absent/old → migrate; current → no-op. Crucially, the
  migration is **not** one monolithic transform. Instead, each version-to-
  version upgrade is a **separate resource file** the skill ships (e.g.
  `resources/upgrade-2-to-3.md`), and if a repo is multiple versions out of
  date, the skill **applies the upgrades in sequence** (2→3, then 3→4, ...).
  Rationale: the user's refinement makes each upgrade a small, reviewable,
  independently-versioned unit; future upgrades just add a new resource file
  without touching old ones. Fresh repo (no stamp) → onboard. Rejected:
  marker-based detection alone (doesn't tell the skill the starting version);
  version-stamp + markers (markers are how an upgrade resource file does its
  work internally, not the top-level detection). Consequence: `state.yaml`
  gains `schema_version`; the skill ships a `resources/upgrade-<from>-to-<to>.md`
  per upgrade; the current adoption is `upgrade-2-to-3` (v2.10.0 → v3.0.0);
  the skill loops upgrades in sequence.
- **Transformations (R2Q2): FIXED ORDERED STEP LIST per upgrade resource.**
  Each per-upgrade resource file is a fixed, ordered step list the skill runs
  for that version-to-version transition. For the current adoption
  (`upgrade-2-to-3`), the steps trace to grilling #1 decisions in order:
  (1) scaffold new repo-root docs (`CONTEXT.md`, `docs/adr/`, conventions,
  `docs/agents/`), (2) add `docs/tasks/out-of-scope/`, (3) reorganize
  `skills/` into buckets + update `package.json` `pi.skills` to promoted-only,
  (4) add `docs/<bucket>/` pages per promoted skill, (5) retire `report-bug`,
  drop `grilling-with-ui`, (6) add new skills (`to-spec`, `to-tickets`,
  `prototype`, `research`, `resolving-merge-conflicts`, `wizard`, `handoff`,
  `to-questionnaire`, `teach`, `writing-for-agents`, `triage`, `grill-me`),
  (7) re-align 4 skills (`grilling` consult-first, `code-review`, `tdd`,
  `domain-modeling`), (8) wire `implement-task` dispatch + borrow
  `implement-spec` language, (9) changesets integrated into `release.sh`,
  (10) no-em-dashes sweep, (11) bump `schema_version` in `state.yaml`. The
  skill applies them; a human reviews the diff. Rejected: dynamic diff-driven
  plan (risks missing semantic transformations); hybrid (semantic re-aligns
  are themselves fixed steps inside the resource). Consequence: the
  `upgrade-2-to-3.md` resource is an ordered step list; future upgrades are
  their own resource files.

## Decisions settled in this grilling (round 3)

- **Safety (R3Q1): DRY-RUN + BACKUP BRANCH + IDEMPOTENT.** The migration
  skill provides three safety guarantees: (a) **dry-run mode** prints the
  planned steps + affected files without writing; (b) a **backup git branch**
  is created before applying any change (no destructive operation without
  it); (c) **idempotence**, re-running on an already-migrated repo detects
  `schema_version` is current and no-ops; re-running mid-migration resumes
  from the last uncompleted step. Rejected: idempotence only (riskier, no
  preview/rollback); full + per-step prompts (too interruptive). Consequence:
  the skill has a `--dry-run` mode, creates a backup branch first, and tracks
  per-step completion for resume.
- **First run (R3Q2): BUILD, THEN FIRST-RUN = THIS REPO.** The migration
  skill is built as a feature task, then its FIRST run migrates THIS repo
  (v2.10.0 → v3.0.0). The first run IS the proof AND the actual migration of
  this repo, one artifact, two purposes. The migration's own `state.yaml`
  `schema_version` bump closes the loop. Rejected: spike on a copy first
  (extra preparation step); build only, don't run here (delays the repo
  migration). Consequence: the build feature task is followed by running the
  skill on this repo; the map's implementation phase lands both the skill
  and the migrated repo.
- **Test strategy (R3Q3): STRUCTURE ASSERTIONS in tests/skills.test.ts.**
  Structure/cross-reference assertions per `docs/testing.md`'s skill-prose-
  testing convention: the migration skill exists, references `upgrade-2-to-3`,
  is in `package.json` `pi.skills`; + a `spawnSync` CLI test if the skill
  ships helper scripts. Mirrors how we test skills now. Rejected: fixture-
  based integration test (the integration harness is currently broken per
  `docs/testing.md`); both (most effort, depends on fixing the harness).
  Consequence: `tests/skills.test.ts` gains assertions for the migration skill;
  no new fixture harness in this map.

## Grilling summary, migration skill design (frontier empty)

All design axes visited across 3 rounds (R1Q1-2, R2Q1-2, R3Q1-3). The
migration skill is fully designed. This is the handoff spec for the
implementation feature task that builds it.

### The skill
- **One skill, auto-detecting:** replaces `onboard-workflow` with a single
  skill that handles fresh onboarding (nothing → new) AND migration
  (old → new), branching on detected state. Name open (stay `onboard-workflow`
  or become `setup-workflow`), decide in implementation.
- **Reusable for any repo** (entry Q4): migrating this repo is its first run,
  not its only purpose.

### Detection
- **Version-stamp in `docs/tasks/state.yaml`** (`schema_version: N`):
  absent → fresh onboard; old → migrate; current → no-op.
- **Per-upgrade resource files** (`resources/upgrade-<from>-to-<to>.md`):
  each version-to-version upgrade is a separate, reviewable, independently-
  versioned resource. Multiple versions out of date → apply upgrades in
  **sequence** (2→3, 3→4, ...). Current adoption = `upgrade-2-to-3`.

### Target state
- **Distill to a stable, versioned target-state spec file** (e.g.
  `docs/migration-target.yaml` or a skill section), decoupled from the
  grilling #1 task body. Grilling #1's decision table is the source; the spec
  is the durable, machine-readable distillation, versioned with the package.

### Transformations (per upgrade resource = fixed ordered step list)
For `upgrade-2-to-3`, steps trace to grilling #1 decisions, in order:
1. scaffold new repo-root docs (`CONTEXT.md`, `docs/adr/`, conventions,
   `docs/agents/`)
2. add `docs/tasks/out-of-scope/`
3. reorganize `skills/` into buckets + update `package.json` `pi.skills` to
   promoted-only
4. add `docs/<bucket>/` pages per promoted skill
5. retire `report-bug`, drop `grilling-with-ui`
6. add new skills (`to-spec`, `to-tickets`, `prototype`, `research`,
   `resolving-merge-conflicts`, `wizard`, `handoff`, `to-questionnaire`,
   `teach`, `writing-for-agents`, `triage`, `grill-me`)
7. re-align 4 skills (`grilling` consult-first, `code-review`, `tdd`,
   `domain-modeling`)
8. wire `implement-task` dispatch + borrow `implement-spec` language
9. changesets integrated into `release.sh`
10. no-em-dashes sweep
11. bump `schema_version` in `state.yaml`

### Safety
- **Dry-run** mode (print plan + affected files, no writes) + **backup git
  branch** before applying + **idempotent** (re-run no-ops if current; resumes
  from last completed step if mid-migration).

### First run & tests
- **Build, then first-run = this repo** (v2.10.0 → v3.0.0): the first run is
  both proof and the actual migration; the `schema_version` bump closes the
  loop.
- **Structure assertions in `tests/skills.test.ts`** (skill-prose-testing):
  skill exists, references `upgrade-2-to-3`, in `package.json` `pi.skills`;
  `spawnSync` CLI test if helper scripts ship. No new fixture harness.

### Open for implementation
- Skill name (stay `onboard-workflow` vs `setup-workflow`).
- Target-state spec file location/format (`docs/migration-target.yaml` vs a
  skill section).
- The `grilling` re-align is consult-first (grilling #1 Q13), the
  upgrade-2-to-3 step 7 must consult the user before rewriting `grilling`.

## Choices already known

- Candidate host skill to extend: `onboard-workflow` (creates `docs/tasks/`,
  `state.yaml`, `CHANGELOG.md`, `docs/testing.md`, `docs/dev-env.md` today).
  The migration is roughly "onboard-workflow's inverse + upgrade": detect
  the old scaffold, transform it to the new target, add anything new
  (CONTEXT.md, ADRs, new docs dirs, etc.), remove anything dropped.
- The migration must consume the **decision table** from grilling #1 as its
  target-state spec, so the skill does not hardcode decisions that the
  grilling settled.
- The migration is a Pi skill (runs in this harness), so it uses Pi tools
  (read/edit/write/bash, task_* tools) and writes to a repo's `docs/tasks/`
  tree, not a shell script Matt would ship.

## Recommended starting answer

Run the grilling in rounds:

1. **Round 1, create vs reuse:** decide whether to extend
   `onboard-workflow` (add a migration mode/sub-command) or create a new
   `migrate-workflow` skill. Recommend **new skill** unless extending is
   clearly lower-friction, migration is a distinct lifecycle event from
   initial onboarding, and conflating them risks both. But weigh that
   `onboard-workflow` already owns the on-disk scaffold knowledge.
2. **Round 2, inputs & detection:** how does the skill detect a repo is on
   the *old* setup (markers: `docs/tasks/state.yaml`, current `package.json`
   `pi.skills` list, absence of new markers)? How does it take the target
   state (reads the decision table artifact? embeds it? references the map?).
3. **Round 3, transformations:** the file-level changes, add
   `CONTEXT.md`/`docs/adr/` if grilling #1 adopted them, reshape
   `docs/tasks/` if the planning model changed, update skill list in
   `package.json`, remove deprecated dirs. Each transformation traces to a
   grilling #1 decision.
4. **Round 4, safety:** dry-run mode, backup/branch, idempotence (re-running
   on an already-migrated repo is a no-op or a clear "already on new
   setup"), and validation (what proves the migration succeeded).
5. **Round 5, validation & first run:** how the skill proves itself by
   migrating this repo, and what test strategy covers a skills-repo
   migration (structure assertions in `tests/skills.test.ts` per
   `docs/testing.md`'s skill-prose-testing convention).

Record each decision, rejected alternative, rationale, and downstream
consequence in a decision index this grilling maintains.

## What downstream work the answer may create

- The migration skill itself becomes a `type: feature` implementation task
  (created after this grilling via Wayfinder, not here).
- Preparation tasks between grilling #2 and implementation may surface here:
  e.g. "spike the migration on a throwaway copy of this repo", "freeze a
  before-snapshot / git tag of the current setup", "extend
  `tests/skills.test.ts` for the new skill". If so, they are graduated from
  Fog into tasks during this grilling or handed to Wayfinder.
- If the grilling finds grilling #1 left a structural axis unresolved, it
  returns upward (return-to-Wayfinder) with the specific gap, it does not
  design the migration against a hole.
- The finished migration skill's first run is migrating this repo, which is
  itself the bulk of the implementation phase and may decompose into multiple
  feature tasks (one per file/convention change), all coordinated by the
  migration skill and the map.
