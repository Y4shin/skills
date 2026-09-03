---
kind: slice
slug: scaffold-repo-root-docs
title: Scaffold repo-root CONTEXT.md, docs/adr/, Pi-adapted conventions doc, docs/agents/, and docs/tasks/out-of-scope/ + the schema_version mechanism
task: ../task.md
mode: hitl
status: done
size: m
blocked_by:
- reorganize-into-buckets
---

## End-to-end behavior

The repo gains the grilling #1 Q2 + Q17 repo-root docs: a root `CONTEXT.md`
(this repo's own domain glossary, modeled on Matt's), `docs/adr/` (repo
ADRs, seeded with an ADR recording this largely-adopt decision), a
Pi-adapted agent-conventions doc (Matt's is `CLAUDE.md`/`AGENTS.md`; ours
is adapted to Pi — not Claude-specific — and records the bucket/promotion
rules, the invocation split, the no-em-dashes rule, and the skill-tool
invocation convention), `docs/agents/` (per-repo config the skills read,
seeded from `onboard-workflow`'s future output), and `docs/tasks/out-of-
scope/` (the rejected-requests KB, Q17). The `schema_version` mechanism is
added to `docs/tasks/state.yaml` (grilling #2 R2Q1) — set to `2` for now
(the build-migration-skill task bumps it to 3 once the adoption is proven;
this slice introduces the field).

## Acceptance criteria

- `CONTEXT.md` exists at repo root with a glossary for this repo (terms:
  task-workflow, map, task, slice, frontier, etc.; modeled on Matt's
  `CONTEXT.md` format from `domain-modeling/CONTEXT-FORMAT.md`).
- `docs/adr/` exists with a seed ADR `0001-largely-adopt-mp-skills.md`
  recording this adoption decision + its rationale (the 3 ADR criteria from
  `domain-modeling/ADR-FORMAT.md`: hard-to-reverse, surprising, real
  trade-off).
- A Pi-adapted agent-conventions doc exists (name TBD — e.g.
  `AGENTS.md` or `CONVENTIONS.md` — **confirm with user**); records bucket
  layout, promotion rules, invocation split, no-em-dashes, skill-tool
  invocation convention. NOT Claude-specific.
- `docs/agents/` exists (seeded minimal; `onboard-workflow` will populate
  it in future onboarding).
- `docs/tasks/out-of-scope/` exists (the rejected-requests KB; empty +
  with a `README.md` explaining its purpose per Q17).
- `docs/tasks/state.yaml` gains `schema_version: 2` (the field is
  introduced; the build task bumps to 3).
- No-em-dashes applied to all new prose; `npm test` green (new files don't
  break structure assertions, but verify).

## Test plan

Seams: `npm test` (structure assertions), manual review of the
conventions doc (it's the load-bearing hitl artifact). Failure modes: the
conventions doc is Claude-specific (must be Pi-adapted); CONTEXT.md
contains implementation details (must be glossary-only per domain-
modeling); ADR missing one of the 3 criteria. Scenarios: a new reader
understands the repo layout from the conventions doc; `triage` (added
earlier) can read `docs/tasks/out-of-scope/`. Edge cases: naming the
conventions doc (AGENTS.md vs CONVENTIONS.md — confirm with user; Matt
uses CLAUDE.md/AGENTS.md symlink, we are Pi-native).

## Constraints and dependencies

- Blocked by `reorganize-into-buckets` (the conventions doc records the
  bucket layout that slice establishes).
- **HITL because:** the conventions doc name/content + the CONTEXT.md
  glossary terms benefit from user confirmation.
- Grilling #1 Q2 (adopt all three repo-root docs), Q10 (no-em-dashes),
  Q17 (out-of-scope at docs/tasks/out-of-scope/), Q14 (invocation
  convention). Grilling #2 R2Q1 (schema_version mechanism).
- Source: Matt's `CONTEXT.md`, `CLAUDE.md`, `.agents/adr/`,
  `domain-modeling/{CONTEXT-FORMAT,ADR-FORMAT}.md` in the gitignored clone.
