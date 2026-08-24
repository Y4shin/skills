---
kind: task
type: feature
slug: build-code-review-skill
title: Build the /code-review skill, code-reviewer agent, and get_guidelines extension
map: compare-to-mp-skills
status: done
blocked_by:
- code-review-evaluation
slices:
- code-review-skill-content
- code-review-agent-and-dispatch
- get-guidelines-standards-extension
- get-guidelines-standards-extension
---

## Decision being implemented

From the settled grilling task `code-review-evaluation`: build a model-invoked
`/code-review` skill (two-axis: Standards + Spec) based on mp-skills', invoked
as a `code-reviewer` fanout agent that implement-task dispatches with
`skill: "code-review"` and parent context intact, the agent reporting back.
Extend our `get_guidelines` tool to discover a repo-local override file and
surface the 12-smell Fowler baseline as the floor. Wire the review into
implement-task's feature and bug resources.

## User-visible outcome

A `/code-review` skill exists and is registered; a `code-reviewer` fanout agent
runs the two-axis review (parallel Standards + Spec reviewers, aggregated side
by side); `get_guidelines` discovers repo standards files and surfaces the
smell baseline when no repo standards are found; implement-task runs the
review at the end of its feature and bug paths before finalize.

## Scope

In scope:
- `skills/code-review/SKILL.md` — model-invoked skill; two-axis process
  (Standards + Spec), parallel sub-agent design, the 12-smell Fowler baseline
  (each smell: what it is → how to fix), "repo overrides / judgement call /
  skip what tooling enforces" rules, the no-single-winner aggregation rule, the
  "do not re-invoke /code-review or spawn additional agents" guard.
- `skills/code-review/smells.md` — the 12-smell baseline as a companion
  reference (linked from SKILL.md), so the Standards axis children have it
  without external fetch.
- `agents/code-reviewer.md` — fanout agent (`tools: read, bash, get_guidelines,
  subagent`; `defaultContext: fresh`; `inheritProjectContext: true`); prompt
  spawns two read-only parallel axis reviewers (Standards, Spec) in fresh
  context, aggregates side by side, never merged; carries the fanout-bug guard.
- `src/pi.ts` — extend `discoverGuidelines` to also discover
  `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/standards.md` as standards sources;
  extend `get_guidelines` to surface the 12-smell baseline as the floor when no
  repo standards are found for the requested language/topic; `list_guidelines`
  reports the baseline as a source when in effect. Keep existing tdd-worker
  usage working (no regression).
- `skills/implement-task/resources/feature.md` — add a review dispatch step
  before Step 3 (coherence refactor): `subagent({ agent: "code-reviewer",
  skill: "code-review", ... })` over the whole task diff, spec source = task
  doc + arch spec; surface findings to the user (advisory); then Step 3 uses
  the findings to drive refactor.
- `skills/implement-task/resources/bug.md` — add a review dispatch after the
  single chain, before the report/finalize handoff: spec source = bug doc +
  repro; surface findings to the user (advisory).
- `package.json` `pi.skills` gains `"./skills/code-review"` (length 7 → 8).
- `tests/skills.test.ts` — add `skills/code-review/SKILL.md` to `SKILL_FILES`;
  update `pi.skills.length` assertion 7 → 8; add an `AGENT_FILES` entry for
  `code-reviewer.md`; add xref assertions (implement-task feature + bug
  resources reference `code-reviewer`; code-review SKILL.md contains the
  two-axis / smell-baseline / no-single-winner content).
- Tests for the `get_guidelines` extension: repo override discovery + smell
  baseline floor (unit tests in `tests/`).

Out of scope:
- Moving the refactor home out of implement-task Step 3 (it stays; /code-review
  feeds it findings — Q2).
- Test-quality judgment in the slice-verifier (stays pass/fail — TDD task Q7).
- Auto-generation of human-facing docs (map fog).
- A `/improve-codebase-architecture` skill (sibling task
  `improve-architecture-evaluation`).

## Acceptance criteria

- `skills/code-review/{SKILL.md,smells.md}` exist and are non-empty.
- `agents/code-reviewer.md` exists with `tools: read, bash, get_guidelines,
  subagent`, `defaultContext: fresh`, `inheritProjectContext: true`, and a
  fanout-aware prompt with the no-respawn guard.
- `src/pi.ts` `discoverGuidelines` discovers `AGENTS.md`/`CLAUDE.md`/
  `CONTEXT.md`/`docs/standards.md`; `get_guidelines` returns the smell baseline
  when no repo standards match; `list_guidelines` reports the baseline when in
  effect; existing `tests/skills.test.ts` assertions and a new extension test
  pass.
- `skills/implement-task/resources/feature.md` has a review dispatch before
  Step 3; `bug.md` has a review dispatch after the single chain.
