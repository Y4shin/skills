# Largely adopt Matt Pocock's skills repo way over this repo's current setup

This repo previously adopted a *fusion* posture toward Matt Pocock's
skills (his breadth + our depth), settled in the archived
`compare-to-mp-skills` map. We re-cloned Matt's repo at a fresh pinned
commit (`6654f6b`), re-compared under a stronger **largely-adopt** posture
(on conflict, Matt's wins by default; we keep ours only with a concrete
stated reason), and decided to restructure: strict two-phase planning
(wayfinder produces decisions only, then `to-spec` + `to-tickets` create
implementation tasks, then `implement-task` executes), skills reorganized
into `engineering`/`productivity`/`misc`/`in-progress`/`deprecated` buckets
with promotion rules, 10 new skills added, `report-bug` retired into
`deprecated/` (subsumed by `triage`), `grilling-with-ui` dropped (replaced
by `grill-me`), repo-root `CONTEXT.md` + `docs/adr/` + `AGENTS.md`
introduced, changesets integrated into `release.sh`, and a no-em-dashes
prose rule adopted repo-wide.

The full decision table is in
[the grilling #1 task](../../tasks/map-mp-skills-onto-this-repo/task.md)
(20 decisions, Q1 through Q20) and the migration design in
[the grilling #2 task](../../tasks/design-migration-skill/task.md). The
map that coordinates the implementation is
[adopt-mp-skills-way](../../tasks/maps/adopt-mp-skills-way/map.md).

## Considered options

- **Keep the fusion posture** (selectively adopt, keep our structural
  strengths where they conflict). Rejected: the user chose to largely
  adopt Matt's way, with Matt's winning by default on conflict.
- **Adopt Matt's repo verbatim** (Claude Code plugin, skills.sh, issue
  tracker substrate). Rejected: we are a Pi package, not a Claude Code
  plugin; the `task_*` tools and `docs/tasks/` substrate are foundational
  with no Matt-side equivalent.

## Consequences

- The repo layout changed (bucket folders, new repo-root docs); a
  reusable migration skill (built in the `build-migration-skill` task)
  moves any repo on the old setup to the new one via a `schema_version`
  stamp in `docs/tasks/state.yaml`.
- `report-bug` and `grilling-with-ui` are retired; existing repos that
  invoke them need the migration.
- The planning model changed from dynamic-growth (planning + execution
  tasks in one graph) to strict two-phase; wayfinder no longer creates
  feature/bug tasks directly (that is `to-tickets`' job now).
- We keep our Pi-native automation depth (task type system, dependency
  graph + `task_*` tools, finalization pipeline minus the CI gate,
  failure toolbelt, sub-agents, telemetry) where Matt has no equivalent.
