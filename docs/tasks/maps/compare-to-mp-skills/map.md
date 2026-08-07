---
kind: map
slug: compare-to-mp-skills
title: Improve workflow and toolkit using mp-skills patterns
status: active
tasks:
  - adopt-mp-skills-patterns
  - tdd-skill-comparison
  - code-review-evaluation
  - improve-architecture-evaluation
  - bug-workflow-enhancements
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
- **Priority order for adoption** (from grilling Q1): (1) reusable primitives,
  (2) workflow, (3) context management, (4) utility skills.
- **All three primitives as model-invoked skills** (Q2): grilling,
  domain-modeling, and codebase-design.
- **Workflow model** (Q3): two-phase with wayfinder as pure router.
  Wayfinder delegates all execution (including grilling) to implement-task.
  Exploration phase: research/prototype/grilling only, with at least one
  grilling before soft pivot (alignment invariant). Execution phase:
  implementation tasks stable unless problem discovered. Feedback loop via
  return-to-wayfinder.
- **Context management** (Q4): session boundary guidance (close between
  phases), /handoff skill for unstructured session context, no compact/
  smart-zone skill.
- **Utility skills** (Q5): /handoff (build now), /wizard and
  /resolving-merge-conflicts (model-invoked, low effort), rest deferred.

## Fog

- How and when to create implementation tasks for the already-decided items
  (grilling/domain-modeling/codebase-design skills, wayfinder rewrite,
  wizard, resolving-merge-conflicts, handoff, session boundary guidance)?
  Awaiting the follow-up grilling tasks to determine sequencing.
- Should human-facing docs be auto-generated from SKILL.md frontmatter, or
  written separately?
- What about the remaining deferred utility skills (wait-what,
  to-questionnaire, teach) — are they worth a dedicated grilling?

## Out of scope

- Porting any mp-skills skill verbatim without adapting its invocation model
  (Claude Code plugin, skills.sh) to Pi's package system.
- Replacing the existing task type system or dependency graph — these are
  structural advantages, not gaps.
- Removing telemetry or feedback instrumentation.
