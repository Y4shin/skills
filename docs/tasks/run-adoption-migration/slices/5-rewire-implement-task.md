---
kind: slice
slug: rewire-implement-task
title: Wire implement-task to dispatch to the new utility skills + borrow implement-spec's graph/concurrency language
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
- add-utility-skills
- add-meta-triage-skills
---

## End-to-end behavior

`implement-task` is rewired per grilling #1 Q8 + Q11.7: (a) its per-type
dispatch grows to dispatch to the new utility skills for matching task
types where applicable under the two-phase model (e.g. a `prototype` task
dispatches to the `prototype` skill; a `research` task dispatches to the
`research` skill) — **note** Q11.1 scoped types by phase: planning types
(research/prototype/grilling/manual) from wayfinder, feature/bug from
to-tickets, so the dispatch wiring respects that split; (b) the `implement-
task` SKILL.md + its feature/bug resources borrow `implement-spec`'s
explicit task-graph + concurrent-implementer + merger-subagent +
maximum-concurrency-frontier language, synthesized into our richer pipeline
(verifier retry, size budgets, failure toolbelt integration are kept).
`implement-task`'s telemetry wiring is preserved (map constraint).

## Acceptance criteria

- `implement-task` SKILL.md references the new utility skills where its
  per-type dispatch table should call them (for prototype/research task
  types), using Pi's invocation convention.
- The feature/bug resources (or the SKILL.md) gain `implement-spec`-style
  graph/concurrency language (frontier concurrency, merger subagents,
  single-PR landing) without losing the existing verifier-retry / size-
  budget / failure-toolbelt mechanics.
- The `research`-skill-vs-task-type and `prototype`-skill-vs-task-type
  convergence (noted in `add-utility-skills`) is resolved here: decide
  whether the task type dispatches to the skill, the skill subsumes the
  task type, or they coexist — record the decision.
- Telemetry wiring preserved; no-em-dashes applied.
- `tests/skills.test.ts` (which asserts implement-task references tdd-worker
  etc.) is updated if references change; `npm test` + `npm run typecheck`
  green.

## Test plan

Seams: `tests/skills.test.ts` structure/cross-reference assertions for
implement-task; typecheck. Failure modes: the new dispatch references a
skill that doesn't exist yet (ensure add-utility-skills landed); the
implement-spec language is bolted on without integrating with the existing
failure toolbelt (must synthesize, not append). Scenarios: a `prototype`
task dispatches to the `prototype` skill; a feature task's resource
describes frontier concurrency. Edge cases: a task type with no matching
new skill (grilling/manual) — dispatch unchanged.

## Constraints and dependencies

- Blocked by `add-utility-skills` + `add-meta-triage-skills` (the skills it
  dispatches to must exist).
- Grilling #1 Q8 (wire implement-task), Q11.1 (types scoped by phase),
  Q11.7 (borrow implement-spec ideas), Q14 (invocation convention).
- Source for implement-spec language: `docs/tasks/mp-skills-current-state-
  report/matt-skills/skills/in-progress/implement-spec/SKILL.md` (gitignored).
- Does NOT depend on the hitl slices (to-spec/to-tickets are upstream of
  implement-task, not dispatched-to by it).
