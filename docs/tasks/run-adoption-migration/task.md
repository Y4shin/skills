---
kind: task
type: feature
slug: run-adoption-migration
title: Run the largely-adopt-Matt adoption on this repo (v2.10.0 → v3.0.0), the actual migration, whose proven steps the migration skill is later built from
map: adopt-mp-skills-way
status: ready
blocked_by:
- design-migration-skill
slices:
- scaffold-repo-root-docs
- reorganize-into-buckets
- retire-and-drop
- add-planning-handoff-skills
- add-utility-skills
- add-meta-triage-skills
- realign-skills
- rewire-implement-task
- changesets-prose-finalize
---

# run-adoption-migration, feature

## Decision being implemented

Grilling #1 (`map-mp-skills-onto-this-repo`) settled the largely-adopt target
state across 20 decisions (Q1-Q20). Grilling #2 (`design-migration-skill`)
designed a migration skill whose `upgrade-2-to-3` resource is an 11-step
ordered transformation. **This task runs those steps for real on this repo**
(v2.10.0 → v3.0.0), it is the actual adoption, not a dry-run. The proven
shape of these steps is what `build-migration-skill` (blocked by this task)
later distills into the reusable migration skill + `upgrade-2-to-3` resource,
so the migration skill is built from a battle-tested run rather than a
theoretical plan.

The slice order follows grilling #2's `upgrade-2-to-3` step order. As we
run each step, record the actual shape (what was added/removed/rewritten,
any surprise or deviation from the designed step) in the slice notes so the
build task can encode the truth, not the design.

## User-visible outcome

A repo that has largely adopted Matt Pocock's skills repo way: strict
two-phase planning (wayfinder → to-spec → to-tickets → implement-task);
repo-root `CONTEXT.md` + `docs/adr/` + Pi-adapted conventions doc; skills
reorganized into `engineering`/`productivity`/`misc`/`in-progress`/`deprecated`
buckets with promotion rules; human-facing docs pages per promoted skill;
12 new skills added; `report-bug` retired into `deprecated/` and
`grilling-with-ui` dropped; 4 skills re-aligned to Matt's current; `implement-
task` rewired with `implement-spec` graph/concurrency language; changesets
integrated into `release.sh`; no-em-dashes sweep; `schema_version` bumped to
3 in `state.yaml`. `npm test` green throughout.

## User story

As the maintainer of this task-workflow package, I want this repo to largely
adopt Matt Pocock's skills way, so that the skills, concepts, and conventions
match the agreed target state and the proven adoption steps can be encoded
into a reusable migration skill.

## Scope boundaries

- **In:** the 11 upgrade-2-to-3 steps (grouped into the 9 slices below), on
  this repo only.
- **Out:** building the reusable migration skill (that is `build-migration-
  skill`, blocked by this task); migrating any other repo; re-litigating
  grilling #1 decisions (the target state is fixed).
- **Constraint:** the `grilling` skill re-align is **consult-first** (grilling
  #1 Q13), the `realign-skills` slice must consult the user before rewriting
  the `grilling` skill text.
- **Constraint:** telemetry must be maintained/extended, never removed (map
  constraint). New/rewritten skills get `telemetry_skill_context` +
  `submit_feedback` wiring.
- **Source of truth:** the Matt clone at
  `docs/tasks/mp-skills-current-state-report/matt-skills/` (pinned `6654f6b`,
  gitignored) for adapting Matt's SKILL.md text; grilling #1's decision
  table in `docs/tasks/map-mp-skills-onto-this-repo/task.md` for the target
  state; `docs/testing.md` for the skill-prose-testing convention.

## Acceptance criteria

- The 9 slices below land in order, each demonstrable/independently verifiable.
- `npm test` is green after every slice (per `docs/testing.md`:
  `tests/skills.test.ts` structure assertions + `tests/skill-creator-scripts`
  where relevant; extend `SKILL_FILES` + manifest count for new skills).
- `state.yaml` carries `schema_version: 3` after the final slice.
- `package.json` `pi.skills` lists only promoted skills (in `engineering/` or
  `productivity/`), each with a `docs/<bucket>/<name>.md` page.
- Every new/rewritten skill has telemetry wiring + the no-em-dashes rule
  applied to its prose.
- No grilling #1 decision is silently violated; deviations are recorded as
  slice notes and surfaced to Wayfinder if they'd change the target state.
- The actual shape of each step (what changed, surprises, deviations) is
  recorded in the slice docs so `build-migration-skill` encodes the truth.

## Existing abstractions to use

- `task_*` tools (`task_frontier`, `task_dependency_levels`, `task_slices`,
  `task_map_tick`) for graph mechanics, foundational, unchanged.
- `skills/skill-creator/` + `skills/skill-creator/scripts/validate_skill.mjs`
  for scaffolding/validating new skills (each new skill must pass
  `validate_skill.mjs`).
- `tests/skills.test.ts` `SKILL_FILES` + manifest count assertions, extend
  for new skills.
- The Matt clone (gitignored) for adapting SKILL.md text + companion docs.
- `docs/testing.md` mock/seam conventions; `docs/repo-gating.md` (the repo-
  gate stays, Pi-native, no Matt equivalent).

## Relevant architecture / domain decisions

- Grilling #1 Q1 (strict two-phase), Q2 (repo-root docs), Q3 (buckets +
  promotion), Q5 (to-spec/to-tickets on docs/tasks/), Q7 (router keeps name),
  Q8 (7 utilities + wire implement-task), Q9 (docs pages), Q10 (no-em-dashes),
  Q11.1-Q11.7 (keep-as-ours items incl. implement-task borrows implement-spec),
  Q12 (triage retires report-bug), Q13/Q16 (4 re-aligns, grilling consult-
  first), Q14 (openai.yaml concept-not-file), Q15 (grill-me in, grilling-
  with-ui out), Q17 (out-of-scope at docs/tasks/out-of-scope/), Q18 (claude-
  handoff as inspiration only), Q19 (no misc), Q20 (changesets into release.sh).
- Grilling #2: the migration skill design (build task, blocked by this one).
