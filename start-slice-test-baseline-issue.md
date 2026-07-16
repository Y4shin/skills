# Start-slice issue: `test-baseline`

## Summary

Attempted to run the `start-slice` workflow for slice `test-baseline` in task `project-scaffold-test-baseline`, but the chain failed before it could write and approve the test strategy.

The failure happened in step 1 (`grill-agent`) of the 4-step chain:

1. `grill-agent` — analyse layers/failure modes
2. `test-strategist` — write the `## Test plan`
3. `approval-agent` — present the plan for approval
4. `worker` — mark the slice analysed and update workflow state

The `grill-agent` did produce a useful analysis, but the subagent acceptance gate rejected the output, so the chain stopped and later steps never ran.

## Error observed

The relevant acceptance failures were:

- `Acceptance rejected: Structured acceptance report not found.`
- `Acceptance rejected: tests-added evidence missing from child report.`

The latter repeated even when the grill-agent output included an `acceptance-report` block. This appears to be a mismatch between the acceptance gate expectations and the analysis-only role of `grill-agent`: the gate wanted test-added evidence, but this workflow step is explicitly not supposed to edit tests or implementation files.

## Runs attempted

Three chain attempts failed at `grill-agent`:

1. `151d1ae5-6e9e-4f44-8973-31964ba6a4c5`
2. `bcb13b69-8188-4bcc-b2d5-107aeba4520c`
3. `206ddef3-49d4-425a-9d42-cb64b283a6de`

Useful analysis artifacts were written under `.pi-subagents/artifacts/outputs/.../grill/analysis.md`, including:

- `.pi-subagents/artifacts/outputs/151d1ae5-6e9e-4f44-8973-31964ba6a4c5/grill/analysis.md`
- `.pi-subagents/artifacts/outputs/bcb13b69-8188-4bcc-b2d5-107aeba4520c/grill/analysis.md`
- `.pi-subagents/artifacts/outputs/206ddef3-49d4-425a-9d42-cb64b283a6de/grill/analysis.md`

## Important workflow note

Because the chain failed at step 1/4, I did **not** manually edit the slice doc. The `start-slice` workflow explicitly says the parent agent must not compensate by editing the slice doc directly if the chain fails.

Therefore these actions did not happen:

- `## Test plan` was not persisted to `docs/tasks/project-scaffold-test-baseline/slices/5-test-baseline.md`.
- The slice frontmatter was not changed to `analysed: true`.
- The slice status was not changed to `in-progress`.
- `docs/tasks/state.yaml` was not updated for `test-baseline`.
- No start-slice commit was created.

## Useful analysis result

The grill-agent analysis identified the main implementation blocker for `test-baseline`:

- `uv run pytest` currently fails because `pytest` is not declared as a project/dev dependency.
- Existing tests pass with `uv run --with pytest pytest`.

The expected implementation work is likely to add pytest as a uv-managed development dependency or equivalent project configuration so `uv run pytest` works directly, while keeping the tests focused on package import, CLI behavior, config defaults/overrides, JSON output, and no filesystem side effects.

## Current repository state after cleanup

After the failed attempts, Python `__pycache__` directories created by validation commands were removed.

`git status --short --branch` showed:

```text
## task/project-scaffold-test-baseline
?? .pi-subagents/
```

Only `.pi-subagents/` artifacts are untracked.

## Suggested next steps

Options:

1. Fix the subagent acceptance configuration for this workflow so `grill-agent` analysis-only output is accepted without requiring tests-added evidence, then rerun `/skill:start-slice test-baseline`.
2. Rerun the chain with an acceptance policy that does not require tests-added evidence for the `grill-agent` step.
3. If workflow rules are relaxed by the user, manually convert the successful grill-agent analysis into a `## Test plan` in the slice doc, then update frontmatter/state accordingly.

Until one of those is done, `test-baseline` is not ready for `/skill:implement-slice` under the normal workflow.
