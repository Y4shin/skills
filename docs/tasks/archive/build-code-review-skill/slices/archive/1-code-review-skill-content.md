---
kind: slice
slug: code-review-skill-content
title: Author the /code-review skill (SKILL.md + smells.md) and register it
task: ../task.md
mode: afk
status: done
size: m
blocked_by: []
---

# Slice 1: Author the /code-review skill and register it

## End-to-end behavior

The `/code-review` skill exists as a model-invoked reference in this package,
with the 12-smell baseline companion doc, and is registered in the manifest.
After this slice, `/skill:code-review` is invokable and the structure tests
pass against the new files.

## Deliverables

- `skills/code-review/SKILL.md` — frontmatter (`name: code-review`,
  `description` firing on "review", "standards", "spec", "smells", "review
  since X") + the body:
  - **Two-axis review** — Standards (is it built right?) + Spec (is it the
    right thing?). The two axes run as parallel sub-agents so neither
    pollutes the other; reports are presented side by side, never merged,
    never re-ranked; no single winner (a change can pass one axis and fail
    the other).
  - **Process** — pin the fixed point (`git diff <fixed-point>...HEAD`,
    three-dot); identify the spec source (features: task doc + arch spec;
    bugs: bug doc + repro); identify the standards sources
    (`get_guidelines` + repo override file + smell baseline); spawn both
    axis reviewers in parallel; aggregate under `## Standards` and `## Spec`
    headings verbatim or lightly cleaned; end with a one-line per-axis
    worst-issue summary, no cross-axis winner.
  - **Standards axis** — reads `get_guidelines` (repo standards + smell
    baseline floor) and any `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`. Repo
    overrides the baseline. Each smell is a labelled heuristic, never a hard
    violation. Skip what tooling enforces.
  - **Spec axis** — reads the spec source (task doc + arch spec for features;
    bug doc + repro for bugs). Reports missing/partial requirements, scope
    creep, and requirements implemented wrongly, quoting the spec line for
    each. If no spec, says so rather than inventing requirements.
  - **The fanout guard** — "Do not invoke `/code-review` or spawn additional
    agents — perform this review directly." (mp-skills' known 50+ agent bug.)
  - Link to `smells.md` for the 12-smell baseline.
  - A "Where it fits" note: fired by implement-task at the end of the feature
    and bug paths, before finalize; advisory (surfaces findings, does not
    gate landing or finalize).
- `skills/code-review/smells.md` — the 12 Fowler smells (Mysterious Name,
  Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated
  Switches, Shotgun Surgery, Divergent Change, Speculative Generality,
  Message Chains, Middle Man, Refused Bequest), each as *what it is* →
  *how to fix*, adapted from mp-skills.
- `package.json` — add `"./skills/code-review"` to `pi.skills` (length 7 → 8).
- `tests/skills.test.ts` — add `"skills/code-review/SKILL.md"` to `SKILL_FILES`;
  update the `pi.skills.length` assertion from 7 to 8.

## Acceptance criteria

- The two files exist and are non-empty.
- `SKILL.md` frontmatter has `name: code-review` and a description > 5 chars.
- `SKILL.md` describes the two-axis parallel review, the no-single-winner
  rule, the fanout guard, and the spec-source per task type (feature vs bug).
- `smells.md` lists all 12 smells with what-it-is → how-to-fix.
- `package.json` `pi.skills` contains `"./skills/code-review"` and has
  length 8.
- `tests/skills.test.ts` `SKILL_FILES` includes the code-review skill; the
  length assertion expects 8.
- `npm test -- tests/skills.test.ts` green (89+1 tests; no existing test
  regresses).

## Test plan

- Seams: the test suite is the seam — the structure tests verify the new
  skill file and the updated manifest.
- Failure modes:
  1. Manifest length mismatch → package.json test fails.
  2. SKILL.md missing frontmatter/description → skill structure test fails.
  3. Existing tests regress because `SKILL_FILES` or `pi.skills.length`
     wasn't updated in lockstep.
- Scenarios: `npm test -- tests/skills.test.ts` green with the new skill
  registered and assertions updated; removing either file or reverting the
  manifest/test edits makes it red.
- Edge cases: the `no chain JSON references` and `no supervisor/intercom`
  skill tests must pass for the new SKILL.md.

## Constraints

- Adapt mp-skills content to our pipeline (no `to-spec`; spec source = task
  doc + arch spec for features, bug doc + repro for bugs; review fires at
  implement-task not `/implement`). Do not port verbatim.
- Single source of truth: this slice creates the skill + smells doc; it does
  NOT create the agent, wire implement-task, or touch `get_guidelines`
  (slices 2 and 3).
- The fanout guard text must appear in the SKILL.md.
