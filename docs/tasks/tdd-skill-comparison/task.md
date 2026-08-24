---
kind: task
type: grilling
slug: tdd-skill-comparison
title: Compare mp-skills /tdd with our tdd-worker agent
map: compare-to-mp-skills
status: done
blocked_by:
- adopt-mp-skills-patterns
done: true
---

## Decision to settle

Should we create a standalone /tdd reference skill (like mp-skills') alongside
our existing tdd-worker agent, or is the agent sufficient?

## Context

mp-skills' /tdd is a **reference document** that defines:
- What a good test is (behavior through public interfaces)
- Seams (where tests go)
- Anti-patterns (implementation-coupled, tautological, horizontal slicing)
- Rules of the loop (red before green, one slice at a time, refactoring
  outside the loop)
- References to tests.md and mocking.md for examples and guidelines

Our tdd-worker is a **pipeline agent** that:
- Implements one slice via strict RED→GREEN→REFACTOR
- Commits after each GREEN (checkpoint)
- Writes uncertainty.md and stops when stuck
- Reports divergence from plan
- Has formal tool allowlist and context isolation

These serve different purposes — one is a reference for *what makes good
tests*, the other is an executor of the loop. The question is whether we
benefit from having both: a reference skill that fires when test quality
comes up, plus the agent that runs the loop.

## Decisions reached

### Q1 — Add the /tdd reference skill (settled)

We will add a standalone `/tdd` reference skill, model-invoked, that defines
test quality — what a good test is, where tests go (seams), the anti-patterns
(implementation-coupled, tautological, horizontal slicing), and the rules of
the loop. The tdd-worker agent stays as the executor of the loop; the skill is
the reference the agent (and the slice-verifier / a future code-review) consults
when judging test quality.

**Why:** the tdd-worker encodes the loop *mechanics* (RED→GREEN→REFACTOR,
checkpoint commits, uncertainty hatch, divergence reporting) but says almost
nothing about test *quality*. The slice-verifier runs lint+tests but doesn't
judge whether the tests are good tests vs. tests that merely pass. Nobody in
the pipeline currently owns "is this a test worth keeping?" A reference skill
fills that gap and matches the map's precedent of model-invoked reference
skills (grilling, domain-modeling, codebase-design).

**Rejected alternatives:**
- *Fold test-quality rules into the agent prompts directly.* Bloats prompts,
  not reusable outside the agent, harder to keep consistent across the
  tdd-worker, slice-verifier, and a future code-reviewer all needing the same
  vocabulary.
- *Agent + verifier sufficient.* Leaves test quality unowned — "passes lint and
  tests" ≠ "is a good test."

**Consequences / newly opened questions:**
- Where does seam agreement happen in our pipeline (we have no to-spec)? → Q2
- How does the skill interact with the existing REFACTOR step in tdd-worker? → Q3
- Invocation model and companion-doc scope → Q4

### Q2 — Seam agreement happens in the arch spec (settled)

The `/tdd` skill's "no test at an unconfirmed seam" rule is enforced at the
**arch spec** (Step 1 of the feature path), which is already user-approved. The
spec lists the seams under test; the tdd-worker then writes tests only at those
agreed seams. Slice docs inherit seams from the arch spec.

**Why:** the arch spec is the highest altitude where the whole feature is in
view (same reason mp-skills agrees seams in `/to-spec`), and it already has a
user-approval gate — so the seam conversation rides an existing checkpoint
instead of inventing a new one. Per-slice or runtime agreement would either
fragment the whole-feature view or force a fresh-context subagent to reach the
user through the parent, adding a round-trip per slice and breaking the
autonomous chain.

**Rejected alternatives:**
- *Agree seams in each slice doc's Test plan.* Too local; seams decided one
  slice at a time may not cohere across the feature.
- *Tdd-worker stops and asks at runtime.* A fresh-context subagent can't reach
  the user directly; the implement-task parent would have to relay, adding a
  round-trip per slice and breaking the autonomous chain.

**Consequences:**
- implement-task's feature resource Step 1 (arch spec) must add a **Seams**
  section to the spec template.
- The arch-spec writer (parent) owns listing seams; the user approves them.
- The tdd-worker's prompt gains: "test only at seams listed in the arch spec;
  if you believe a test belongs at an unlisted seam, write uncertainty.md and
  stop."
- Bug tasks (no arch spec) need a lighter seam-agreement point → folded into Q4.

**Newly opened:**
- How does the skill interact with the existing REFACTOR step in tdd-worker? → Q3
- Doc structure (companion docs) for the new skill → Q4
- Seam rule for bug tasks (no arch spec) → Q5

### Q3 — REFACTOR moves to end of implement-task (settled)

The refactor step moves **out of the tdd-worker agent** and into **the end of
implement-task**, run by the parent after all slices have landed (the existing
Step 3 "coherence refactor" phase is the natural home — it already reviews the
combined diff and does small/medium refactors autonomously). The `/tdd` skill
describes the loop as **red → green**; refactoring is a separate stage owned by
implement-task's post-slice coherence pass, not by the per-slice worker.

**Why:** mp-skills dropped refactor from the loop for a real reason — agents
essentially never perform it, and implementation + review work better as
separate stages. But we have no `/code-review` skill yet, so the sibling
task can't be the home. implement-task's Step 3 (coherence refactor) *already*
reviews the combined diff and refactors autonomously; moving the inline
per-slice REFACTOR there concentrates refactoring at the point where the
whole feature is visible, which is where coherent refactoring belongs anyway.
This is the user's steering: don't leave refactor in the void (option b) and
don't leave the skill and agent in documented tension (option c) — relocate
it to a stage that already exists.

**Rejected alternatives:**
- *Keep REFACTOR in tdd-worker, skill describes reality with an open note.*
  Keeps a step the evidence says agents don't do well, at the wrong altitude
  (per-slice, not whole-feature).
- *Drop REFACTOR into the void until code-review lands.* Moves the step into
  nowhere; couples this task to the sibling's outcome.
- *Keep REFACTOR in tdd-worker AND have the skill describe a separate review
  stage as the ideal.* Leaves the skill and agent in documented tension,
  reconciled only later by a task we don't control the timing of.

**Consequences:**
- `agents/tdd-worker.md` Step 3 changes from "RED → GREEN → REFACTOR" to
  "RED → GREEN"; the refactor sub-step is removed. Checkpoint commit still
  fires after each GREEN.
- `skills/implement-task/resources/feature.md` Step 3 (coherence refactor)
  already does refactoring; its description is sharpened to explicitly own
  the refactor that tdd-worker shed. No new stage is invented.
- `skills/implement-task/resources/bug.md` has no coherence-refactor step
  today (single chain, lean). Bug-path refactoring stays light/in-the-worker
  OR a minimal coherence pass is added → addressed in Q5's consequences.
- The `/tdd` skill says: "red → green; refactoring is a separate stage, run
  by implement-task after all slices land, not by the per-slice worker."
- When a `/code-review` skill is adopted later (sibling task
  `code-review-evaluation`), the refactor home may move again; the skill text
  should point to implement-task, not hard-code a skill that doesn't exist.

**Newly opened:**
- Does the bug path need its own (minimal) coherence/refactor stage now that
  the worker no longer refactors inline? → folded into Q5.

### Q4 — Port the companion reference docs (settled)

The `/tdd` skill ships with companion reference docs, matching mp-skills'
structure: `SKILL.md` (the reference — good test, seams, anti-patterns, loop
rules) plus `tests.md` (good/bad test examples) and `mocking.md` (when-to-mock
guidelines). `SKILL.md` stays lean; the examples and mocking heuristics live in
the companions and are linked from the main file.

**Why:** the user prefers reference files nowadays — they keep the main skill
lean and let the examples/guidelines grow independently. This *does* set a
companion-doc precedent in this repo (no existing skill ships companions), but
the map's open fog item on human-facing docs is about *auto-generating* docs
from frontmatter, not about forbidding companion files a skill author writes
by hand. The TDD skill is a reference document, so companion reference files
are on-keel.

**Rejected alternatives:**
- *Fold everything into one SKILL.md.* Goes against the stated preference for
  reference files and would bloat the main skill with examples.
- *Port only mocking.md as a companion, fold test examples in.* Splits the
  two reference bodies inconsistently; tests.md and mocking.md are peers in
  mp-skills and both earn their own file.

**Consequences:**
- New skill dir `skills/tdd/` with `SKILL.md` + `tests.md` + `mocking.md`.
- This is the first skill in this repo with companion reference docs → sets a
  precedent. The map's human-facing-docs fog item stays open but is unaffected
  (it's about auto-generation, not hand-written companions).
- Package manifest `package.json` `pi.skills` gains `"./skills/tdd"`.
- `tests.md` and `mocking.md` content adapted from mp-skills under our voice/
  constraints (no `to-spec` references; seams via arch spec per Q2; loop is
  red→green per Q3).

### Q5 — Bug-path seam rule: the repro is the seam (settled)

For bug tasks (no arch spec), the `/tdd` "no test at an unconfirmed seam" rule
is satisfied by the **repro**: the broken observable behavior the repro
demonstrates is, by definition, at a public interface — that's what makes it a
bug, not an internal refactor — so the seam is implicitly agreed the moment
the repro is accepted. The tdd-worker writes the regression test at that seam.
No new artifact is added to the lean bug path.

**Why:** the bug path is deliberately lean (bug doc + repro + slice doc, no
arch spec). Reintroducing a seam-agreement field would undo that leanness for
no gain — the repro already carries the observable-behavior contract. The
skill records a documented exception: strict seam-agreement for features
(arch spec), repro-as-seam for bugs.

**Rejected alternatives:**
- *Add a minimal Seams line to the bug slice doc's Test plan.* Adds a field to
  the lean path for something the repro already implies.
- *Bug tasks get the same arch-spec-style seam agreement.* Reintroduces the
  weight the bug path was designed to avoid.

**Consequences:**
- `skills/implement-task/resources/bug.md` and the bug slice-doc template need
  no seam-field change.
- The `/tdd` skill states the exception explicitly so it's not read as
  applying its strict form to bugs.
- Q3's consequence — the bug path has no coherence-refactor stage and the
  worker no longer refactors inline — is handled here: bug fixes are typically
  small and the regression test captures the behavior; the bug path keeps its
  lean single chain with **no separate refactor stage**. (If a bug fix turns
  out to need real refactoring, that's a signal it was mis-scoped and should
  have been a feature task.)

### Q6 — Delivery mechanism: pass the skill at dispatch (settled)

The `tdd-worker` (fresh-context subagent) receives the `/tdd` skill via the
`skill:` param on the `subagent({...})` call in implement-task's feature and
bug resources — the same mechanism pi-subagents documents (`skill: "deslop"`
etc.). The `tdd-worker` agent prompt gains one line: "consult the `/tdd`
skill before writing tests; test only at arch-spec seams (or, for bugs, at the
repro's seam)." The skill is injected at dispatch; the agent prompt references
it. Coupling lives at the dispatch site, not in the agent YAML.

**Why:** single source of truth — the skill owns the reference, the agent
prompt stays lean and points to it. This is exactly what the `skill:` param
is designed for, avoids duplicating the reference into `agents/tdd-worker.md`
(which would drift), and keeps the wiring in the one place that already
 dispatches the tdd-worker (implement-task's resources).

**Rejected alternatives:**
- *Bake the rules into `agents/tdd-worker.md`, don't pass the skill.* Two
  sources of truth that drift; the agent duplicates the skill's content.
- *Both — pass the skill AND inline the rules.* Belt-and-suspenders, but
  guarantees drift between two copies.

**Consequences:**
- `skills/implement-task/resources/feature.md` and `bug.md` add
  `skill: "tdd"` to the tdd-worker chain step.
- `agents/tdd-worker.md` gains a one-line instruction to consult `/tdd` and
  test only at agreed seams.
- If a worker ever ignores the injected skill, that's a prompt-strength issue
  to fix then, not a reason to duplicate now.

### Q7 — slice-verifier stays pass/fail; test-quality-in-review waits for the
sibling (settled)

The slice-verifier stays a pass/fail gate (lint + slice tests + full suite).
Test-quality judgment in review is owned by the `code-review-evaluation`
sibling task — not pre-empted here. The `/tdd` skill is consulted at
*authoring* time (Q6 → tdd-worker), which is the right place to prevent bad
tests; *judging* tests post-hoc is a review act, and the reviewer doesn't
exist yet.

**Why:** a pass/fail gate is the wrong instrument for nuanced quality calls —
false positives would block slices. Review is the sibling task's domain;
adding quality judgment to the verifier now would pre-empt a decision that
task is meant to make. If the sibling later decides code-review lives in the
verifier, it can extend the verifier then.

**Rejected alternatives:**
- *Verifier gets `skill: "tdd"` and adds an advisory anti-pattern scan.*
  Pre-empts the code-review sibling; advisory findings from a pass/fail gate
  are an awkward fit.
- *Verifier gates on test quality (anti-pattern test blocks landing).* Strongest
  enforcement but wrong instrument; false positives block slices.

**Consequences:**
- `agents/slice-verifier.md` unchanged.
- The `code-review-evaluation` sibling task inherits the open question of
  where test-quality review lives (verifier extension vs. separate reviewer).
- `/tdd`'s description/scope should not claim it is consulted by the verifier
  today; it's consulted by the tdd-worker now, and by a reviewer later.

## Completion evidence

The task's design tree is fully visited. The decision, in the user's terms:

- **Decision:** Add a standalone, model-invoked `/tdd` reference skill defining
  test quality (what a good test is, seams, anti-patterns, loop rules) with
  companion reference docs (`tests.md`, `mocking.md`), alongside the existing
  `tdd-worker` agent. The agent keeps the loop mechanics but its loop narrows
  to RED→GREEN; the refactor step moves to the end of implement-task (the
  existing Step 3 coherence-refactor pass). Seams are agreed in the arch spec
  (features) or the repro (bugs). The skill is passed to the tdd-worker at
  dispatch via `skill: "tdd"`; the slice-verifier stays pass/fail and
  test-quality-in-review is deferred to the `code-review-evaluation` sibling.

- **Important alternatives considered:**
  - Fold test-quality rules into agent prompts (rejected: bloats, not reusable,
    drifts across tdd-worker / slice-verifier / future reviewer).
  - Agree seams in slice docs or at runtime in the worker (rejected: loses
    whole-feature view / forces parent-relay round-trips).
  - Drop REFACTOR into the void until code-review lands (rejected: no home);
    keep it inline in the worker (rejected: wrong altitude, agents don't do it
    well); leave skill/agent in documented tension (rejected: dishonest).
  - Single-file `SKILL.md` (rejected: against stated reference-file
    preference).
  - Verifier as test-quality gate or advisory scanner (rejected: wrong
    instrument, pre-empts the sibling).

- **Constraints and rationale:**
  - Must work in the Pi harness (no Claude Code plugin); the `skill:` subagent
    param is the Pi-native way to inject a reference into a fresh-context child.
  - The existing task graph, frontier, and dependency-level machinery are
    load-bearing — `/tdd` composes with them, doesn't replace them.
  - The parent-never-implements discipline holds: refactoring moves to the
    implement-task parent's coherence pass (already a parent-owned stage), not
    into a worker.
  - Bug path stays lean — no arch spec, no new seam field, no separate refactor
    stage.

- **Dependent-task implications:**
  - `code-review-evaluation` (sibling): inherits the open question of where
    test-quality review lives, and the `/tdd` skill as its reference when it
    builds a reviewer. The refactor home may move from implement-task to a
    `/code-review` skill depending on that sibling's outcome.
  - A new implementation task is created to build the `/tdd` skill + wire it
    (see Newly created work below).

- **Remaining fog / newly discovered work:**
  - Build task: create `skills/tdd/{SKILL.md, tests.md, mocking.md}`, add to
    `package.json` `pi.skills`, pass `skill: "tdd"` in feature.md + bug.md
    tdd-worker steps, add the one-line consult instruction to
    `agents/tdd-worker.md`, drop the inline REFACTOR from `tdd-worker.md` Step 3,
    and sharpen implement-task feature.md Step 3 to own the refactor. This is
    precise enough to state as a `type: feature` task → raised with Wayfinder.
  - Map fog (human-facing docs auto-generation) is unaffected by Q4's
    companion-doc precedent.

## Newly created work

The decision is precise enough to state as an implementation task. Raise it
with Wayfinder rather than implementing from the grilling task:

- **Proposed task:** `build-tdd-reference-skill` (`type: feature`) — create
  the `/tdd` skill (3 docs), add to the package manifest, wire it into
  implement-task's feature + bug resources via `skill: "tdd"`, narrow the
  tdd-worker loop to RED→GREEN, and sharpen implement-task feature.md Step 3
  to own the refactor step. Seams-section addition to the arch-spec template
  is part of this task. Verify against the existing `tests/skills.test.ts`.

## Recommended starting answer

Keep the tdd-worker agent as-is for execution. Add a lightweight /tdd
reference skill (model-invoked) that defines test quality principles,
seams, and anti-patterns — so the agent autonomously consults it during
both TDD execution and code review.
