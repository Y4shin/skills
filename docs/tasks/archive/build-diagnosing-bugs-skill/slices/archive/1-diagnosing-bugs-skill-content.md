---
kind: slice
slug: diagnosing-bugs-skill-content
title: Author the /diagnosing-bugs skill and register it
task: ../task.md
mode: afk
status: done
size: m
blocked_by: []
---

# Slice 1: Author the /diagnosing-bugs skill and register it

## End-to-end behavior

The `/diagnosing-bugs` skill exists as a model-invoked skill in this package,
with the 6-phase discipline, and is registered in the manifest. After this
slice, `/skill:diagnosing-bugs` is invokable and the structure tests pass.

## Deliverables

- `skills/diagnosing-bugs/SKILL.md` — frontmatter (`name: diagnosing-bugs`,
  `description` firing on "diagnose", "debug this", "broken", "throwing",
  "failing", "slow", "performance regression") + the body (adapted from
  mp-skills, not ported verbatim):
  - **Redact** rule — redact every secret before showing commands/outputs;
    build loops against env vars; quote only signal-carrying lines.
  - **Phase 1 — Build a feedback loop (non-skippable).** This is the skill.
    A tight, red-capable, deterministic, fast, agent-runnable pass/fail signal.
    10 ways to construct one (failing test, curl, CLI, headless browser, replay
    trace, throwaway harness, fuzz, bisect, differential, HITL bash). Tighten
    the loop (faster, sharper, more deterministic). Non-deterministic bugs:
    raise the reproduction rate. When you genuinely cannot build a loop, stop
    and say so; do NOT proceed to hypothesise. Completion criterion: one
    red-capable command, already run, shown redacted. **Phase 1 is non-
    skippable.**
  - **Phase 2 — Reproduce + minimise.** Confirm the loop catches the user's
    exact symptom; shrink to the smallest scenario that still goes red.
  - **Phase 3 — Hypothesise.** Generate 3–5 ranked falsifiable hypotheses
    (format: "If <X> is the cause, then <changing Y> will…"). Show the user
    before testing (cheap checkpoint, don't block if AFK).
  - **Phase 4 — Instrument.** One probe per Phase-3 prediction; change one
    variable at a time. Tool preference: debugger/REPL > targeted logs >
    never "log everything and grep". Tag debug logs `[DEBUG-xxxx]`.
  - **Phase 5 — Fix + regression test.** Write the regression test before the
    fix — only if a correct seam exists. If no correct seam, that's the
    finding → Phase 6. Turn the minimised repro into a failing test, watch it
    fail, apply the fix, watch it pass, re-run the Phase 1 loop.
  - **Phase 6 — Cleanup.** Remove `[DEBUG-]` instrumentation; delete throwaway
    prototypes; state the winning hypothesis. **No-correct-seam handoff:** if
    Phase 5 found no correct seam, record the finding (the architecture
    prevents locking the bug down) in `## Divergence from plan` /
    `uncertainty.md`, surfaced to the parent → wayfinder or
    `/improve-codebase-architecture`. Does NOT auto-spawn an architecture task.
  - **Skip rule:** Phases 2–6 are skippable with a recorded one-line
    justification in the worker's output (e.g. "Phase 2 skipped — repro is
    already minimal"). Phase 1 is non-skippable.
  - A note: this skill is delivered to the tdd-worker via `skill:` on bug
    tasks; it can also be invoked standalone.
- `package.json` — add `"./skills/diagnosing-bugs"` to `pi.skills` (length
  9 → 10, or 8 → 9 if the doctor skill hasn't landed; confirm current length).
- `tests/skills.test.ts` — add `"skills/diagnosing-bugs/SKILL.md"` to
  `SKILL_FILES`; update `pi.skills.length`; add xref assertions:
  - the SKILL.md contains "Phase 1" and "non-skippable".
  - the SKILL.md contains the skip-with-reason rule ("skippable" + "justified"
    or "recorded").

## Acceptance criteria

- `skills/diagnosing-bugs/SKILL.md` exists and is non-empty.
- The SKILL.md has all 6 phases; names Phase 1 non-skippable; states the
  skip-with-reason rule for 2–6; documents the Phase 6 no-correct-seam handoff.
- `package.json` `pi.skills` contains `"./skills/diagnosing-bugs"` (length
  bumped correctly).
- `tests/skills.test.ts` green with the new entries + xref assertions.
- `npm test -- tests/skills.test.ts` green.

## Test plan

- Seams: the structure tests (SKILL_FILES, pi.skills.length, xrefs).
- Failure modes: manifest length mismatch; missing frontmatter; xref text
  absent.
- Scenarios: `npm test -- tests/skills.test.ts` green.
- Edge cases: `no chain JSON references` / `no supervisor/intercom` pass.

## Constraints

- Adapt mp-skills content (delivered via `skill:` to tdd-worker; hands to
  wayfinder; not a standalone session); do not port verbatim.
- Phase 1 non-skippable; 2–6 skippable with recorded reason.
- Do not auto-spawn architecture tasks from Phase 6.
- Avoid "chain.json", "subagent_supervisor", "contact_supervisor" patterns.
- Single source of truth: this slice creates the skill; it does NOT wire it
  into bug.md or touch agents/tdd-worker.md (slice 2).
