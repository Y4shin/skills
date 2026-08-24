---
kind: map
slug: compare-to-mp-skills
title: Improve workflow and toolkit using mp-skills patterns
status: active
tasks:
  - adopt-mp-skills-patterns
  - tdd-skill-comparison
  - build-tdd-reference-skill
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
- **TDD reference skill** (tdd-skill-comparison Q1): add a standalone
  model-invoked `/tdd` reference skill defining test quality (good test,
  seams, anti-patterns, loop rules) alongside the existing tdd-worker agent.
  The agent keeps the loop mechanics; the skill owns the quality vocabulary
  the agent + slice-verifier consult. Settled; downstream questions open
  (seam-agreement point in our pipeline, REFACTOR-step interaction, doc scope).
- **TDD seams** (tdd-skill-comparison Q2): seam agreement lives in the arch
  spec (feature path, already user-approved). The tdd-worker tests only at
  those agreed seams; an unlisted seam triggers uncertainty.md. Bug tasks
  (no arch spec) use the repro as the implicit seam (Q5).
- **TDD refactor step** (tdd-skill-comparison Q3): the refactor step moves
  out of the tdd-worker agent (loop becomes RED→GREEN) and into the end of
  implement-task — the existing Step 3 coherence-refactor pass, run by the
  parent after all slices land. The `/tdd` skill describes red→green; the
  skill text points to implement-task (not a not-yet-existent code-review
  skill) as the refactor home. Bug path stays lean — no separate refactor
  stage; a bug needing real refactor was mis-scoped as a bug.
- **TDD doc structure** (tdd-skill-comparison Q4): ship the `/tdd` skill with
  companion reference docs — `SKILL.md` + `tests.md` + `mocking.md` — matching
  mp-skills' structure. First skill in this repo with companion docs; sets a
  precedent the human-facing-docs fog item (auto-generation) doesn't forbid.
- **TDD bug-path seam** (tdd-skill-comparison Q5): for bug tasks (no arch
  spec) the repro is the implicit seam — the broken observable behavior is at
  a public interface by definition. No new seam field on the lean bug path.
- **TDD skill delivery** (tdd-skill-comparison Q6): the `tdd-worker` receives
  `/tdd` via the `skill:` param on the `subagent({...})` call in implement-task's
  feature + bug resources. The agent prompt gains one line to consult the skill
  and test only at agreed seams. Single source of truth; coupling at the
  dispatch site, not duplicated in the agent YAML.
- **TDD verifier scope** (tdd-skill-comparison Q7): the slice-verifier stays
  pass/fail. Test-quality judgment in review is owned by the
  `code-review-evaluation` sibling task, not pre-empted here. `/tdd` is
  consulted at authoring time (tdd-worker); the verifier doesn't judge test
  quality today.
- **TDD task complete** (tdd-skill-comparison): grilling done. Decision:
  add `/tdd` reference skill (3 docs) + wire via `skill:` param + narrow
  tdd-worker to RED→GREEN + move refactor to implement-task Step 3. Raised a
  `type: feature` task `build-tdd-reference-skill` to Wayfinder to implement.
  `code-review-evaluation` sibling inherits the test-quality-review home
  question and the `/tdd` skill as its reference.

## Fog

- How and when to create implementation tasks for the already-decided items
  (grilling/domain-modeling/codebase-design skills, wayfinder rewrite,
  wizard, resolving-merge-conflicts, handoff, session boundary guidance)?
  Awaiting the follow-up grilling tasks to determine sequencing.
  - `build-tdd-reference-skill` (feature) is now precise enough to create —
    raised by tdd-skill-comparison.
- Should human-facing docs be auto-generated from SKILL.md frontmatter, or
  written separately? (Unaffected by tdd-skill-comparison Q4's companion-doc
  precedent, which is about hand-written reference files a skill author
  ships, not auto-generation.)
- What about the remaining deferred utility skills (wait-what,
  to-questionnaire, teach) — are they worth a dedicated grilling?

## Out of scope

- Porting any mp-skills skill verbatim without adapting its invocation model
  (Claude Code plugin, skills.sh) to Pi's package system.
- Replacing the existing task type system or dependency graph — these are
  structural advantages, not gaps.
- Removing telemetry or feedback instrumentation.
