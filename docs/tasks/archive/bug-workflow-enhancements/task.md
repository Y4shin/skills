---
kind: task
type: grilling
slug: bug-workflow-enhancements
title: Evaluate mp-skills /diagnosing-bugs and /triage against our report-bug
map: compare-to-mp-skills
status: done
blocked_by:
- adopt-mp-skills-patterns
---

## Decision to settle

Should we adopt patterns from mp-skills' /diagnosing-bugs (structured 6-phase
debugging loop) and /triage (issue state machine) into our bug workflow?

## Context

Our /skill:report-bug handles intake (capture → reproduce → triage). Trivial
bugs are fixed directly. Non-trivial bugs are promoted to `type: bug` tasks
run through the bug pipeline (tdd-worker → verify → land).

mp-skills has two separate skills for what our report-bug covers:

**/diagnosing-bugs** — a 6-phase discipline for hard bugs:
1. Build a tight feedback loop (the core — refuses to proceed without one)
2. Reproduce + minimise
3. Hypothesise 3-5 falsifiable ranked
4. Instrument
5. Fix + regression test
6. Cleanup + post-mortem (handoff to architecture improvement)

**/triage** — a state machine for incoming issues:
- Category roles: bug, enhancement
- State roles: needs-triage, needs-info, ready-for-agent, ready-for-human,
  wontfix
- Handles external PRs as "issues with attached code"
- Produces agent briefs for ready-for-agent items

## Recommended starting answer

Adopt /diagnosing-bugs' structured loop as a model-invoked skill — our current
report-bug promotes hard bugs directly without a dedicated debugging phase,
which loses the tight-feedback-loop discipline. Defer /triage for now (it's
designed for an external issue tracker, which our workflow doesn't use).

## Decisions reached

### Q1 — Adopt /diagnosing-bugs as a model-invoked skill passed to the
tdd-worker (settled)

Adopt mp-skills' 6-phase debugging discipline as a model-invoked
`/diagnosing-bugs` skill, delivered to the tdd-worker via `skill:
"diagnosing-bugs"` when a bug task runs — mirroring the `/tdd` and
`/code-review` delivery pattern. The tdd-worker already runs the bug
pipeline's single chain; the skill gives it the feedback-loop-building /
hypothesis / instrumentation discipline it lacks. `report-bug` intake stays
unchanged.

**Why:** our bug pipeline promotes hard bugs to a `type: bug` task whose
tdd-worker does RED→GREEN but has no feedback-loop/hypothesis/instrumentation
discipline — mp-skills' Phase 1 ("build a tight red-capable loop — this is the
skill") is exactly the discipline that prevents jumping straight to a
hypothesis. Delivering via `skill:` (like `/tdd`/`/code-review`) keeps the
pipeline lean and puts the discipline where the fixing happens.

**Rejected alternatives:**
- *Separate skill invoked manually before promotion.* Adds a manual step;
  the tdd-worker still has no discipline when it runs.
- *Don't adopt — tdd-worker + repro is sufficient.* The RED-first regression
  test rule is not enough for hard bugs; it lacks the loop-building and
  hypothesis discipline.

**Consequences / newly opened questions:**
- `skills/implement-task/resources/bug.md` adds `skill: "diagnosing-bugs"` to
  the tdd-worker dispatch (alongside the existing `skill: "tdd"`).
- How does the skill know a bug is "hard" (fire on all non-trivial bugs, or a
  subset)? → Q4
- Are the 6 phases mandatory or skippable for the tdd-worker? → Q5
- Phase 6 handoff to architecture → Q3

### Q2 — /triage: defer the skill; if triage is needed, build it as a tool,
not a skill (settled)

Defer mp-skills' `/triage` **skill** — it's designed for an external issue
tracker we don't use, and triage is mechanical (query `docs/bugs/*.md` by
`status`, group into buckets, transition status), not model reasoning. **If
triage is needed at all, it should be a tool (or script), not a skill.** Our
existing `task_list` tool scans `docs/tasks/` but not `docs/bugs/`; a triage
capability would be a new `bug_list`/`bug_queue` tool in `src/pi.ts` (or extend
the `task_*` family to bugs), returning bugs grouped by status — not a
model-invoked skill.

