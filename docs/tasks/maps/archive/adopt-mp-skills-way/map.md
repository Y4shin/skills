---
kind: map
slug: adopt-mp-skills-way
title: Largely adopt Matt Pocock's skills repo way over this repo's current setup
status: active
tasks:
- slug: mp-skills-current-state-report
  blocked_by: []
  done: true
- slug: map-mp-skills-onto-this-repo
  blocked_by:
  - mp-skills-current-state-report
  done: true
- slug: design-migration-skill
  blocked_by:
  - map-mp-skills-onto-this-repo
  done: true
- slug: run-adoption-migration
  blocked_by:
  - design-migration-skill
  done: true
- slug: build-migration-skill
  blocked_by:
  - run-adoption-migration
  done: true
---

## Destination

A version of this repo that has largely adopted the way Matt Pocock's skills
repo (`mattpocock/skills`) works, its skills, concepts, skill format, and
conventions, over what we currently use. "Largely adopt" means: on conflict,
Matt's way wins by default; we keep our version only where we have a concrete,
stated reason to.

The end state is reached when:

- Matt's skills repo has been re-cloned at a fresh pinned commit and a
  current-state report describes what it contains *now* (skills, concepts,
  conventions), not the stale snapshot behind the archived
  `compare-to-mp-skills` map.
- A grilling has mapped Matt's current state onto this repo and decided, per
  conflicting item, which version wins (Matt's by default, ours only with a
  stated reason) and what we keep that Matt's repo does not have.
- A second grilling has produced a migration plan encoded as a reusable
  migration skill (new or existing) that can move any repo set up under the
  current setup onto the new setup, because the adoption will likely change
  which files a repo using this workflow needs and how they look.
- Any remaining preparation tasks the grillings surface have been created
  and resolved before implementation begins.
- The repo's skills, concepts, and conventions match the agreed map, and the
  migration skill exists and has been validated (at least against this repo).

## Constraints

- This repo is a **Pi package**, all skills, agents, and extensions must work
  within the Pi harness. Matt's repo is a Claude Code plugin + skills.sh for
  Codex/other agents. Adoption means adapting his invocation model to Pi, not
  importing his harness verbatim.
- The existing `task_*` tools (frontier, dependency levels, finalization,
  slices) and the Pi extension in `src/pi.ts` are foundational. "Largely
  adopt" applies to skills/concepts/conventions/format, not to abandoning
  the Pi-native tooling that has no Matt-side equivalent.
- Telemetry (`telemetry_skill_context`, `submit_feedback`) must be maintained
  or extended, never removed.
- The migration must be reproducible on other machines: Matt's repo is cloned
  at a **pinned commit hash**, not a moving ref.
- There is no `CONTEXT.md` or ADR set in this repo today; if the adoption
  introduces repo-root docs (Matt has `.agents/adr/`, `CONTEXT.md`), that is
  in scope.
- The prior archived map `compare-to-mp-skills` (and its
  `compare-to-mp-skills.md` comparison doc) already selectively adopted Matt's
  patterns under a **fusion** posture ("his breadth + our depth"). This map's
  **largely-adopt** posture supersedes that fusion for anything still in
  conflict; it does not re-litigate decisions that are already settled and
  shipped unless the re-comparison shows Matt's current way differs.

## Decisions so far

- **Conflict default (grilling #1 policy):** when Matt's repo and this repo
  conflict on approach/convention, **Matt's wins by default**. We keep our
  version only when we have a concrete, stated reason to. (Entry grilling Q1.)
- **Extraction scope:** the research task extracts **skills + concepts only**
  from Matt's repo, SKILL.md content, the grilling/planning concepts, and
  skill format/conventions. It excludes Matt's CI/build tooling. (Entry
  grilling Q2.)
- **Clone & report home:** Matt's repo is cloned to a **gitignored scratch
  dir under this repo** and pinned to a **commit hash** so cloning is
  reproducible on other machines. The clone persists (gitignored) so grilling
  #1/#2 can re-open source files; `findings.md` is the canonical, self-contained
  report. (Entry grilling Q3, refined to gitignored + pinned hash.)
- **Migration skill target:** the migration skill is **reusable for any repo**
 , it is the way to get repos set up under the current setup working with the
  new setup, because the adoption will likely change which files a repo using
  this workflow needs and how they look. Migrating this repo is its first
  run/proof, not its only purpose. (Entry grilling Q4.)