- `package.json` `pi.skills` contains `"./skills/code-review"` (length 8).
- `tests/skills.test.ts` green: `SKILL_FILES` includes code-review;
  `pi.skills.length` is 8; `AGENT_FILES` includes code-reviewer; feature.md
  and bug.md reference `code-reviewer`.
- Existing xref tests still pass (feature.md references tdd-worker/
  slice-verifier/land-worker/deviation-reporter/task_dependency_levels; bug.md
  references tdd-worker/slice-verifier/land-worker + red-first rule; both keep
  "split" before "retry" + "parent never implements").
- Full test suite green (modulo the 16 pre-existing session.test.ts failures
  that reproduce on main).

## Existing abstractions to use

- The `skill:` subagent param (pi-subagents SKILL.md) — inject the reference
  into the dispatched code-reviewer.
- The fanout-agent pattern (`tools: subagent` on a child) — pi-subagents
  documents this as the explicit exception for children that must spawn
  subagents.
- The existing `get_guidelines`/`list_guidelines`/`discoverGuidelines` in
  `src/pi.ts` — extend in place; do not invent a parallel discovery path.
- The existing `agents/*.md` frontmatter conventions (structure tests assert
  `inheritProjectContext: true`, `defaultContext`, `tools`, `description`).
- mp-skills' `/code-review` SKILL.md + docs as the source to adapt from (not
  port verbatim — no `to-spec`; our spec source is task doc + arch spec for
  features, bug doc + repro for bugs).

## Do NOT reimplement

- Do not port mp-skills verbatim. Adapt to our pipeline (spec source differs
  per task type; review fires at implement-task not `/implement`; no
  `docs/agents/issue-tracker.md`).
- Do not move refactor into /code-review (stays at implement-task Step 3).
- Do not add a Spec axis to the deviation-reporter or a Standards axis to the
  slice-verifier (this skill owns review; they keep their jobs).
- Do not invent a parallel standards-discovery path; extend `get_guidelines`.

## Architecture notes

- Slice 1 (skill content + smells + manifest + structure tests) has no deps.
  Slice 2 (code-reviewer agent + implement-task wiring) is blocked_by slice 1
  (wires the skill slice 1 created). Slice 3 (get_guidelines extension) is
  blocked_by slice 1 (the baseline content lives in the skill; the extension
  references/contains it). Slices 2 and 3 could run in parallel after slice 1,
  but since both edit `tests/skills.test.ts` and share the repo cwd, they run
  sequentially within the level.
