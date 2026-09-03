---
name: tdd
description: Test-driven development. Use when a slice is implemented test-first, test quality or seams are in question, or the red-green loop is being discussed.
---

# /tdd — Test-Driven Development

A reference for writing tests that survive refactors and for running the red → green loop in this pipeline.

Where it fits:

- The **tdd-worker** consults this skill at authoring time via the `skill: tdd` parameter.
- The **slice-verifier** does **not** consult this skill; it stays a strict pass/fail gate on the slice's acceptance criteria.
- A future `/code-review` skill may use this vocabulary for quality judgment; today that judgment is not wired into the pipeline.

In this pipeline the TDD loop is **red → green**. Refactoring is owned by `implement-task` Step 3 after all slices have landed, not by the per-slice worker. See [tests.md](tests.md) for concrete examples and [mocking.md](mocking.md) for boundary guidance.

## What a good test is

A good test verifies **behavior through public interfaces**, not implementation details. It reads like a specification: the test name tells you what capability exists, and the assertions prove it. Because it is decoupled from internals, it survives refactors — the code can change entirely while the behavior under test stays green.

- Use public APIs only.
- Name tests after the behavior they protect.
- Assert on outcomes callers or users can observe.

## Seams — where tests go

A **seam** is the public boundary at which you observe behavior. Tests live at seams; they never reach inside the implementation.

- **Features:** the seam is agreed in the architecture spec during `implement-task` Step 1. If a seam is not in the spec, confirm it before writing a test at that boundary.
- **Bugs:** the reproducing exception or failure is the implicit seam. Write a regression test that reproduces the bug through the same public interface the user hit.

No test is written at an unconfirmed seam. Agreeing the seam first keeps testing effort on critical paths and complex logic instead of scattering assertions across every internal edge.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel such as querying a database directly. The tell: the test breaks when you refactor even though behavior has not changed.
- **Tautological** — the expected value is recomputed the same way the code computes it, so the test passes by construction and can never disagree with the implementation. Expected values must come from an independent source of truth: a known-good literal, a worked example, or the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify imagined behavior and commit to test structure before you understand the real surface. Work in **vertical slices** instead: one seam, one failing test, one minimal implementation, repeat.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to make it pass. Do not anticipate future tests or add speculative behavior.
- **One slice at a time.** Each cycle covers one seam with one test and one minimal implementation.
- **Refactoring is not part of the loop.** Per-slice workers stop at green. Coherence refactoring happens during `implement-task` Step 3 after all slices have landed.
