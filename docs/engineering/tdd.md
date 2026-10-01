# tdd

## What it does

`tdd` is the reference for the red-green loop: what a good test is, where
tests go, the anti-patterns, and the rules of the loop. It is consulted at
test-authoring time by the **tdd-worker** agent (via its `skill: tdd`
parameter) and by anyone writing a test in this pipeline.

The core claims:

- **A good test verifies behavior through public interfaces**, named after
  the behavior it protects, asserting on outcomes callers observe. It
  survives refactors because it ignores internal structure.
- **Tests live at seams.** A seam is the public boundary where behavior is
  observable without reaching inside. Test only at pre-agreed seams: for a
  feature, the seams are agreed in the effort's architecture spec
  (`docs/tasks/<effort>/arch-spec.md`) during implement-task's planning
  step; for a bug, the reproducing failure is the implicit seam.
- **Three anti-patterns**: implementation-coupled tests (break when you
  refactor though behavior did not change), tautological tests (the
  assertion recomputes the expected value the way the code does), and
  horizontal slicing (all tests first, then all implementation, verifying
  imagined behavior).
- **The loop rules**: red before green, one slice at a time (one seam, one
  test, one minimal implementation), and refactoring is not part of the
  loop (it belongs to review).

When exploring the codebase it reads `CONTEXT.md` for domain vocabulary and
respects ADRs, so test names speak the project's language.

## When to reach for it

The model reaches for it whenever a slice is implemented test-first, test
quality or seams are in question, or the red-green loop is being discussed.
There is nothing to type: the tdd-worker pulls it in at authoring time.

## Common questions

**Where should this test go?**
At the highest seam that reaches the behavior, preferably an existing one.
If the shape of the interface itself is in question, that is a
`codebase-design` question before it is a testing question.

**Can I write the tests first, all of them?**
No. That is horizontal slicing: bulk tests verify imagined behavior. One
tracer bullet at a time, each cycle responding to what the last taught.

**The feature has no agreed seam for this. Can I add one?**
Only if it is confirmed first: an unagreed seam is exactly how testing
effort lands everywhere except the critical path.

**Why is refactoring excluded from the loop?**
Mixing it in hides regressions inside behavior changes. Refactoring happens
at review time, with the green suite as the safety net.

## It's working if

- Every cycle went red first: the test failed for the reason it exists, and
  only then did implementation start.
- Tests assert observable outcomes through public APIs and keep passing
  while internals are refactored.
- Each commit is one seam, one test, one minimal implementation, with no
  speculative code anticipating future tests.
- The suite is green at every commit point, and refactoring waited for
  review.
