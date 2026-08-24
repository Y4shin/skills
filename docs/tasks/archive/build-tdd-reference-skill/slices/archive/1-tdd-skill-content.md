---
kind: slice
slug: tdd-skill-content
title: Author the /tdd reference skill (SKILL.md + tests.md + mocking.md) and register it
task: ../task.md
mode: afk
status: done
size: m
blocked_by: []
---

# Slice 1: Author the /tdd reference skill and register it

## End-to-end behavior

The `/tdd` skill exists as a model-invoked reference in this package, with
companion reference docs, and is registered in the manifest. After this slice,
`/skill:tdd` is invokable and the structure tests pass against the new files.

## Deliverables

- `skills/tdd/SKILL.md` — frontmatter (`name: tdd`, `description:` firing on
  test quality / seams / red-green) + the reference body:
  - **What a good test is** — verifies behavior through public interfaces;
    reads like a specification; survives refactors.
  - **Seams — where tests go** — the public boundary; no test at an
    unconfirmed seam. For features, seams are agreed in the arch spec
    (implement-task Step 1). For bugs, the repro is the implicit seam
    (documented exception). Reference the `codebase-design` vocabulary only
    if that skill exists; otherwise state the seam terms inline.
  - **Anti-patterns** — implementation-coupled, tautological, horizontal
    slicing (one-line tell each, with a tiny example or pointer to tests.md).
  - **Rules of the loop** — red before green; one slice at a time; refactoring
    is NOT part of the loop — it belongs to implement-task's Step 3 coherence
    pass after all slices land, not to the per-slice worker.
  - Links to `tests.md` (examples) and `mocking.md` (guidelines).
  - A "Where it fits" note: consulted by the tdd-worker at authoring time
    (passed via the `skill:` param); the slice-verifier does NOT consult it
    (pass/fail gate); a future code-review skill will.
- `skills/tdd/tests.md` — good/bad test examples adapted from mp-skills under
  our voice: integration-style good test; implementation-coupled bad test;
  tautological bad test (expected value recomputed the way the code computes
  it) with the known-good-literal counterpart; bypassing-the-interface bad
  test with the through-interface good counterpart. TypeScript-flavored,
  matching this repo.
- `skills/tdd/mocking.md` — when to mock (system boundaries only: external
  APIs, time/randomness, sometimes DB/filesystem) and when not (your own
  modules); designing for mockability (dependency injection; SDK-style
  interfaces over generic fetchers). Adapted from mp-skills.
- `package.json` — add `"./skills/tdd"` to `pi.skills` (now length 7).
- `tests/skills.test.ts` — add `"skills/tdd/SKILL.md"` to the `SKILL_FILES`
  array; update the `pi.skills.length` assertion from `6` to `7`.

## Acceptance criteria

- The three files exist and are non-empty.
- `SKILL.md` frontmatter has `name: tdd` and a description > 5 chars.
- `SKILL.md` states the loop is red→green and that refactoring belongs to
  implement-task's Step 3 (not the per-slice worker).
- `SKILL.md` documents the feature seam rule (arch spec) and the bug seam
  exception (repro).
- `SKILL.md` does NOT claim the slice-verifier consults it.
- `package.json` `pi.skills` contains `"./skills/tdd"` and has length 7.
- `tests/skills.test.ts` `SKILL_FILES` includes the tdd skill; the length
  assertion expects 7.
- `npm test` green (the new skill passes the structure tests; no existing
  test regresses).

## Test plan

- Seams: this slice's output is prose + manifest + test constants. The test
  suite is the seam — the structure tests in `tests/skills.test.ts` verify
  the new skill file and the updated manifest.
- Failure modes:
  1. Manifest length mismatch → package.json test fails.
  2. SKILL.md missing frontmatter or description → skill structure test fails.
  3. Existing tests regress because `SKILL_FILES` or `pi.skills.length`
     wasn't updated in lockstep.
- Scenarios: `npm test` is green with the new skill registered and the
  assertions updated; removing any of the three files or reverting the
  manifest/test edits makes `npm test` red.
- Edge cases: the `no chain JSON references` and `no supervisor/intercom`
  skill tests must still pass for the new SKILL.md (avoid those patterns).

## Constraints

- Adapt mp-skills content to our pipeline (no `to-spec`; seams via arch spec;
  red→green; refactor at implement-task). Do not port verbatim.
- Single source of truth: this slice creates the skill; it does NOT wire it
  into implement-task or touch `agents/tdd-worker.md` (slice 2).
- No test-quality judgment added to the slice-verifier.