**Why:** the user's framing — "if that triaging is truly required to be a
skill and cannot be a script or tool, in which case it should become a script
or tool" — is correct: triage is mechanical frontmatter filtering, not
judgment. A skill (model-invoked prose that guides reasoning) is the wrong
shape; a tool (deterministic, parse-frontmatter-and-group) is the right one.
The task's own recommended answer deferred /triage for the external-tracker
reason; the tool framing is the stronger reason.

**Rejected alternatives:**
- *Adapt /triage as a skill querying our in-git bug docs.* Wrong shape
  (mechanical work in a skill); `grep -l "status: reported" docs/bugs/*.md`
  already does this (documented in `task-overview`).
- *Adopt /triage for external PRs only.* We're not a PR-driven repo; no
  `docs/agents/issue-tracker.md`.

**Consequences:**
- No `/triage` skill. The deferral is recorded.
- If a triage capability is wanted later, raise a `bug_list`/`bug_queue` tool
  task (extend `src/pi.ts`), NOT a skill. Noted as downstream fog — low
  priority since `grep` + `task-overview` cover the common query.
- `report-bug`'s bug-doc `status` field (`reported → confirmed → fixed |
  wontfix | promoted`) remains the in-git state machine; no external-tracker
  roles.

### Q3 — Phase 6 flags "no correct seam" findings for
/improve-codebase-architecture (settled)

When the tdd-worker (running the diagnosing skill) finds no correct seam for a
regression test — the codebase architecture prevents locking the bug down — it
records the finding in its divergence/uncertainty output, which surfaces to
the parent → the user or wayfinder can create an architecture-deepening task
(or the user runs `/improve-codebase-architecture` directly). The diagnosing
skill **flags**; it does not auto-spawn an architecture task.

**Why:** the "no correct seam" finding is exactly what
`/improve-codebase-architecture` exists to find (a missing seam = a deepening
opportunity). Connecting the two skills (both now decided) without coupling a
bug fix to an automatic architecture task — the user/wayfinder decides
whether the finding warrants a deepening task.

**Rejected alternatives:**
- *Phase 6 just documents the missing seam; no handoff.* Loses the
  connection mp-skills designed.
- *Auto-create an architecture task from the finding.* A bug fix shouldn't
  auto-spawn architecture tasks without user judgment.

**Consequences:**
- `/diagnosing-bugs` Phase 6 prose tells the tdd-worker to record missing-
  seam findings in `## Divergence from plan` / `uncertainty.md`, surfaced to
  the parent → wayfinder or `/improve-codebase-architecture`.
- Connects to the `improve-architecture-evaluation` decision (now done) without
  coupling — the architecture skill is blocked-by-prereqs; the diagnosing
  skill doesn't depend on it existing.

### Q4 — Fire `skill: "diagnosing-bugs"` on every type: bug task (settled)

The diagnosing skill is passed to the tdd-worker on **every `type: bug` task**
(no dispatch-time "is this bug hard enough" judgment). The trivial/hard split
already happened upstream — `report-bug` spot-fixes trivial bugs directly;
everything promoted to a `type: bug` task is non-trivial by definition.

**Why:** wiring the skill on every bug task is simplest; severity is a capture-
time guess that doesn't predict debug difficulty (a "minor" bug can be a hard
intermittent debug); and Q5's justified-skip means a genuinely simple promoted
bug moves quickly without ceremony. No dispatch-time judgment the tdd-worker
can't make.

**Rejected alternatives:**
- *Fire only on severity critical|major.* Severity is a capture-time guess;
  a minor bug can be a hard debug.
