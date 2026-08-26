---
kind: map
slug: compare-to-mp-skills
title: Improve workflow and toolkit using mp-skills patterns
status: active
tasks:
  - slug: adopt-mp-skills-patterns
    blocked_by: []
    done: true
  - slug: tdd-skill-comparison
    blocked_by: []
    done: true
  - slug: build-tdd-reference-skill
    blocked_by: []
    done: true
  - slug: code-review-evaluation
    blocked_by: []
    done: true
  - slug: build-code-review-skill
    blocked_by: []
    done: true
  - slug: improve-architecture-evaluation
    blocked_by: []
    done: true
  - slug: build-task-workflow-doctor-skill
    blocked_by: []
    done: true
  - slug: build-improve-architecture-skill
    blocked_by: []
    done: false
  - slug: bug-workflow-enhancements
    blocked_by: []
    done: true
  - slug: build-diagnosing-bugs-skill
    blocked_by: []
    done: true
  - slug: build-codebase-design-skill
    blocked_by: []
    done: true
  - slug: build-grilling-skill
    blocked_by: []
    done: true
  - slug: build-domain-modeling-skill
    blocked_by: []
    done: true
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
  domain-modeling, and codebase-design. The grilling skill uses Matt Pocock's
  canonical template as its behavioral source:
  `https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/productivity/grilling/SKILL.md`.
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
- **Improve-architecture deferred** (improve-architecture-evaluation Q1):
  settle the shape now, build after the three prerequisite skills
  (codebase-design, grilling, domain-modeling — decided in the map but not
  yet built). The build task is raised blocked_by those three.
- **Improve-architecture report** (improve-architecture-evaluation Q2): HTML
  report in the OS temp dir (visual, Tailwind + Mermaid, before/after
  diagrams, strength badges), BUT with the CDN dependencies cached/vendored
  in the repo (~4MB: tailwind + mermaid) so it works offline. First vendored-
  asset precedent in this repo.
- **Improve-architecture handoff** (improve-architecture-evaluation Q3): the
  picked candidate's grilling decision feeds wayfinder (not to-spec/
  to-tickets — we have neither), which creates the deepening task. Mirrors
  our two-phase flow.
- **Improve-architecture scout** (improve-architecture-evaluation Q4): a
  custom read-only `architecture-scout` agent (tools: read, bash,
  get_guidelines; passed `skill: "codebase-design"`) walks the codebase for
  deepening candidates. Custom agent encodes the deletion-test/shallowness
  heuristic; harness-neutral (not Claude Code's `Agent` tool).
- **Improve-architecture grilling** (improve-architecture-evaluation Q5):
  report first, grilling only on an explicit user pick, with a documented
  no-grill mode. Addresses mp-skills' "10s of questions" complaint.
- **CONTEXT.md + ADRs + doctor** (improve-architecture-evaluation Q6): adopt
  repo-root `CONTEXT.md` + `docs/adr/` (mp-skills convention, optional).
  PLUS a new `task-workflow-doctor` skill (model-invoked) that diagnoses
  common workflow issues (missing CONTEXT.md/ADRs/docs dirs) and routes to
  the appropriate skill — separate build task.
- **Improve-architecture task complete** (improve-architecture-evaluation):
  grilling done. Decision: build /improve-codebase-architecture (deferred,
  blocked_by the three prerequisite skills) + a separate
  build-task-workflow-doctor-skill task. Raised both with Wayfinder.
- **Diagnosing-bugs skill** (bug-workflow-enhancements Q1): adopt mp-skills'
  6-phase debugging discipline as a model-invoked `/diagnosing-bugs` skill,
  passed to the tdd-worker via `skill: "diagnosing-bugs"` on bug tasks
  (mirrors /tdd + /code-review delivery). report-bug intake unchanged.
- **Triage** (bug-workflow-enhancements Q2): defer the /triage skill — it's
  mechanical (frontmatter filtering), not model reasoning, so it should be a
  tool/script, not a skill. If triage is wanted later, build a `bug_list`/
  `bug_queue` tool in src/pi.ts (extends the task_* family to docs/bugs/),
  NOT a skill. Low priority (grep + task-overview cover the common query).
- **Diagnosing-bugs Phase 6 handoff** (bug-workflow-enhancements Q3): when the
  tdd-worker finds no correct seam for a regression test, it flags the
  finding (divergence/uncertainty) for the parent → wayfinder or
  /improve-codebase-architecture. Flags; does not auto-spawn an architecture
  task.
- **Diagnosing-bugs firing** (bug-workflow-enhancements Q4): `skill:
  "diagnosing-bugs"` is passed on every type: bug task (no dispatch-time
  judgment; trivial bugs are already spot-fixed by report-bug).
- **Diagnosing-bugs phases** (bug-workflow-enhancements Q5): 6 phases
  skippable with a recorded justification; Phase 1 (build a red-capable loop)
  is non-skippable. Budget fallback = the existing uncertainty hatch.
- **Diagnosing-bugs bug-signal** (bug-workflow-enhancements Q6): the tdd-
  worker knows it's on a bug via the skill's presence (bug.md passes
  `diagnosing-bugs`; feature.md doesn't) + an explicit "You are on a type:
  bug task" instruction line in the dispatch. Agent prompt stays path-agnostic.
- **Bug-workflow task complete** (bug-workflow-enhancements): grilling done.
  Decision: build /diagnosing-bugs skill (unblocked) + defer /triage (if
  wanted, build a bug_list/bug_queue tool, not a skill). Raised
  build-diagnosing-bugs-skill with Wayfinder.

## Fog

- How and when to create implementation tasks for the already-decided items
  (grilling/domain-modeling/codebase-design skills, wayfinder rewrite,
  wizard, resolving-merge-conflicts, handoff, session boundary guidance)?
  Awaiting the follow-up grilling tasks to determine sequencing.
  - `build-tdd-reference-skill` (feature) is now precise enough to create —
    raised by tdd-skill-comparison.
  - `build-code-review-skill` (feature) raised by code-review-evaluation —
    now landed on main.
  - `build-improve-architecture-skill` (feature, blocked_by the three
    prerequisite build tasks) raised by improve-architecture-evaluation.
  - `build-task-workflow-doctor-skill` (feature) raised by
    improve-architecture-evaluation.
  - `build-diagnosing-bugs-skill` (feature, unblocked) raised by
    bug-workflow-enhancements.
  - `bug_list`/`bug_queue` tool (low priority) — extend src/pi.ts to scan
    docs/bugs/ by status; not a skill.
  - The three prerequisite skill build tasks are now created and ready:
    `build-codebase-design-skill`, `build-grilling-skill`, and
    `build-domain-modeling-skill`. They must land before
    `build-improve-architecture-skill` can graduate.
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
