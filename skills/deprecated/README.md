# Deprecated

Skills no longer used. A retired skill is kept here (not deleted) with a
note naming what replaced it.

- **[create-task](./create-task/SKILL.md)**: Compatibility redirect for the
  retired task-creation workflow; use `wayfinder` to create and grow task
  graphs. Replaced by `wayfinder`.
- **[report-bug](./report-bug/SKILL.md)**: Bug intake (capture,
  reproduce, triage/promote). Retired in favor of `intake`, which turns every
  bug report into an effort whose defect is a `subtype: bug` implementation
  ticket.
- **[onboard-workflow](./onboard-workflow/SKILL.md)**: Initialize a
  repository for the task-workflow. Replaced by `setup-workflow` (the
  `adopt-mp-skills-way` map, grilling #2 R1Q1: one auto-detecting skill that
  handles both onboarding and migration).
- **[triage](./triage/SKILL.md)**: Move bug reports and feature requests
  through a state machine of triage roles and write agent-ready briefs.
  Replaced by `intake` (the `enforced-workflow-v5` map: the single front
  door; every request becomes an effort, bugs included, so the parallel bug
  substrate and the rejection path both go).
- **[implement-task](./implement-task/SKILL.md)**: Implements an effort's
  ready tickets via per-ticket chains (planning subtypes included).
  Replaced by `implement-ticket` (the implementation phase; the planning
  half is Wayfinder's).
- **[finalize-task](./finalize-task/SKILL.md)**: Close out a landed ticket
  and, when the effort is done, the whole effort. Replaced by
  `implement-ticket` (the per-ticket close-out runs inline in the same
  run that lands the ticket); the effort-level close is `finalize-effort`.
