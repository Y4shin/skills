---
kind: slice
slug: scaffold-and-register
title: Scaffold skill-creator, design the trigger description, and register it in the package + tests
task: ../task.md
mode: afk
status: done
size: s
blocked_by: []
---

# Slice 1: Scaffold + frontmatter + trigger description + register

## End-to-end behavior

`skills/skill-creator/` exists with `SKILL.md` (spec-pure `name:
skill-creator` + a trigger-designed `description` ≤1024), an empty
`scripts/` and `references/` placeholder, a first-pass `SKILL.md` core-workflow
outline + capability-ceiling rule stub, and a documented set of trigger-test
seeds (≥3 should-trigger + ≥2 near-miss requests). `skill-creator` is
registered in `package.json` `pi.skills` (length 15 → 16) and
`tests/skills.test.ts` (`SKILL_FILES` + length assertion). After this slice,
`/skill:skill-creator` is invokable, `npm test` is green, and the structure
tests pass for the new skill.

## Deliverables

- `skills/skill-creator/SKILL.md` — frontmatter:
  - `name: skill-creator`
  - `description:` (≤1024) enumerating literal trigger phrases for every
    major capability — create/make/build/scaffold a skill; turn a workflow into
    a skill; improve/refactor/fix a non-triggering skill or its `SKILL.md`;
    review a skill for unnecessary context usage; decide new-vs-existing
    skill; make a Claude/harness-specific skill portable — plus a "Do NOT use
    for …" line (adjacent doc-writing or generic coding that isn't skill
    authoring).
  - **Only** `name` + `description` — no `disable-model-invocation`,
    `license`, `metadata`, or any other field.
  - Body: a first-pass core-workflow outline (the 8-phase skeleton with phase
    names and one line each) + a **capability-ceiling** stub ("default: author
    a generic skill assuming only that the agent can read this body and
    optionally call MCP; conditional rules below activate when the target's
    capabilities are known"). Detailed body is slice 3; this slice ships the
    skeleton so the skill is loadable and the description is testable.
- `skills/skill-creator/scripts/` and `skills/skill-creator/references/` —
  created empty (no placeholder files; the spec forbids extraneous docs, and
  empty dirs are fine because later slices populate them).
- A `trigger-test seeds` block in the `SKILL.md` self-review section OR a
  scratch note in the slice doc: 3 should-trigger requests ("create a skill for
  reviewing Go API changes", "turn this deploy runbook into a skill", "this
  skill isn't triggering reliably — fix it") and 2 near-misses ("write a
  README for my project", "explain how PDFs work"). These seeds are *executed*
  in slice 6; this slice designs and records them.
- `package.json` — add `"./skills/skill-creator"` to `pi.skills` (now length
  16).
- `tests/skills.test.ts` — add `"skills/skill-creator/SKILL.md"` to
  `SKILL_FILES`; change `expect(pkg.pi.skills.length).toBe(15)` → `16`.

## Acceptance criteria

- `skills/skill-creator/SKILL.md` exists; its frontmatter parses to exactly
  `{ name: "skill-creator", description: <string> }` (no other keys).
- `description` is 1–1024 chars, no angle brackets, and contains literal
  phrases for ≥6 of the capabilities listed in the task scope + a "Do NOT use
  for" clause.
- The folder name (`skill-creator`) equals the `name` field.
- `package.json` `pi.skills` contains `"./skills/skill-creator"` and has
  length 16; `tests/skills.test.ts` `SKILL_FILES` includes the new file and
  asserts length 16.
- `npm test` is green; the new skill passes the structure tests (name +
  description >5 + no `.chain.json` + no `subagent_supervisor`); no existing
  test regresses.
- Trigger-test seeds (≥3 + ≥2) are recorded in this slice doc.

## Test plan

- **Seams:** the test suite is the seam — `tests/skills.test.ts` structure
  tests + manifest assertions verify the new skill and the updated manifest.
- **Failure modes:** (1) manifest length mismatch if `package.json` or the
  assertion isn't updated in lockstep → manifest test fails; (2) a stray
  non-spec frontmatter field sneaks in → later `validate_skill` (slice 2)
  catches it, but the slice-1 hand-check must already pass; (3) `description`
  over 1024 → slice-6 validator fails; keep it tight now.
- **Scenarios:** `npm test` green with the skill registered and assertions
  bumped; `cat skills/skill-creator/SKILL.md | head` shows only `name` +
  `description` in frontmatter; reverting `package.json`/assertions makes
  `npm test` red.
- **Edge cases:** the description must still read naturally (not a keyword
  dump) — the optimizing-descriptions guide warns against bloat; aim a few
  concise sentences. The folder name must exactly equal `name`.

## Constraints

- Spec-pure frontmatter only — no Pi-only `disable-model-invocation` (it is
  not in the spec and fails validators, and a skill-creator should auto-trigger
  anyway).
- No `README.md`/`CHANGELOG.md`/install guides in the skill (spec + task
  forbid them).
- Do not write the full body or any references/scripts here — later slices
  own them. This slice ships a *loadable, registered, trigger-designed*
  skeleton.
- Single source of truth: do not duplicate the spec digest here; link it
  (placeholder ok until slice 4).

## Trigger-test seeds

Should-trigger (≥3, slice 6 executes these against the final description):
1. "create a skill for reviewing Go API changes"
2. "turn this deploy runbook into a skill"
3. "this skill isn't triggering reliably — fix it"

Near-miss (≥2, should NOT trigger):
1. "write a README for my project"
2. "explain how PDFs work"