- *Fire only when the first RED attempt fails.* The worker already stopped by
  then; the skill should guide before the failed attempt.

**Consequences:**
- `skills/implement-task/resources/bug.md` passes `skill: "diagnosing-bugs"`
  on every bug-task tdd-worker dispatch (alongside `skill: "tdd"`).
- feature.md's dispatch omits it (feature tasks don't get the diagnosing
  skill).

### Q5 — 6 phases skippable with recorded justification; Phase 1
non-skippable (settled)

Match mp-skills' rule: each skip must be explicitly justified in the worker's
output (e.g. "Phase 2 minimisation skipped — repro is already minimal: one
function call"). **Phase 1 (build a red-capable loop) is the only non-skippable
phase** — it's the core that prevents jumping straight to a hypothesis. The
fallback for a budget-exhausted worker is the existing uncertainty escape
hatch (write `uncertainty.md` and stop).

**Why:** preserves the discipline's main value (Phase 1) while letting a
genuinely simple promoted bug move quickly — without the strict mandate that
could exhaust the tdd-worker's turn/timeout budget on ceremony for a
conservatively-promoted one-liner.

**Rejected alternatives:**
- *All 6 phases mandatory, no skips.* A conservatively-promoted one-liner
  could burn the budget on ceremony; the worker might time out before the
  fix.
- *Only Phase 1 + Phase 5 mandatory; 2/3/4/6 skippable.* Loses the hypothesis-
  ranking (Phase 3) and instrumentation (Phase 4) discipline that
  distinguishes debugging from guessing.

**Consequences:**
- `/diagnosing-bugs` SKILL.md states the skip rule: every skip needs a
  one-line recorded reason; Phase 1 is non-skippable.
- The tdd-worker's `## Notable events` / `## Divergence from plan` sections
  carry the skip justifications.

### Q6 — How the tdd-worker knows it's on a bug (settled)

The tdd-worker is a fresh-context agent with one shared prompt for both paths.
It must know it's on a `type: bug` task to consult `/diagnosing-bugs`. The
signal is **explicit in the dispatch**, not inferred from prompt content:

1. `skills/implement-task/resources/bug.md`'s tdd-worker dispatch passes both
   `skill: "tdd"` AND `skill: "diagnosing-bugs"` (the skill's *presence* is the
   primary signal — feature.md does not pass it).
2. `bug.md`'s dispatch `task:` prompt includes an explicit instruction line:
   "You are on a `type: bug` task; consult the `/diagnosing-bugs` skill for
   the 6-phase debugging discipline (Phase 1 non-skippable; others skippable
   with a recorded reason)."
3. The `agents/tdd-worker.md` prompt stays **path-agnostic**: it says "If the
   dispatch passes `/diagnosing-bugs`, you are on a bug task — follow it for
   the 6-phase discipline." (It does not hard-code bug-only behavior.)

**Why:** the skill's *presence* (passed only on bug dispatch) plus an explicit
instruction line is the cleanest signal — no frontmatter sniffing, no
ambiguous inference from prompt wording. The agent prompt stays path-
agnostic (feature tasks never see the diagnosing skill), so a single agent
file serves both paths. This mirrors how `skill: "tdd"` is already delivered
(both paths pass it; only bug.md adds `diagnosing-bugs`).

**Rejected alternatives:**
- *Infer "bug" from the prompt content ("for bug task"/bug doc refs).* Works
  but fragile — prompt wording can drift; an explicit instruction + skill
  presence is unambiguous.
- *Two separate agent files (tdd-worker + bug-tdd-worker).* Diverges from the
  shared-agent design; the skill's presence already signals the path.
- *tdd-worker reads the task doc's `type:` frontmatter.* The fresh-context
  worker would need an extra read step; the dispatch already knows the path.

**Consequences:**
- `skills/implement-task/resources/bug.md` adds `skill: "diagnosing-bugs"`
  and the explicit "You are on a type: bug task" instruction line.
- `agents/tdd-worker.md` gains a path-agnostic line: "If the dispatch passes
  `/diagnosing-bugs`, you are on a bug task — follow it for the 6-phase
  discipline."
- feature.md unchanged (does not pass `diagnosing-bugs`).

## Completion evidence

The task's design tree is fully visited (Q1–Q6). The decision, in the user's
terms:

- **Decision:** Adopt mp-skills' 6-phase debugging discipline as a model-
  invoked `/diagnosing-bugs` skill, passed to the tdd-worker on every `type:
  bug` task (via `skill: "diagnosing-bugs"` in bug.md's dispatch + an explicit
  "You are on a type: bug task" instruction line). The agent prompt stays
  path-agnostic ("if `/diagnosing-bugs` is passed, you're on a bug task").
  Phases skippable with a recorded justification; Phase 1 (build a red-capable
  loop) non-skippable. Phase 6 flags "no correct seam" findings for wayfinder /
  `/improve-codebase-architecture` (does not auto-spawn). **Defer** mp-skills'
  `/triage` skill — triage is mechanical (frontmatter filtering), not model
  reasoning; if wanted later, build a `bug_list`/`bug_queue` **tool** in
  `src/pi.ts`, not a skill.

- **Important alternatives considered:**
  - Manual pre-promotion diagnosing skill / don't adopt (rejected: manual
    step / lacks loop discipline).
  - /triage as a skill / for external PRs only (rejected: wrong shape —
    mechanical work; not a PR-driven repo).
  - Phase 6 just documents / auto-spawns architecture task (rejected: loses
    connection / bug fix shouldn't auto-spawn).
  - Fire only on severity / on first-RED-failure (rejected: severity is a
    guess / too late).
  - All phases mandatory / only P1+P5 mandatory (rejected: ceremony risk /
    loses hypothesis discipline).
  - Infer bug from prompt / two agent files / frontmatter sniffing (rejected:
    fragile / diverges / extra read).

- **Constraints and rationale:**
  - Must work in the Pi harness; skill delivered via the `skill:` param
    (proven by /tdd + /code-review).
  - The parent-never-implements discipline holds; the diagnosing skill guides
    the tdd-worker, doesn't move the fix into the parent.
  - The tdd-worker's budget fallback is the existing uncertainty hatch.
  - Triage is a tool, not a skill — mechanical work doesn't earn a skill.

- **Dependent-task implications:**
  - A `build-diagnosing-bugs-skill` feature task is raised (unblocked — no
    prerequisites, unlike the architecture skill).
  - `report-bug` is unchanged. `improve-architecture-evaluation` (done)
    receives Phase 6 "no correct seam" findings if/when the architecture skill
    exists.
  - A `bug_list`/`bug_queue` tool task is noted as low-priority fog (grep +
    task-overview cover it today).

- **Remaining fog / newly discovered work:**
  - Build task `build-diagnosing-bugs-skill` (feature, unblocked) — precise
    enough to state.
  - `bug_list`/`bug_queue` tool (low priority) — extend src/pi.ts to scan
    docs/bugs/ by status.

## Newly created work

Raise one implementation task with Wayfinder:

- **`build-diagnosing-bugs-skill`** (`type: feature`, unblocked) — the
  `/diagnosing-bugs` skill (model-invoked, 6-phase discipline, Phase 1 non-
  skippable, skip-with-reason rule, Phase 6 handoff-to-architecture flag),
  wired into `skills/implement-task/resources/bug.md` (`skill:
  "diagnosing-bugs"` + the explicit bug-task instruction line), and a
  path-agnostic line in `agents/tdd-worker.md`.

## Recommended starting answer

Adopt /diagnosing-bugs' structured loop as a model-invoked skill — our current
report-bug promotes hard bugs directly without a dedicated debugging phase,
which loses the tight-feedback-loop discipline. Defer /triage for now (it's
designed for an external issue tracker, which our workflow doesn't use).