- **Builds on the prior comparison, does not redo it blindly:** the prior
  `compare-to-mp-skills` map + `compare-to-mp-skills.md` doc already compared
  the two repos (at an old Matt commit) and adopted a fusion. The new research
  re-clones Matt's repo *now* and the new grillings re-decide under the
  stronger largely-adopt posture; the prior doc is a starting reference, not
  the source of truth.

- [map-mp-skills-onto-this-repo](../map-mp-skills-onto-this-repo/task.md):
  grilling #1 done. Largely-adopt target state settled across 20 decisions
  (Q1-Q20): strict two-phase planning (wayfinder=decisions only → to-spec →
  to-tickets → implement-task); repo-root CONTEXT.md+ADRs+conventions;
  buckets+promotion; human docs pages; 7 utility skills added; writing-for-
  agents adopted (skill-creator kept); triage adopted (report-bug retired);
  grill-me adopted (grilling-with-ui dropped); 4 skills re-aligned to Matt's
  current (grilling consult-first); keep-as-ours = dependency graph, finalization
  (drop CI gate, add human changelog), failure toolbelt, sub-agents (+extend),
  telemetry, Pi extension; no-em-dashes rule; changesets integrated into
  release.sh. Full decision table in the task body. Awaiting user confirmation
  of shared understanding before the task is marked done.
- [design-migration-skill](../design-migration-skill/task.md): grilling #2
  done. Migration skill designed: one auto-detecting skill (replaces
  onboard-workflow; handles onboard + migrate) with a version-stamp in
  state.yaml + per-upgrade resource files applied in sequence; target state
  distilled to a versioned spec file; transformations are a fixed ordered step
  list per upgrade (upgrade-2-to-3 = 11 steps tracing to grilling #1);
  dry-run + backup branch + idempotent; first run migrates this repo
  (v2.10.0 → v3.0.0); structure assertions in tests/skills.test.ts. Full
  design in the task body.

- [run-adoption-migration](../run-adoption-migration/task.md): feature task.
  Runs the actual adoption on this repo (v2.10.0 → v3.0.0) across 9 slices
  (5 afk: reorganize-into-buckets, retire-and-drop, add-utility-skills,
  add-meta-triage-skills, rewire-implement-task; then 3 hitl:
  scaffold-repo-root-docs, add-planning-handoff-skills, realign-skills
  (grilling consult-first); then 1 afk finalize: changesets-prose-finalize).
  The proven shape of these steps is the source for build-migration-skill.
  Dependency deliberately reversed: adoption first, then build the skill from
  the proven run (not before).
- [build-migration-skill](../build-migration-skill/task.md): feature task,
  blocked_by run-adoption-migration. Builds the reusable auto-detecting
  migration skill (replacing onboard-workflow) + the upgrade-2-to-3 resource
  distilled from the proven adoption + the versioned target-state spec +
  structure assertions. 3 slices.

## Fog

All items below were resolved by the research + grillings; no open fog remains
blocking implementation.

- ~~Is there an existing migration skill in this repo to extend, or must
  one be created from scratch?~~ RESOLVED by grilling #2 R1Q1: one
  auto-detecting skill replacing `onboard-workflow`.
- ~~What does "largely adopt" do to the items the prior fusion kept as ours?~~
  RESOLVED by grilling #1 Q11.1-Q11.7 (visited each; see task body).
- ~~Does Matt's repo now ship skills the prior comparison never saw?~~
  RESOLVED by research findings §5 + grilling #1 Q18/Q19 (in-progress/misc
  dispositions decided).
- ~~Are there preparation tasks between grilling #2 and implementation?~~
  RESOLVED by grilling #2 R3Q2: build the skill, then first-run = this repo
  (no spike, no separate before-snapshot, no separate fixture harness).
  Implementation begins directly with the build feature task.
- NEW fog (surfaced by grilling #2, open for implementation): the migration
  skill's name (stay `onboard-workflow` vs `setup-workflow`) and the
  target-state spec file location/format are left to implementation.
- The `grilling` re-align is consult-first (grilling #1 Q13): the
  upgrade-2-to-3 step 7 must consult the user before rewriting the `grilling`
  skill text. This is a constraint on implementation, not a blocking fog.

## Out of scope

- Porting Matt's CI/build tooling, release automation, or harness-specific
  packaging (Claude Code plugin manifest, skills.sh), extraction is skills +
  concepts only.
- Replacing the Pi extension / `task_*` tools with a Matt-side equivalent:
  there isn't one; these are foundational and stay.
- Re-litigating decisions from `compare-to-mp-skills` that the re-comparison
  confirms are still aligned with Matt's current way.
- Adopting Matt's skills verbatim without adapting their invocation model to
  Pi (a Claude Code plugin skill is not a drop-in Pi skill).
