---
kind: slice
slug: code-review-agent-and-dispatch
title: Create the code-reviewer fanout agent and wire it into implement-task
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: [code-review-skill-content]
---

# Slice 2: Create the code-reviewer agent + wire it into implement-task

## End-to-end behavior

A `code-reviewer` fanout agent exists and runs the two-axis review (spawns
parallel Standards + Spec reviewers, aggregates side by side). implement-task
dispatches it at the end of the feature and bug paths, before finalize, and
surfaces the findings to the user (advisory).

## Deliverables

### `agents/code-reviewer.md`

- Frontmatter: `name: code-reviewer`, `description` (runs two-axis
  code review…), `tools: read, bash, get_guidelines, subagent`,
  `inheritProjectContext: true`, `defaultContext: fresh`.
- Prompt: you run a two-axis review of the diff between a fixed point and
  HEAD. Consult the `/code-review` skill (passed via `skill:`) for the
  process, the smell baseline, and the fanout guard. Pin the fixed point
  (`git diff <fixed-point>...HEAD`); confirm the ref resolves and the diff
  is non-empty before spawning. Spawn two parallel **read-only** axis
  reviewers:
  - **Standards reviewer** (`read`, `bash`, `get_guidelines`): report
    documented-standard breaches (cite `get_guidelines` source + rule) and
    baseline smells (name + quote the hunk); judgement calls vs hard
    violations; skip what tooling enforces. Under 400 words.
  - **Spec reviewer** (`read`, `bash`): report missing/partial requirements,
    scope creep, requirements implemented wrongly — quote the spec line
    (task doc + arch spec for features; bug doc + repro for bugs) for each.
    Under 400 words. If no spec, say so.
- Aggregate under `## Standards` and `## Spec` headings, verbatim or lightly
  cleaned. Do NOT merge or re-rank. End with a one-line per-axis worst-issue
  summary; no cross-axis winner.
- **Fanout guard** in the prompt: "Do not invoke `/code-review` or spawn
  additional agents beyond the two axis reviewers — perform this review
  directly."
- Include the standard `## Workflow feedback` section (`submit_feedback`).

### `skills/implement-task/resources/feature.md`

- Add a **review step before Step 3** (coherence refactor): after all slices
  landed, dispatch `subagent({ agent: "code-reviewer", skill: "code-review",
  as: "review", output: "review/result.md", task: "Review the whole-task diff
  for task <slug>. Fixed point: main. Spec source: task doc + arch spec.
  Report Standards + Spec findings side by side." })` with `async: true`, and
  `wait({ id })`. Surface the findings to the user (advisory — not a landing
  gate; the slices already landed). Then Step 3 uses the findings to drive
  the coherence refactor.
- Keep all existing agent references (tdd-worker, slice-verifier, land-worker,
  deviation-reporter, task_dependency_levels) and the failure toolbelt
  ("split" before "retry", "parent never implements").

### `skills/implement-task/resources/bug.md`

- Add a **review dispatch after the single chain**, before the report/finalize
  handoff: `subagent({ agent: "code-reviewer", skill: "code-review", ... })`
  with spec source = bug doc + repro. Surface findings to the user (advisory).
- Keep all existing agent references and the failure toolbelt.

### `tests/skills.test.ts`

- Add `"agents/code-reviewer.md"` to `AGENT_FILES`.
- Add xref assertions: `feature.md` references `code-reviewer`; `bug.md`
  references `code-reviewer`.

## Acceptance criteria

- `agents/code-reviewer.md` exists with the required frontmatter (`tools: read,
  bash, get_guidelines, subagent`, `defaultContext: fresh`,
  `inheritProjectContext: true`) and the fanout-aware prompt with the
  no-respawn guard.
- `skills/implement-task/resources/feature.md` has a review dispatch before
  Step 3; `bug.md` has a review dispatch after the single chain.
- `tests/skills.test.ts` `AGENT_FILES` includes code-reviewer; feature.md and
  bug.md xref `code-reviewer`.
- Existing xref tests still pass (feature.md: tdd-worker/slice-verifier/
  land-worker/deviation-reporter/task_dependency_levels; bug.md: tdd-worker/
  slice-verifier/land-worker + red-first rule; both: "split" before "retry"
  + "parent never implements").
- `npm test -- tests/skills.test.ts` green.

## Test plan

- Seams: the agent file and pipeline resources are the seams; the structure/xref
  tests verify the references and frontmatter hold after edits.
- Failure modes:
  1. Dropping a required agent reference while editing feature.md/bug.md →
     xref test fails.
  2. Missing `subagent` in code-reviewer tools → agent frontmatter test fails.
  3. Mis-ordered failure toolbelt → "split before retry" test fails.
- Scenarios: after edits, `npm test -- tests/skills.test.ts` green; reading
  the agent file shows the fanout prompt + guard; reading feature.md shows
  the review dispatch before Step 3.
- Edge cases: `no chain JSON references` / `no supervisor/intercom` tests
  must pass for the edited resources.

## Constraints

- The review is advisory: surfaces findings, does not gate landing or
  finalize. Do not make it a gate.
- The two axis children are read-only; only the aggregator writes the report.
- Do not move refactor into /code-review (Step 3 keeps it).
- Do not add a Spec axis to the deviation-reporter or a Standards axis to
  the slice-verifier.
- The fanout guard must appear in both the agent prompt AND the SKILL.md
  (slice 1 owns the SKILL.md copy).
