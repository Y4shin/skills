---
name: design-test-strategy
description: >
  Generate a comprehensive testing strategy for a slice using the confirmed
  layer analysis and failure modes as inputs. Reads docs/testing.md for
  project test conventions. Iteratively refines with the developer before
  persisting the test plan. Called by start-slice.
---

# Design Test Strategy

Called by `start-slice` after the developer has identified the layers touched
by the slice and its failure modes. Produces a richer, more structured test
plan than the older approach of asking about test type alone.

## Prerequisites

- Slice doc exists with `analysed: false`
- Layer analysis confirmed (from `start-slice` grill question 1)
- Failure modes confirmed (from `start-slice` grill question 2)
- `docs/testing.md` exists (project test conventions, harness, commands)

**Use `task_profile` to load test infrastructure conventions (fallback).**

## Step 1 — Load context

1. Read the slice doc `docs/tasks/<task-slug>/slices/<n>-<slug>.md` in full:
   - Acceptance criteria
   - Task context
   - `blocked_by` (dependencies)
   - Mode (hitl / afk)

2. Read `docs/testing.md` in full for project-level test conventions:
   - Testing framework(s) and assertion libraries
   - Available test types (unit, integration, e2e, property-based, snapshot, etc.)
   - File discovery patterns and naming conventions
   - Mocking / faking / fixture conventions
   - Run commands (single file, watch mode, full suite)
   - Code coverage expectations
   - CI integration

   If `docs/testing.md` does not exist, fall back to `task_profile` test
   infrastructure, then warn that the project should create `docs/testing.md`.

3. Collect the confirmed inputs from the caller:
   - **Layer analysis:** what the slice touches end-to-end and at which layers
   - **Failure modes:** at least two failure scenarios the tests must catch

## Step 2 — Generate a testing strategy

Synthesise a comprehensive testing strategy from the inputs above. Cover each
of these dimensions:

| Dimension | What to address |
| --- | --- |
| **Test type(s)** | One or more types from the project's available test infrastructure (unit, integration, e2e, property-based, snapshot, etc.). Justify each. |
| **Scope** | What exactly is being tested. What is **explicitly excluded** from this slice's tests (e.g. "already covered by slice X", "out of scope for this slice"). |
| **Dependency strategy** | Per dependency: real instance, fake, mock, stub, or in-memory substitute. Include fixture / seed data needs. |
| **Key scenarios** | Structured assertions — prefer Given/When/Then notation for behavioural scenarios, or input→expected for pure functions. Cover the happy path first. |
| **Edge cases** | Boundaries, null/empty/zero inputs, malformed data, concurrency, resource exhaustion, etc. |
| **Failure modes addressed** | Each previously-confirmed failure mode mapped to the specific scenario or assertion that catches it. |
| **Error handling** | How invalid states, unexpected inputs, and dependency failures are surfaced and verified. |
| **Test file** | Suggested path following project conventions. |
| **Run command** | Exact command(s) to run these tests (single-file and full-suite). |

## Step 3 — Present for approval

Present the generated strategy to the developer with a clear summary of each
dimension. Ask:

> **"Do you approve of this testing strategy?"**

If the developer pushes back or requests changes:

- Adapt the strategy accordingly
- Re-present for approval
- Iterate until confirmed

**If the slice is `mode: hitl` (human-in-the-loop):** be thorough — the
developer will write the tests themselves, so the strategy must be precise
enough to implement from.

**If the slice is `mode: afk` (autonomous):** the strategy still needs approval,
but the developer may delegate more trust.

## Step 4 — Persist the test plan

Once approved, append a `## Test plan` section to the slice doc with this
richer schema:

```markdown
## Test plan

**Test type(s):** <one or more types>
**Scope:** <what's tested — and what's not>
**Dependency strategy:** <real vs fake per dependency>
**Run command:** `<command>`

### Scenarios

<description of key scenarios, ideally in Given/When/Then or input→expected form>

### Edge cases

- <boundary / empty / null / malformed case>
- <…>

### Failure modes addressed

- <failure mode 1>: caught by <scenario / assertion>
- <failure mode 2>: caught by <scenario / assertion>

### Test file
`<path>`
```

## Step 5 — Return control

Return to `start-slice` with a summary: strategy approved, test plan written to
slice doc.

## Constraints

- **Spec-first** — every scenario and assertion must derive from the slice's
  acceptance criteria, never from an imagined implementation.
- **One consolidated question** — present the full strategy at once, not piecemeal.
- **Iterate on feedback** — if the developer rejects or modifies a dimension,
  regenerate the full strategy (the dimensions are interdependent).
