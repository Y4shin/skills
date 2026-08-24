---
kind: slice
slug: diagnosing-bugs-pipeline-wiring
title: Wire /diagnosing-bugs into bug.md + the path-agnostic tdd-worker line + xref tests
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: [diagnosing-bugs-skill-content]
---

# Slice 2: Wire /diagnosing-bugs into the bug pipeline + the tdd-worker line

## End-to-end behavior

The tdd-worker, dispatched on a `type: bug` task, receives `skill:
"diagnosing-bugs"` and an explicit "You are on a type: bug task" instruction;
the agent prompt has the path-agnostic line that routes it to the diagnosing
discipline. Xref tests lock the contract.

## Deliverables

### `skills/implement-task/resources/bug.md`

- tdd-worker chain step: add `skill: "diagnosing-bugs"` to the
  `subagent({...})` call (alongside the existing `skill: "tdd"`).
- Add the explicit instruction line to the dispatch `task:` prompt: "You are
  on a `type: bug` task; consult the `/diagnosing-bugs` skill for the 6-phase
  debugging discipline (Phase 1 non-skippable; others skippable with a
  recorded reason)."
- Keep all existing agent references (tdd-worker, slice-verifier, land-worker,
  code-reviewer) and the failure toolbelt ("split" before "retry", "parent
  never implements") and the red-first test rule.

### `agents/tdd-worker.md`

- Add a path-agnostic line (near the existing `/tdd` consult line in
  Constraints): "If the dispatch passes `/diagnosing-bugs`, you are on a bug
  task — follow it for the 6-phase debugging discipline."
- Keep frontmatter unchanged.

### `tests/skills.test.ts`

- Add xref assertions:
  - `bug.md` references `diagnosing-bugs` (the skill is wired).
  - `tdd-worker.md` references `diagnosing-bugs` (the path-agnostic line).

## Acceptance criteria

- `skills/implement-task/resources/bug.md` tdd-worker dispatch passes
  `skill: "diagnosing-bugs"` AND includes the explicit "You are on a type:
  bug task" instruction line.
- `agents/tdd-worker.md` has the path-agnostic "if `/diagnosing-bugs` is
  passed…" line; frontmatter unchanged.
- `tests/skills.test.ts` has the two new xref assertions; all pass.
- Existing xref tests still pass (bug.md: tdd-worker/slice-verifier/land-worker/
  code-reviewer + red-first rule; "split" before "retry" + "parent never
  implements").
- `npm test -- tests/skills.test.ts` green.

## Test plan

- Seams: the structure/xref tests.
- Failure modes: a required reference dropped → xref test fails; frontmatter
  changed → agent frontmatter test fails.
- Scenarios: `npm test -- tests/skills.test.ts` green; reading bug.md shows
  `skill: "diagnosing-bugs"` + the instruction line; reading tdd-worker.md
  shows the path-agnostic line.
- Edge cases: `no chain JSON references` / `no supervisor/intercom` pass.

## Constraints

- The skill's *presence* (bug.md passes it; feature.md doesn't) + the explicit
  instruction line is the bug-signal. Do not sniff frontmatter or infer from
  prompt wording.
- feature.md is unchanged (does not pass `diagnosing-bugs`).
- Do not change the 6-phase content in this slice (slice 1 owns the SKILL.md).
- Do not make the phases mandatory (Phase 1 non-skippable; 2–6 skippable).
