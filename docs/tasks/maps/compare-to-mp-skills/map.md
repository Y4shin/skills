---
kind: map
slug: compare-to-mp-skills
title: Improve workflow and toolkit using mp-skills patterns
status: active
tasks: [adopt-mp-skills-patterns]
---

## Destination

A version of this repo's workflow that incorporates the best patterns from
Matt Pocock's skills — composable reusable primitives, domain modeling,
code review, structured debugging, human-facing docs, design vocabulary,
context management, and utility skills — while keeping our structural
strengths (task type system, dependency graph, finalization pipeline,
sub-agent architecture, telemetry).

The result should feel like a fusion: mp-skills' *breadth and composability*
married to our repo's *automation depth and structural enforcement*.

## Constraints

- This repo is a Pi package — all skills, agents, and extensions must work
  within the Pi harness (no Claude Code plugin, no skills.sh).
- The existing `task_*` tools (frontier, dependency levels, finalization,
  slices) are foundational — any new skills must compose with or build on them.
- The existing sub-agent definitions (tdd-worker, slice-verifier,
  deviation-reporter, land-worker) and the parent-never-implements discipline
  are load-bearing design decisions.
- Telemetry (`telemetry_skill_context`, `submit_feedback`) must be maintained
  or extended, never removed.

## Decisions so far

- The comparison document (`compare-to-mp-skills.md`) catalogs every gap and
  strength across both repos — this is the shared reference for the effort.
  (Moved into this map directory as a resource artifact.)

## Fog

- Should we create reusable primitive skills (grilling, domain-modeling,
  codebase-design) alongside the existing task-type resources, or replace
  them?
- How should context management work in a Pi-native setting where `/handoff`
  and `/compact` don't exist?
- Is a code-review skill worth the agent overhead vs. the existing CI gate +
  TDD + verification pipeline?
- Should human-facing docs be auto-generated from SKILL.md frontmatter, or
  written separately?
- What utility skills (wizard, handoff, wait-what, teach, questionnaire) are
  most valuable in a Pi context?

## Out of scope

- Porting any mp-skills skill verbatim without adapting its invocation model
  (Claude Code plugin, skills.sh) to Pi's package system.
- Replacing the existing task type system or dependency graph — these are
  structural advantages, not gaps.
- Removing telemetry or feedback instrumentation.
