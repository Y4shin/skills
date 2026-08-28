## Deviation report — eval-discover-update-set

### API surface changes
- **Planned:** The arch spec specified `scripts/grilling-cli/src/cli-eval.ts` (or a build flag) for the modified CLI where `wait` returns immediately. `scripts/eval/harness.ts` with `runScenario`, `scripts/eval/scenarios.ts` with 3 scenarios, and `eval-results.md` for discovered commands.
- **Actual:** No `cli-eval.ts` file was created. Instead, the eval-mode behavior was implemented as an **env flag** (`GRILLING_EVAL=1`) checked directly in `commands/wait.ts` (`isEvalMode()`) and `commands/start.ts` (`isEvalMode()`). The harness (`harness.ts`), scenarios (`scenarios.ts`), main entry (`main.ts`), and `eval-results.md` all match the spec. A `GapReportFn` abstraction was introduced to separate iteration logic (mock-testable) from pi invocation (`createPiGapFn`) — this is the testable seam the arch spec calls for ("given a mock that reports gaps then clean-then-clean, it stops at 2-clean-in-a-row"), not a scope change.
- **Impact:** None on dependent slices (this is the last slice). The env-flag approach is functionally equivalent to the "build flag or separate entrypoint" the spec allowed — the committed `.mjs` is unaffected when `GRILLING_EVAL` is absent (verified by `cli-eval.test.ts` seam 3).

### Abstraction usage
- Used/was specified: **yes.** The CLI surface from slices 2-3 and the rewritten grilling skill (slice 4) are used. Non-interactive pi invocation (`pi --print -p`) is used via `spawnSync`. The `GapReportFn` abstraction enables mock-based testing of the iteration logic per the arch spec's seam 2. The `strippedEnv()` helper removes `DISPLAY`, `WAYLAND_DISPLAY`, and `XDG_SESSION_TYPE` from the child pi process environment as a browser-spawn backstop.

### Out-of-scope changes
- **Browser-spawn hardening (parent-directed):** `strippedEnv()` strips display variables from the child pi env, `start.ts` forces `noOpen` under `GRILLING_EVAL=1`, and scenario prompts explicitly instruct the agent not to pass `--open`. This was added per parent steering (not in the original slice doc), but is a necessary safety measure given the browser-spawn issues encountered in earlier slices. Not a scope change — it's a defensive measure.
- **Pre-existing `.mjs` race condition:** The integration test occasionally fails when run alongside the bundler test (which rebuilds the `.mjs`). Pre-existing from slices 1-4, not caused by this slice.
- **Pre-existing `?raw` tsc error:** `scripts/grilling-cli/src/index.ts` has a Vite `?raw` import that `tsc` cannot resolve. Pre-existing since slice 1; root `npm run typecheck` passes (it doesn't check `scripts/`).

### Acceptance criteria check

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Modified CLI where `wait` returns immediately, isolated via flag/entrypoint | ✅ | `GRILLING_EVAL=1` env flag in `wait.ts`; committed `.mjs` unaffected when absent (verified by `cli-eval.test.ts`) |
| 2 | 3 synthetic scenarios defined, ≤12 questions each, written down | ✅ | `scenarios.ts`: A (5), B (9), C (12); subjects in `eval-results.md` |
| 3 | Harness runs non-interactive pi, captures gap report, logs gaps | ✅ | `harness.ts` `runPiGrilling` + `createPiGapFn` + `parseGapReport`; `pi-invocation.test.ts` verifies the spawn |
| 4 | Per scenario: iterate to 2-clean-in-a-row, cap 5 | ✅ | `runScenario` in `harness.ts`; `harness-iteration.test.ts` tests convergence and cap |
| 5 | If cap exceeded, escalate to user with scenario + last gaps | ✅ | `runScenario` returns `escalated: true` + `escalationMessage`; `harness-iteration.test.ts` tests escalation |
| 6 | Discovered commands recorded in task/slice artifacts and added to CLI + skill prose | ⚠️ Partial | `eval-results.md` exists but says "not yet run" — the live eval was NOT run (turn budget exhausted at 40). No commands were discovered or folded back. |
| 7 | Final CLI `update` surface documented (bootstrap 6 + discovered) | ⚠️ Partial | `eval-results.md` lists bootstrap 6 only; discovered commands section is a placeholder. |

### Task doc update needed?
Yes — append a note that the eval harness was built and unit-tested, but the **live eval was not run** (turn budget exhausted at 40 turns). The `eval-results.md` still says "not yet run" for all 3 scenarios. Running `npx vite-node scripts/eval/main.ts` is required to complete criterion 6 and 7. The harness code is complete; only the execution step remains.

### User attention needed?
Yes — the live eval was not run due to the turn budget. The harness is built and all unit tests pass, but the actual discovery of missing `update` commands (the primary purpose of this slice) has not happened. The user should be informed that:
1. The harness is ready (`npx vite-node scripts/eval/main.ts`).
2. Running it will take ~10 min × 3 scenarios × up to 5 iterations.
3. The eval runs non-interactive pi grilling sessions, which may consume significant resources.
4. Browser-spawn prevention is in place (`GRILLING_EVAL=1` + env stripping + no `--open`).
