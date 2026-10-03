---
type: map
title: Enforced workflow v5
status: stable
blocked_by: []
---

# Enforced workflow v5

## Destination

A v5 of this package where every effort travels one visible path: a single
front door always creates an effort and a wayfinder map; every phase
transition (spec, tickets, dispatch, finalize, archive) is gated by tool
preconditions instead of prose; workflow tools are disclosed only while a
workflow skill is active; and an effort closes with a holistic
`finalize-effort` pass plus archive.

The rules the workflow already states, for example that `to-spec` must not run
while the map still has open decision tasks, become mechanically impossible to
violate. A model that ignores the skill prose still cannot perform the illegal
action, because the action's tool is either not available or refuses with the
legal next call.

## Constraints

- Enforcement over remodeling: the schema and the fundamental flow stay. Only
  small additive schema changes; the focus is gating, not a remodel.
- One effort covering all five pillars: one front door, mandatory map, gated
  transitions plus write lockdown, progressive disclosure, `finalize-effort`.
- Every effort is the full arc: wayfinder map, planning tasks, spec, tickets,
  implementation. An effort with no spec and no tickets is illegal going
  forward. There is no simple map: every effort carries at least one planning
  task, the grilling task that determines its non-goals and its non-negotiable
  facts.
- Out of scope: the per-ticket chain internals (`ticket-chain.js`,
  `end-of-effort.js`, the verdict and host-gate mechanics), the 11 agent
  definitions, repo gating, the telemetry and feedback layer, and the
  two-phase planning model itself.
- The effort's final ticket is a documentation re-sync ticket: audit
  `CONTEXT.md`, the top-level `README.md`, and the bucket READMEs against the
  implemented v5 and fix what drifted. It is blocked by every other ticket.
- Backward compatibility: schema 5 with a migration path, reusing
  `src/migrate-cli.ts`; v3 and v4 stay readable during the transition.
- Progressive disclosure needs `@earendil-works/pi-coding-agent` 1.0.0. This
  repo resolves 0.80.10, which has no `exposure`, `defaultActive`, or
  `tool_search` API, so the dependency bump is part of the effort. Verified by
  the open/close gating prototype.
- Pi-native: no Claude Code plugin manifest, no skills.sh.
- No em-dashes in repo prose.

## Decisions so far

- One effort covers all five pillars, delivered through the existing
  two-phase model.
- Documentation re-sync is in scope, as the effort's final ticket.
- Schema 5 with migration; small additive changes only, because the change is
  enforcement rather than a schema redesign.
- The open decisions are grouped into themed grilling tasks, plus a research
  task and a prototype task ahead of the disclosure grilling. A later
  grilling task, added when the reporting defect surfaced, covers what a skill
  reports to the human when it finishes.
- The overloaded `implement-task` skill is split into planning and ticket
  execution, decided by its own grilling task rather than folded into the
  skill-surface decision.
- Shared vocabulary is a first-class decision. A dedicated grilling task
  settles the ubiquitous language (effort, map, task, ticket, and the rest)
  before the front door, simple-map, schema 5, and skill-surface decisions
  are taken, and the effort's final documentation ticket writes the agreed
  glossary into `CONTEXT.md`.
- An effort is the whole arc: wayfinder map, decision tasks, spec, tickets,
  implementation. An effort without a spec and tickets is illegal going
  forward. Settled in grilling round 1.
- `task` (planning) and `ticket` (implementation) are two graph kinds with
  kind-scoped `blocked_by` edges; `spec.md` is the handoff between them.
  Settled in the vocabulary grilling (Q1).
- The specification (`spec.md`) and the architecture (`architecture.md`) are
  separate artifacts with separate producers: the specification carries the
  decisions settled during planning (including architecture decisions), and
  the architecture is produced at `to-tickets`, inlining the specification's
  architecture content and becoming the living document when implementation
  shows a change is needed. The duplicate seam interview in the
  implementation pipeline ends. Settled in the vocabulary grilling (Q3, Q4).
- The front door is `intake`, for both the phase and the skill; `triage` is
  retired. Legacy v3 and v4 vocabulary (`slice`, `docs/tasks/maps/`,
  `mode: hitl/afk`, the broad `type:` value set) is retired from the workflow
  language and survives only in the migration layer. Settled in the vocabulary
  grilling (Q5, Q6).
- The opener tool is also the gate: it takes the phase's target, performs
  that phase's precondition checks, blocks the skill when they are not met,
  tells the agent what to do instead, and activates the toolset only when they
  pass. Settled in the vocabulary grilling (Q7).
- finalize-effort triages the holistic review's findings (in-scope items become
  implementation tickets in the effort, out-of-scope ones a follow-up effort
  created only after a human yes, informational ones stay in the review
  artifact), and an effort does not archive while a finding is
  undispositioned. The follow-up effort is linked by an additive
  `origin_effort` field on its map, and the review artifact moves into that
  follow-up effort so no finding is stranded in an archive. Settled in the
  finalize-effort grilling (Q1, Q2).
- `finalize-task` is retired as a skill; its per-ticket close-out (CI gate,
  knowledge harvest, changelog, done-marking, close-out, merge to main) runs
  inline in the ticket-execution skill, in the same run that lands the ticket.
  `finalize-effort` stays the effort-level pass. Decided by the user, recorded
  in the skill-surface and implement-task-split planning tasks.
- Every new bug report becomes an effort (a map plus at least one `subtype:
  bug` implementation ticket inside it); `docs/bugs/` retires as a live
  substrate. Settled in the front-door grilling (Q1).
- The `simple map` concept is abandoned: a small request is a regular effort
  whose map carries exactly one planning task, a grilling task that determines
  the effort's non-goals and its non-negotiable facts (including the
  effort-level success test), and Wayfinder must establish those before it may
  hand off to `to-spec`. Intake no longer decides simple versus full. Decided
  by the user, recorded in the simple-map task; the vocabulary's `simple map`
  term is superseded.
- The intake round is deliberately minimal: the raw request, a one-line
  destination, the actor, feature or bug, and three to five user stories (or a
  bug's reproduction); constraints are optional and "don't know" is
  acceptable. Its duplicate and link checks are bounded: efforts, existing
  documentation (ADRs, `CONTEXT.md`), and a time-boxed reach into the code.
  There is no trigger question, and non-goals and the success test belong to
  Wayfinder, not intake. Settled in the front-door grilling (Q2, Q3).

## Fog

- Whether a living-architecture change that contradicts a settled planning
  decision is also recorded as an ADR or a map decision, since the
  specification's architecture content becomes archival.
- Whether skills should also declare `allowed-tools` to line up with
  disclosure, or whether activation alone is enough.
- How `task-workflow-overview` answers read queries when workflow tools are
  hidden outside skills.
- Whether v5 ripples into `setup-workflow`'s onboarding templates and
  `docs/migration-target.yaml`.
- Whether telemetry should record tool activation and deactivation as
  workflow events.

## Out of scope

- Rewriting the chain internals and the verdict and host-gate mechanics.
- Changing the 11 agent definitions.
- Repo gating and the telemetry or feedback layer.
- Migrating downstream repos, which is `setup-workflow`'s job once schema 5
  lands.
- Any change to the shape of the two-phase planning model.
