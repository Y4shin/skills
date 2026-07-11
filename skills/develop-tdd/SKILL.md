---
name: develop-tdd
description: >
  Strict TDD cycle: RED (write failing test) → GREEN (minimum implementation)
  → REFACTOR (clean up, suite still green). Derives every assertion from the
  slice's acceptance criteria and test plan. Called by implement-slice.
---

# Develop TDD — RED → GREEN → REFACTOR

## Prerequisites

Slice doc with `## Test plan`. On branch `slice/<slug>`.

## Steps

1. Read the slice doc's `## Acceptance criteria` and `## Test plan`.

2. **RED:** Write the test first. Every assertion must derive from the
   acceptance criteria. Run it — it **must fail**. If it passes without
   implementation, the test is wrong; fix it.

3. **GREEN:** Write only the code that makes the failing test pass. No
   speculative code. Run the test — it **must pass**.

4. **REFACTOR:** Remove dead code, improve names, extract helpers. Run the
   test again — it **must still pass**.

5. Run the project's broader test suite if available (`task_profile` test
   commands). If anything breaks, fix forward.

6. Return control to `implement-slice` with a summary: tests written, tests
   passing, any refactoring done.

## Constraints
- Never write a test to match wrong implementation.
- Never skip RED — the test must be seen failing.
- No speculative code beyond what the slice requires.