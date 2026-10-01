# diagnosing-bugs

## What it does

`diagnosing-bugs` is a six-phase, feedback-loop-first discipline for locking
down and fixing hard bugs: the failure that resists a first glance, the
intermittent flake, the regression that crept in between two known-good
states. It is delivered to the tdd-worker on `type: bug` tickets and works
standalone too.

**Phase 1 (non-skippable) builds a feedback loop**: one command, already run
at least once, that is red-capable (drives the actual bug path and asserts
the exact symptom), deterministic (or a pinned high reproduction rate),
fast, and agent-runnable. Ten construction strategies, in order: failing
test, curl script, CLI diff against a snapshot, headless browser, trace
replay, throwaway harness, fuzz loop, bisection harness, differential loop,
human-in-the-loop script. The loop is then tightened like a product: faster,
sharper signal, more deterministic. **No red-capable command, no Phase 2.**

The remaining phases may be skipped with a recorded one-line justification:

2. **Reproduce and minimise**, cutting the repro one element at a time.
3. **Hypothesise**, three to five ranked, falsifiable predictions shown to
   you before any probe runs.
4. **Instrument**, one variable at a time, debugger first, tagged logs
   (`[DEBUG-...]`) for one-grep cleanup; baselines before any perf claim.
5. **Fix plus regression test**, written before the fix, but only at a
   correct seam; a shallow seam gives false confidence.
6. **Cleanup**: the original loop re-run, instrumentation removed, the
   winning hypothesis stated in the commit message.

Secrets are redacted first, always. If no loop can be built, the skill says
so and asks for the reproducing environment rather than theorizing.

## When to reach for it

The model reaches for it on hard bugs, intermittent failures, and
performance regressions; the bug-ticket chain hands it to the tdd-worker
automatically. Say "diagnose" or "debug this" and it engages.

## Common questions

**Why so much emphasis on the feedback loop?**
Everything after Phase 1 is mechanical once the loop exists, and hopeless
without it. A flaky 30-second loop is barely better than none; a 2-second
deterministic loop is a debugging superpower.

**The bug only happens in production. Now what?**
Higher reproduction rate, not a clean repro: loop the trigger, parallelise,
stress, narrow timing windows. A 50-percent flake is debuggable; 1 percent
is not. Failing that, the skill asks you for access, a redacted artifact, or
temporary instrumentation.

**Can Phase 2 through 6 be skipped?**
Yes, each with a recorded one-line justification ("Phase 2 skipped, repro is
already minimal"). Phase 1 never is.

**What if no correct seam exists for the regression test?**
That is itself the finding: the architecture is preventing the bug from
being locked down. It gets recorded and routed to wayfinder or
`/skill:improve-codebase-architecture`, not papered over.

## It's working if

- Phase 1 ends with a named command and its redacted output, red on the
  bug, before any theory was formed.
- Hypotheses were ranked and shown to you before instrumentation started,
  and probes changed one variable at a time.
- The regression test was written before the fix and fails on the unfixed
  code.
- Nothing `[DEBUG-...]` survives, the original scenario re-runs green, and
  the commit message states the winning hypothesis.
