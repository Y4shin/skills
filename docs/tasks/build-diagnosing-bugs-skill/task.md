---
kind: task
type: feature
slug: build-diagnosing-bugs-skill
title: Build the /diagnosing-bugs skill and wire it into the bug pipeline
map: compare-to-mp-skills
status: done
blocked_by:
- bug-workflow-enhancements
slices:
- diagnosing-bugs-skill-content
- diagnosing-bugs-pipeline-wiring
---

## Decision being implemented

From the settled grilling task `bug-workflow-enhancements` (Q1–Q6): build a
model-invoked `/diagnosing-bugs` skill (mp-skills' 6-phase debugging discipline)
and wire it into the bug pipeline so the tdd-worker gets the feedback-loop /
hypothesis / instrumentation discipline on every `type: bug` task.

## User-visible outcome

A `/diagnosing-bugs` skill exists, is registered, and — when the tdd-worker
runs a `type: bug` task — is consulted (passed via `skill: "diagnosing-bugs"`)
for the 6-phase discipline: build a red-capable loop (Phase 1, non-skippable),
reproduce+minimise, hypothesise 3–5 ranked, instrument, fix+regression, cleanup
(skills skippable with a recorded reason). Phase 6 flags "no correct seam"
findings for wayfinder / `/improve-codebase-architecture`.

## Scope

In scope:
- `skills/diagnosing-bugs/SKILL.md` — model-invoked skill; the 6-phase
  discipline adapted from mp-skills. Phase 1 (build a tight red-capable
  feedback loop) is non-skippable; Phases 2–6 skippable with a recorded
  one-line justification. Phase 6 flags "no correct seam" findings for
  wayfinder / `/improve-codebase-architecture` (does not auto-spawn). Includes
  the redact-secrets rule (mp-skills). Includes the Phase 1 completion
  criterion (one red-capable command, already run, shown redacted).
- `package.json` `pi.skills` gains `"./skills/diagnosing-bugs"` (length 9 → 10,
  accounting for the doctor skill if it lands first; confirm current length at
  implementation time).
- `tests/skills.test.ts` — add `"skills/diagnosing-bugs/SKILL.md"` to
  `SKILL_FILES`; update `pi.skills.length`; xref assertions (the SKILL.md
  names Phase 1 as non-skippable; references the skip-with-reason rule).
- `skills/implement-task/resources/bug.md` — add `skill: "diagnosing-bugs"` to
  the tdd-worker dispatch (alongside the existing `skill: "tdd"`); add the
  explicit instruction line to the dispatch `task:` prompt: "You are on a
  `type: bug` task; consult the `/diagnosing-bugs` skill for the 6-phase
  debugging discipline (Phase 1 non-skippable; others skippable with a
  recorded reason)."
- `agents/tdd-worker.md` — add a path-agnostic line: "If the dispatch passes
  `/diagnosing-bugs`, you are on a bug task — follow it for the 6-phase
  debugging discipline."

Out of scope:
- A `/triage` skill (deferred — Q2; if wanted, a `bug_list`/`bug_queue` tool,
  not a skill).
- The `bug_list`/`bug_queue` tool (low-priority fog).
- Changes to `report-bug` intake (unchanged).
- The architecture skill (separate, blocked by prereqs).

## Acceptance criteria

- `skills/diagnosing-bugs/SKILL.md` exists and is non-empty.
- The SKILL.md describes the 6 phases; names Phase 1 as non-skippable; states
  the skip-with-recorded-reason rule for 2–6; documents the Phase 6
  no-correct-seam handoff flag.
- `package.json` `pi.skills` contains `"./skills/diagnosing-bugs"` (length
  bumped correctly).
- `tests/skills.test.ts` green: `SKILL_FILES` includes the diagnosing skill;
  `pi.skills.length` updated; xref assertions pass.
- `skills/implement-task/resources/bug.md` tdd-worker dispatch passes
  `skill: "diagnosing-bugs"` AND includes the explicit "You are on a type: bug
  task" instruction line.
- `agents/tdd-worker.md` has the path-agnostic "if `/diagnosing-bugs` is
  passed…" line.
- Existing xref tests still pass (bug.md references tdd-worker/slice-verifier/
  land-worker + red-first rule + code-reviewer; "split" before "retry" +
  "parent never implements").
- Full test suite green (modulo the 16 pre-existing session.test.ts failures).

## Existing abstractions to use

- The `skill:` subagent param (pass `diagnosing-bugs` to the tdd-worker —
  proven by /tdd and /code-review).
- The `SKILL_FILES`/`pi.skills.length` assertion pattern.
- mp-skills' `/diagnosing-bugs` SKILL.md as the source to adapt from (not port
  verbatim — our tdd-worker is a fresh-context agent with budgets; the skill
  guides via `skill:`, not as a standalone session; Phase 6 hands to wayfinder
  not to-spec/to-tickets).

## Do NOT reimplement

- Do not port mp-skills verbatim. Adapt to our pipeline (delivered via `skill:`
  to the tdd-worker; hands to wayfinder; not a standalone session).
- Do not change `report-bug` or add a `/triage` skill.
- Do not make the phases mandatory (Phase 1 non-skippable; 2–6 skippable with
  reason).
- Do not auto-spawn architecture tasks from Phase 6 findings.

## Architecture notes

- Slice 1 (skill content + manifest + structure tests) has no deps. Slice 2
  (pipeline wiring: bug.md `skill: "diagnosing-bugs"` + instruction line;
  tdd-worker path-agnostic line; xref tests) is blocked_by slice 1.
- The skill is model-invoked (no `disable-model-invocation`) but delivered to
  the tdd-worker via `skill:`, not user-invoked standalone (it could be
  invoked standalone too — keep the description general).
- The bug-signal (Q6) is the skill's *presence* + the explicit instruction
  line; the agent prompt stays path-agnostic.
- Full architecture spec: `docs/tasks/build-diagnosing-bugs-skill/arch-spec.md`.

## Implementation notes

- Slice 1 (diagnosing-bugs-skill-content) landed: created `skills/diagnosing-bugs/SKILL.md` (6-phase discipline, Phase 1 non-skippable, 2–6 skippable with recorded reason, redact rule, Phase 6 no-correct-seam handoff); registered `"./skills/diagnosing-bugs"` in `package.json` `pi.skills` (9 → 10); extended `tests/skills.test.ts` with the new SKILL_FILES entry and xref assertions. Structure gate green (112/112), typecheck clean. Slice 2 (pipeline wiring) remains.
- Slice 2 (diagnosing-bugs-pipeline-wiring) landed: wired `skill: "diagnosing-bugs"` into bug.md's tdd-worker dispatch + explicit type:bug instruction line; added path-agnostic `/diagnosing-bugs` routing line to agents/tdd-worker.md; added two xref assertions to tests/skills.test.ts. Structure gate green (114/114), typecheck clean. No deviations; 3 files changed.
