# HANDOFF — eval re-runs (scenarios B and C) for build-grilling-visualizer

> The user had to leave. Slice 5's harness is built, the discovered commands
> are folded into the CLI + skill, and scenario A ran (surfacing the gaps). The
> remaining work is re-running all 3 scenarios to confirm 2-clean-in-a-row
> convergence with the fixed harness, then landing slice 5. This doc tells the
> follow-up agent exactly where to pick up.

## Where things stand

- **Branch:** `slice/eval-discover-update-set` (off `task/build-grilling-visualizer`).
- **Task:** `docs/tasks/build-grilling-visualizer/task.md` (slices 1-4 landed;
  slice 5 is this one).
- **Map:** `docs/tasks/maps/grilling-visualizer/map.md`.
- **All slices 1-4 are landed** on `task/build-grilling-visualizer` (bundler,
  CLI core+state, server+SPA, skill-rewire). 528 tests green on the task branch.

## What's done in slice 5 (on this slice branch, committed + uncommitted)

1. **Harness built + unit-tested** (criteria 1-5 ✅):
   - `scripts/grilling-cli/src/commands/cli-eval.ts`-style isolation via the
     `GRILLING_EVAL=1` env flag in `wait.ts` (returns immediately) and
     `start.ts` (forces noOpen). Committed `.mjs` unaffected when the flag is
     absent.
   - `scripts/eval/harness.ts` — `runScenario` iterates to 2-clean-in-a-row
     (cap 5), escalates near cap; `GapReportFn` abstraction; `createPiGapFn`.
   - `scripts/eval/scenarios.ts` — 3 synthetic scenarios (A: 5 q, B: 9 q, C: 12 q).
   - `scripts/eval/main.ts` — entry; supports `--scenario <id>` and
     `--model <model-id>` for spiking.
   - `strippedEnv()` removes DISPLAY/WAYLAND_DISPLAY/XDG_SESSION_TYPE (browser
     backstop). **Zero browser spawns verified.**
   - 38 unit tests green (parseGapReport, iteration convergence/cap/escalation,
     scenarios, pi invocation, cli-eval isolation).

2. **Harness bugs fixed** (the spike surfaced them):
   - `parseGapReport` now **requires the `update` prefix** (was matching
     "Round 1" / "R1" as missing commands). Test updated + a
     false-positive-prevention test added.
   - Convergence: an empty-missing report that *mentions* a missing-ops
     section now counts as converged (was staying non-converged silently).

3. **Discovered commands folded into the CLI + skill** (scenario A findings):
   - `update answer --id <qid> --value <text>` (records answer + in-round→round-done)
   - `update set-deps --id <qid> --deps <ids>` (rewrite deps)
   - `update accept` (final-review→accepted)
   - `update reject --feedback <text>` (final-review→rejected→in-round)
   - top-level `stop` (stopServer + key cleanup)
   - Wired in `scripts/grilling-cli/src/commands/update.ts` + `finalize.ts`
     (`stopServer`) + `index.ts` (dispatch + USAGE). `skills/grilling/SKILL.md`
     documents them. Bundle rebuilt. Smoke-tested end-to-end (no browser).
   - Recorded in `docs/tasks/build-grilling-visualizer/eval-results.md`.

## What's left (the deferred re-runs)

**Goal:** confirm 2-clean-in-a-row convergence for all 3 scenarios with the
fixed harness, then land slice 5.

### Steps

1. **Make sure you're on the slice branch:**
   ```bash
   git checkout slice/eval-discover-update-set
   ```

2. **Run a single scenario as a spike** (cheap model, background, log to file):
   ```bash
   nohup npx vite-node scripts/eval/main.ts --scenario A \
     --model sference/deepseek-v4-flash-0731 > /tmp/eval-A.log 2>&1 &
   ```
   Poll with `tail -f /tmp/eval-A.log`. Each iteration prints
   `--- [<id>] iteration N/5 ---`, the raw `[pi output]`, and
   `-> gaps: K missing command(s): ...` or `-> clean`. With the fixed parser,
   scenario A should now converge (the agent's reports include a missing-ops
   section and, once the folded commands are in the CLI, report no *missing*
   ones).

   **Browser safety:** the harness sets `GRILLING_EVAL=1` (wait returns
   immediately, start forces noOpen) and strips DISPLAY/WAYLAND_DISPLAY. The
   CLI default is also no-open (opt-in `--open`). Do NOT pass `--open`. If a
   browser tab opens, kill it and investigate — zero tabs is a hard rule.

