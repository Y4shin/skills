---
kind: slice
slug: add-planning-handoff-skills
title: Add to-spec + to-tickets (the two-phase handoff on docs/tasks/), reshaping wayfinder to decisions-only
task: ../task.md
mode: hitl
status: todo
size: m
blocked_by:
- reorganize-into-buckets
---

## End-to-end behavior

The two-phase planning handoff (grilling #1 Q1 + Q5) lands: new `to-spec`
and `to-tickets` skills (engineering/user) are added, adapted to Pi and to
the `docs/tasks/` substrate (Matt's live on an issue tracker). `to-spec`
synthesizes the conversation/map into `docs/tasks/<slug>/spec.md`;
`to-tickets` breaks it into tracer-bullet feature/bug tasks with
`blocked_by` edges, stored as `docs/tasks/<slug>/task.md` files.
`wayfinder` is reshaped to produce **decisions only** (research/prototype/
grilling/manual tasks) per Q1 — it no longer creates feature/bug tasks
(that's `to-tickets`' job now). The `return-to-Wayfinder` escape hatch is
replaced by Matt's "hand off, don't build" boundary. `task-workflow-
overview` is rewritten to the ask-matt-style router (Q7, name kept) +
companion `PHASE-BOUNDARIES.md`.

## Acceptance criteria

- `to-spec` SKILL.md exists (engineering/user), writes
  `docs/tasks/<slug>/spec.md`, no interview (synthesizes what's known).
  Telemetry + no-em-dashes.
- `to-tickets` SKILL.md exists (engineering/user), writes tracer-bullet
  feature/bug tasks under `docs/tasks/<slug>/task.md` with `blocked_by`
  edges (uses our existing task frontmatter + `task_*` tools for the graph,
  not a tracker). Includes the wide-refactor expand-contract exception.
  Telemetry + no-em-dashes.
- `wayfinder` SKILL.md is reshaped: produces decisions only (research/
  prototype/grilling/manual); no feature/bug task creation; "hand off,
  don't build"; the map body's Fog/Out-of-scope conventions stay.
- `task-workflow-overview` rewritten to ask-matt-style intent router (main
  flow: grill-with-docs/grilling → to-spec → to-tickets → implement-task;
  on-ramps; phase boundaries); companion `PHASE-BOUNDARIES.md` adapted.
  Name kept (Q7).
- Each new/changed skill passes `validate_skill.mjs`; `pi.skills` updated;
  `tests/skills.test.ts` green; `npm test` + typecheck green.

## Test plan

Seams: `validate_skill.mjs`, `tests/skills.test.ts` (wayfinder/implement-
task cross-references may change), typecheck. Failure modes: `to-tickets`
speaks tracker-language (must use docs/tasks/ + task_* tools); `wayfinder`
still creates feature/bug tasks (must not, per Q1); the router omits a
flow. Scenarios: an idea flows wayfinder → to-spec → to-tickets →
implement-task on docs/tasks/. Edge cases: the `return-to-Wayfinder`
hatch removal — ensure nothing else references it (grep).

## Constraints and dependencies

- Blocked by `reorganize-into-buckets`.
- **HITL because:** the to-spec/to-tickets docs/tasks/ adaptation + the
  wayfinder reshape are the workflow spine; user confirmation on the
  adaptation is load-bearing.
- Grilling #1 Q1 (two-phase), Q5 (to-spec/to-tickets on docs/tasks/),
  Q7 (router keeps name), Q11.1 (types scoped by phase).
- Source: Matt's `to-spec`, `to-tickets`, `wayfinder`, `ask-matt` +
  `PHASE-BOUNDARIES.md` in the gitignored clone. Adapt the tracker substrate
  to docs/tasks/ (map constraint).
