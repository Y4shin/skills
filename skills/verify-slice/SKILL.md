---
name: verify-slice
description: >
  Hard quality gate: run the project's lint command and the slice's test
  command. Blocks on any failure. Called by implement-slice after develop-tdd
  completes.
---

# Verify Slice — Hard quality gate

## Prerequisites

`develop-tdd` has completed. Slice doc has `## Test plan` with `### Run command`.

## Steps

1. Extract the run command from the slice doc's `## Test plan` →
   `### Run command`.

2. Detect or load the project's lint command from `task_profile`. If no lint
   tool is configured, skip lint with a warning.

3. Run lint. If it fails: **STOP**. Report failures. Do not proceed.

4. Run the test command. If it fails: **STOP**. Report failures. Do not proceed.

5. Report: "Slice `<slug>` verified — lint clean, all tests passing."

**Output:** Pass/fail. On pass, `implement-slice` proceeds to `land-slice`. On
fail, `implement-slice` returns to `develop-tdd`.