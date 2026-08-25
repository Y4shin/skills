---
name: diagnosing-bugs
description: Diagnose and debug hard bugs, failures, crashes, and performance regressions. Use when the user says "diagnose", "debug this", or reports something broken, throwing, failing, slow, or showing a performance regression.
---

# /diagnosing-bugs — Six-phase debugging discipline

A feedback-loop-first discipline for locking down and fixing bugs.
Delivered to the **tdd-worker** via `skill: "diagnosing-bugs"` on `type: bug` tasks; may also be invoked standalone.

Phases 2–6 may be skipped with a recorded one-line justification in your output (e.g. "Phase 2 skipped — repro is already minimal"). **Phase 1 is non-skippable.**

## Redact

This skill has you show commands, outputs, and captured artifacts. **Redact every secret first** — replace it with `<REDACTED>`. Build loops against environment variables so credentials stay out of what you show. When quoting captured artifacts, include only the signal-carrying lines.

If the redacted output is not enough to diagnose the bug, say so and ask the user.

## Phase 1 — Build a feedback loop (non-skippable)

**This is the skill.** A tight, red-capable, deterministic, fast, agent-runnable pass/fail signal makes everything that follows mechanical. Without it, no amount of code reading will save you.

Spend disproportionate effort here. Be aggressive, be creative, and refuse to give up.

### Ten ways to construct a feedback loop

Try them in roughly this order:

1. **Failing test** at the seam that reaches the bug — unit, integration, or end-to-end.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drive the UI and assert on DOM, console, or network.
5. **Replay a captured trace.** Save a real network request, payload, or event log to disk and replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked dependencies) that exercises the bug code path with a single call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run many random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive them with a structured script so the loop is still reproducible. Captured output feeds back to you.

### Tighten the loop

Treat the loop as a product:

- Make it faster (cache setup, skip unrelated init, narrow scope).
- Make the signal sharper (assert on the exact symptom, not just "didn't crash").
- Make it more deterministic (pin time, seed RNG, isolate filesystem, freeze network).

A flaky 30-second loop is barely better than no loop; a 2-second deterministic loop is a debugging superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger many times, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not. Keep raising the rate until it is debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for access to the reproducing environment, a redacted captured artifact (HAR, log dump, core dump, screen recording with timestamps), or permission to add temporary production instrumentation. **Do not proceed to hypothesise without a loop.**

### Completion criterion

Phase 1 is done when you can name **one command** — a script path, test invocation, curl, or equivalent — that you have **already run at least once** (show the invocation and its output, redacted), and that is:

- **Red-capable** — drives the actual bug code path and asserts the user's exact symptom, so it can go red on this bug and green once fixed.
- **Deterministic** — same verdict every run (or a pinned, high reproduction rate for flaky bugs).
- **Fast** — seconds, not minutes.
- **Agent-runnable** — you can run it unattended; a human in the loop only via a structured script.

If you catch yourself reading code to build a theory before this command exists, stop. **No red-capable command, no Phase 2.**

## Phase 2 — Reproduce + minimise

Run the loop and watch it go red. Confirm:

- The failure matches the symptom the user described.
- The failure is reproducible across runs (or at a high enough rate for non-deterministic bugs).
- You have captured the exact symptom (error message, wrong output, slow timing).

Then shrink the repro to the smallest scenario that still goes red. Cut inputs, callers, config, data, and steps **one at a time**, re-running the loop after each cut. Keep only what is load-bearing for the failure. Done when removing any remaining element makes the loop go green.

## Phase 3 — Hypothesise

Generate **3–5 ranked, falsifiable hypotheses** before testing any of them. Each hypothesis must state a prediction:

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly. Do not block if the user is AFK — proceed with your ranking.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the environment supports it.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix such as `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep.

**Performance regressions.** Logs are usually wrong for perf. Establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if a **correct seam** exists. A correct seam exercises the real bug pattern as it occurs at the call site. A shallow seam gives false confidence.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

### No-correct-seam handoff

If no correct seam exists, that itself is the finding: the codebase architecture is preventing the bug from being locked down. Record the finding in `## Divergence from plan` / `uncertainty.md`, surface it to the parent, and route to **wayfinder** or **`/improve-codebase-architecture`**. Do **not** auto-spawn an architecture task.

## Phase 6 — Cleanup

Before declaring done:

- Re-run the original Phase 1 loop and confirm the bug no longer reproduces.
- Confirm the regression test passes (or the absence of a seam is documented).
- Remove all `[DEBUG-...]` instrumentation (`grep` the prefix).
- Delete throwaway prototypes (or move them to a clearly-marked debug location).
- State the winning hypothesis in your commit / PR message so the next debugger learns.