3. **Run all 3 scenarios** (A, B, C) once the spike converges:
   ```bash
   nohup npx vite-node scripts/eval/main.ts \
     --model sference/deepseek-v4-flash-0731 > /tmp/eval-all.log 2>&1 &
   ```
   Each scenario iterates to 2-clean-in-a-row (cap 5). ~10 min/scenario worst
   case. The harness writes `docs/tasks/build-grilling-visualizer/eval-results.md`.

4. **Triage discoveries:** if B or C surface commands beyond the 5 already
   folded (answer, set-deps, accept, reject, stop), triage them (real gap vs
   false-positive vs covered-by-existing) and fold the real ones into
   `update.ts` + `index.ts` + `SKILL.md`. Update `eval-results.md`.

5. **If a scenario does not converge at the cap** (5 iterations, no
   2-clean-in-a-row): escalate to the user with the scenario + last gaps. Do
   not loop forever. The fixed parser should prevent the false-positives that
   caused scenario A to escalate on the first run.

6. **Run the safe tests** (no live pi, no browsers) to confirm the folded
   commands don't break anything:
   ```bash
   npx vitest run tests/skills.test.ts tests/skill-rewire.test.ts \
     scripts/grilling-cli/src/ scripts/eval/
   ```
   Then the full suite once (it's browser-free now): `npm test`.

7. **Commit** the harness fixes + folded commands + eval-results on the slice
   branch (if not already committed). Then **land slice 5**:
   ```bash
   # via the land-worker subagent OR manually:
   git checkout task/build-grilling-visualizer
   git merge --no-ff slice/eval-discover-update-set -m "slice(build-grilling-visualizer): eval-discover-update-set"
   git branch -d slice/eval-discover-update-set
   mkdir -p docs/tasks/build-grilling-visualizer/slices/archive
   git mv docs/tasks/build-grilling-visualizer/slices/5-eval-discover-update-set.md \
          docs/tasks/build-grilling-visualizer/slices/archive/5-eval-discover-update-set.md
   # append an Implementation note to task.md, commit, then mark slice done.
   ```
   This is the **last slice** — after landing, the task is complete; run
   `/skill:finalize-task build-grilling-visualizer`.

## Key files

- Harness: `scripts/eval/harness.ts`, `scenarios.ts`, `main.ts`
- CLI: `scripts/grilling-cli/src/commands/update.ts` (folded commands),
  `index.ts` (dispatch), `finalize.ts` (`stopServer`)
- Skill: `skills/grilling/SKILL.md` (documents the new commands)
- Results: `docs/tasks/build-grilling-visualizer/eval-results.md`
- Slice doc: `docs/tasks/build-grilling-visualizer/slices/5-eval-discover-update-set.md`
- Arch spec: `docs/tasks/build-grilling-visualizer/arch-spec.md`

## Gotchas learned the hard way

- **Never hand-run `node skills/grilling/grilling-cli.mjs start` without
  `--open` being absent** — bare `start` is no-open by default now (the footgun
  was fixed in slice 4). Do NOT pass `--open` in the eval or tests.
- **`xdg-open` opens a tab in the *existing* browser** (no new process), so
  `ps aux | grep` cannot detect it. The real prevention is the no-open default
  + GRILLING_EVAL + env stripping.
- **The tdd-worker hand-tests `start`** and can spawn tabs; the harness fix
  (env flag forces noOpen) contains this, but watch for it.
- **The slice-verifier subagent (deepseek-v4-pro) stalls** ~60s into verify
  every time; verify in the parent (`npx vitest run <file>`) instead of
  trusting that child.
- **The bundler test rebuilds the `.mjs`** during the suite and races with the
  integration test that spawns it; it's a flaky pre-existing race, not a real
  failure. Re-run if it flakes.
