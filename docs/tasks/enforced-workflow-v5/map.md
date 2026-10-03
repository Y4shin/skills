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
- Every effort is the full arc: wayfinder map, decision tasks, spec, tickets,
  implementation. An effort with no spec and no tickets is illegal going
  forward. A simple map still produces a spec and at least one ticket.
- Out of scope: the per-ticket chain internals (`ticket-chain.js`,
  `end-of-effort.js`, the verdict and host-gate mechanics), the 11 agent
  definitions, repo gating, the telemetry and feedback layer, and the
  two-phase planning model itself.
- The effort's final ticket is a documentation re-sync ticket: audit
  `CONTEXT.md`, the top-level `README.md`, and the bucket READMEs against the
  implemented v5 and fix what drifted. It is blocked by every other ticket.
- Backward compatibility: schema 5 with a migration path, reusing
  `src/migrate-cli.ts`; v3 and v4 stay readable during the transition.
- Pi-native: no Claude Code plugin manifest, no skills.sh.
- No em-dashes in repo prose.

## Decisions so far

- One effort covers all five pillars, delivered through the existing
  two-phase model.
- Documentation re-sync is in scope, as the effort's final ticket.
- Schema 5 with migration; small additive changes only, because the change is
  enforcement rather than a schema redesign.
- The open decisions are grouped into nine themed grilling tasks, plus a
  research task and a prototype task ahead of the disclosure grilling.
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

## Fog

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
