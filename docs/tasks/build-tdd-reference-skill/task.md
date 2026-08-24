---
kind: task
type: feature
slug: build-tdd-reference-skill
title: Build the /tdd reference skill and wire it into the TDD pipeline
map: compare-to-mp-skills
status: ready
blocked_by:
- tdd-skill-comparison
slices:
- tdd-skill-content
- tdd-pipeline-wiring
---

## Decision being implemented

From the settled grilling task `tdd-skill-comparison`: add a standalone,
model-invoked `/tdd` reference skill defining test quality (what a good test
is, seams, anti-patterns, loop rules) alongside the existing `tdd-worker`
agent, and wire it into the pipeline per the seven settled questions.

## User-visible outcome

A `/tdd` skill exists in this package, is registered in the manifest, and is
consulted by the `tdd-worker` during slice implementation. The TDD loop narrows
to RED→GREEN; refactoring moves to the end of implement-task. Test seams are
agreed in the arch spec (features) or the repro (bugs).

## Scope

In scope:
- `skills/tdd/SKILL.md` — the reference (good test, seams, anti-patterns, loop
  rules: red→green; refactor is a separate stage owned by implement-task).
- `skills/tdd/tests.md` — good/bad test examples (adapted from mp-skills under
  our voice/constraints).
- `skills/tdd/mocking.md` — when-to-mock guidelines (system boundaries only).
- `package.json` `pi.skills` gains `"./skills/tdd"`.
- `tests/skills.test.ts` — add `skills/tdd/SKILL.md` to `SKILL_FILES`; update
  the `pi.skills.length` assertion from 6 to 7.
- `skills/implement-task/resources/feature.md` — pass `skill: "tdd"` on the
  tdd-worker chain step; add a **Seams** section to the arch-spec template
  (Step 1); sharpen Step 3 (coherence refactor) to explicitly own the
  refactor step the tdd-worker shed.
- `skills/implement-task/resources/bug.md` — pass `skill: "tdd"` on the
  tdd-worker chain step.
- `agents/tdd-worker.md` — add a one-line instruction to consult `/tdd` and
  test only at agreed seams (arch-spec seams for features, repro seam for
  bugs); drop the inline REFACTOR from Step 3 so the loop is RED→GREEN
  (checkpoint commit after each GREEN remains).

Out of scope:
- A `/code-review` skill (sibling task `code-review-evaluation`).
- Moving the refactor home to a code-review skill (stays at implement-task
  Step 3 until that sibling decides).
- Test-quality judgment in the slice-verifier (sibling task).
- Auto-generation of human-facing docs (map fog).

## Acceptance criteria

- `skills/tdd/{SKILL.md,tests.md,mocking.md}` exist and are non-empty.
- `package.json` `pi.skills` contains `"./skills/tdd"` (length 7).
- `tests/skills.test.ts` green with `SKILL_FILES` including the tdd skill and
  the length assertion updated.
- `skills/implement-task/resources/feature.md` tdd-worker chain step passes
  `skill: "tdd"`; Step 1 arch-spec template includes a Seams section; Step 3
  explicitly owns the refactor step.
- `skills/implement-task/resources/bug.md` tdd-worker chain step passes
  `skill: "tdd"`.
- `agents/tdd-worker.md` instructs consulting `/tdd` and testing only at
  agreed seams; Step 3 loop is RED→GREEN (no inline REFACTOR sub-step).
- Existing cross-reference tests (tdd-worker, slice-verifier, land-worker,
  deviation-reporter references in feature.md/bug.md) remain green.
- Full test suite green.

## Existing abstractions to use

- The `skill:` subagent param (pi-subagents SKILL.md lines 75–76) — the
  Pi-native mechanism to inject a reference into a fresh-context child.
- The existing `agents/tdd-worker.md` frontmatter and structure (unchanged
  except Step 3 and the added consult line).
- The existing `skills/implement-task/resources/feature.md` Step 3 coherence
  refactor (already parent-owned; sharpened, not invented).
- `tests/skills.test.ts` `SKILL_FILES` + `pi.skills.length` pattern.

## Do NOT reimplement

- Do not port mp-skills' `/tdd` verbatim — adapt to our pipeline (no `to-spec`;
  seams via arch spec; loop is red→green; refactor at implement-task).
- Do not add test-quality judgment to the slice-verifier (sibling task).
- Do not bake the /tdd reference content into `agents/tdd-worker.md` (single
  source of truth = the skill; the agent prompt only references it).

## Architecture notes

- The `/tdd` skill is model-invoked (no `disable-model-invocation`). Its
  `description` should fire when test quality, seams, or red-green come up,
  and it must NOT claim the slice-verifier consults it today (Q7: verifier
  stays pass/fill; review is the sibling's domain).
- Slice 1 (content + manifest + structure tests) has no deps. Slice 2
  (pipeline wiring) is blocked_by slice 1 — you wire the skill slice 1
  created. Slice 2 is atomic: the consult line, the Seams section, the
  RED→GREEN narrowing, and the Step 3 sharpening land together so refactor
  always has a home (no transient void).

## Implementation notes

### Slice 1 — tdd-skill-content (landed)

Authored the `/tdd` reference skill as three prose files under
`skills/tdd/`: `SKILL.md` (frontmatter `name: tdd` with a description
firing on test quality / seams / red-green; sections on what a good test
is, seams where features are agreed in the arch spec and bugs use the
repro as the implicit seam, anti-patterns with one-line tells, and the
red → green loop with refactoring explicitly owned by implement-task
Step 3; a "Where it fits" note stating the tdd-worker consults it while
the slice-verifier does not), `tests.md` (good/bad test examples adapted
from mp-skills to this repo's TypeScript-flavored voice), and
`mocking.md` (mock only at system boundaries; design for mockability via
dependency injection). Registered `./skills/tdd` in `package.json`
`pi.skills` (length 6 → 7) and updated `tests/skills.test.ts` (`SKILL_FILES`
gains `skills/tdd/SKILL.md`; the `pi.skills.length` assertion bumped from 6
to 7). No pipeline wiring was touched (that is slice 2).

Verification: slice structure tests (`tests/skills.test.ts`) 89/89 green;
`npm run typecheck` clean. Full suite: 231 passed, 16 failed — all in the
pre-existing `tests/integration/session.test.ts` (`AuthStorage.inMemory`
harness error) which reproduces identically on `main` and is unrelated to
this slice. No new regressions.