- The `code-reviewer` fanout guard ("do not re-invoke /code-review or spawn
  additional agents — perform this review directly") must appear in BOTH the
  agent prompt AND the SKILL.md (mp-skills' known 50+ agent bug).
- The Standards axis children are read-only (`read`, `bash`,
  `get_guidelines`); the Spec axis children are read-only (`read`, `bash`);
  only the aggregator (the `code-reviewer` agent itself) writes the report.
- The review is advisory: it surfaces findings to the user; it does not gate
  landing (the slice already landed) and does not gate finalize (the CI gate
  does).

## Implementation notes

### Slice 1 — code-review-skill-content (done)

- Landed on `task/build-code-review-skill` via `--no-ff` merge of
  `slice/code-review-skill-content` (no conflicts; independent slice with no
  deps).
- Created `skills/code-review/SKILL.md` (two-axis Standards + Spec parallel
  review, no-single-winner aggregation, fanout guard, spec-source per task
  type, advisory "Where it fits" note) and `skills/code-review/smells.md`
  (12 Fowler smells, what-it-is → how-to-fix).
- Registered the skill in `package.json` (`pi.skills` length 7 → 8) and
  updated `tests/skills.test.ts` (`SKILL_FILES` entry + `pi.skills.length`
  7 → 8).
- Slice-verifier confirmed 93/93 `tests/skills.test.ts` green (was 89 on
  main, +4 for the new skill), `npm run typecheck` clean, full suite green
  except 16 pre-existing `session.test.ts` failures that reproduce on main
  (AuthStorage API drift, not a regression). No divergence from plan; no
  agent files, implement-task wiring, or `get_guidelines` code touched
  (owned by slices 2 and 3).

### Slice 2 — code-review-agent-and-dispatch (done)

- Landed on `task/build-code-review-skill` via `--no-ff` merge of
  `slice/code-review-agent-and-dispatch` (no conflicts; only slice 1 had
  landed on the task branch, and slice 2 was blocked_by slice 1).
- Created `agents/code-reviewer.md` (fanout agent: `tools: read, bash,
  get_guidelines, subagent`, `defaultContext: fresh`,
  `inheritProjectContext: true`; prompt spawns two read-only parallel axis
  reviewers (Standards + Spec), aggregates side by side under `## Standards`
  and `## Spec` headings with per-axis worst-issue summaries, carries the
  fanout guard, includes the `## Workflow feedback` section).
- Added review dispatch to `skills/implement-task/resources/feature.md`
  (before Step 3 / coherence refactor: `subagent({ agent: "code-reviewer",
  skill: "code-review", ... })` with `async: true` + `wait({ id })`, advisory)
  and to `skills/implement-task/resources/bug.md` (after the single chain,
  before the report/finalize handoff, advisory).
- Updated `tests/skills.test.ts`: added `agents/code-reviewer.md` to
  `AGENT_FILES` and xref assertions (`feature.md` and `bug.md` reference
  `code-reviewer`).
- Slice-verifier confirmed 100/100 `tests/skills.test.ts` green (was 93 on
  slice 1, +7 for the new agent + xrefs), `npm run typecheck` clean, full
  suite green except 16 pre-existing `session.test.ts` failures that
  reproduce on main (not a regression). No divergence from plan; no
  `get_guidelines` code touched (owned by slice 3). Slice 3 remains.

### Slice 3 — get-guidelines-standards-extension (done)

- Landed on `task/build-code-review-skill` via `--no-ff` merge of
  `slice/get-guidelines-standards-extension` (no conflicts; slices 1 and 2
  had landed, and slice 3 was blocked_by slice 1).
- Extended `src/pi.ts`: `discoverGuidelines` now also discovers repo-root
  `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md` and `docs/standards.md` as standards
  sources (topic `"standards"`), in addition to the existing
  `docs/*-guidelines.md`/`*-conventions.md`/`*-practices.md`/`testing.md`
  family. `get_guidelines` returns the 12-smell Fowler baseline as a floor
  (clearly labelled) when no repo standards match a request; it does NOT
  append the baseline when repo standards match (repo overrides).
  `list_guidelines` reports the baseline as a source when the cache is empty
  (i.e. it would be served as the floor). Added a `GuidelineEntry` type with
  a `source` field (`"docs"` | `"root"`) and a `guidelineDisplayPath`
  helper so root files display as `AGENTS.md` rather than `docs/AGENTS.md`.
  The `SMELL_BASELINE` constant is inlined in `src/pi.ts` with a sync note
  pointing at `skills/code-review/smells.md` as the single source of truth.
- Added `tests/guidelines.test.ts` (5 tests, stub-API + tmp-dir fixture
  pattern): repo-override discovery, baseline floor on no-match, repo
  overrides suppress the baseline, `list_guidelines` reports the baseline
  when in effect, and existing `docs/typescript-guidelines.md` regression.
- Slice-verifier confirmed `npm run typecheck` clean,
  `tests/guidelines.test.ts` 5/5, `tests/skills.test.ts` 100/100, full
  suite green except 16 pre-existing `session.test.ts` failures that
  reproduce on main (not a regression). No divergence from plan.
- This was the last slice; the task is ready for finalize-task.

## Architecture lessons (knowledge harvest)

- **Review is advisory, not a gate.** `/code-review` surfaces findings to the
  user; it does not gate landing (slices already landed) or finalize (the CI
  gate does). This keeps the review honest (it can flag without blocking) and
  preserves the parent-never-implements discipline.
- **Fanout agent pattern.** The `code-reviewer` is the first agent in this
  repo with `tools: subagent` — a fanout child that spawns its own parallel
  axis reviewers. The fanout is an implementation detail of the agent; the
  pipeline dispatches one agent and gets one report (honoring the `/tdd`
  "invoke as one agent" precedent). The mp-skills 50+ agent bug is guarded
  against in both the SKILL.md and the agent prompt.
- **Single source of truth for smells — accepted duplication.** The 12-smell
  baseline is canonical in `skills/code-review/smells.md` and inlined as a
  `SMELL_BASELINE` constant in `src/pi.ts` (the extension can't read the
  skill file at runtime). The duplication is noted in a comment; the two
  must be kept in sync by hand. A future refactor could load the skill file
  at runtime, but that coupling is not worth it now.
- **`get_guidelines` is the Pi-native standards source.** Extending our own
  tool (rather than inventing a parallel discovery path) made repo-standards
  + the smell-baseline floor available to *every* agent calling
  `get_guidelines`, not just the reviewer. The `source: "docs"|"root"` field
  keeps display paths correct for both `docs/*` files and repo-root
  `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`.
- **Two review altitudes coexist.** The deviation-reporter (per-slice,
  gates landing, forked context, slice doc as spec) and `/code-review`
  (whole-task, end-of-task, fresh context, task doc + arch spec as spec)
  do different jobs at different altitudes. Keep both.
- **Refactor home stays at implement-task Step 3.** `/code-review` feeds
  findings to Step 3; it does not own refactor — resolving the TDD task's
  refactor-home handoff. A future `/code-review`-owns-refactor move would
  be a sibling-task decision, not this one.
