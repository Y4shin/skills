## Deviation report — cli-core-and-state

### API surface changes

1. **`set-state` CLI argument shape (minor, necessary)**
   - **Planned:** The slice doc shows `set-state --state <one of 7>`, using `--state` as the flag for the target page-state.
   - **Actual:** `--state <key>` is already the state-dir resolution flag used by *all* subcommands (per the `--state <key>` indirection pattern). To avoid collision, the target page-state is a **positional argument**: `update set-state --state <key> <target-state>`.
   - **Impact:** None on dependent slices. The arch spec's interface contract for slice 3 says "the CLI surface … no code contract beyond the subcommands' argv shapes (which slice 2 fixed)." Slice 3 extends `start` (adds server + url + opened) and `refresh` (real server signal) but does not touch `set-state`. Slice 4's skill prose will need to use the positional form `set-state --state <key> in-round` rather than `set-state --state in-round`. The skill-rewire slice (4) should be made aware of this shape.

2. **`add-edge` gains `--id <id>` (addition)**
   - **Planned:** The slice doc shows `add-edge --from <id> --to <id> --type dep|contra|ref` — no `--id` flag for the edge itself.
   - **Actual:** `add-edge` takes an additional `--id <id>` flag to assign the edge an identifier (needed by `resolve-contradiction --edge <id>` which references edge ids). The `AddEdgeInput` interface includes `id: string`.
   - **Impact:** None on dependent slices — the `resolve-contradiction` subcommand (also in this slice) needs edge ids to function, so this is a necessary addition. The slice doc's literal `add-edge` usage was incomplete; the arch spec's `resolveContradiction` function signature implies edges have ids. Slice 4's skill prose should use `add-edge --id <edge-id> --from <id> --to <id> --type <type>`.

3. **`wait` CLI argument shape (minor, necessary)**
   - **Planned:** The slice doc shows `wait <state>` as a top-level subcommand, implying the target state is a positional arg.
   - **Actual:** `wait --state <key> <target>` — the target state is a positional arg, with `--state <key>` for dir resolution. This is consistent with the `--state <key>` pattern used by all subcommands.
   - **Impact:** None on dependent slices. The arch spec says "no code contract beyond the subcommands' argv shapes (which slice 2 fixed)." Slice 4 will use `wait --state <key> <target>`.

### Abstraction usage
- Used/was specified: **yes.** `node:os.tmpdir()` for the random temp dir, `node:fs/promises` + `node:fs` for atomic writes (temp file + rename), `node:util.parseArgs` for argv parsing, `node:crypto.randomBytes` for random keys and temp file names. No hand-rolled bundler, no hand-rolled argv parser, no hand-rolled atomic write. No SSE, no event loop for `wait` (simple 100ms poll loop). Matches the arch spec's "Existing abstractions to use" and "Do NOT reimplement" exactly.

### Out-of-scope changes

1. **`scripts/build.ts` external config change** — Changed `external: []` to `external: (id: string) => id.startsWith("node:")` so node builtins (`node:fs`, `node:os`, `node:crypto`, `node:util`, `node:path`, `node:http`) resolve at runtime instead of being bundled. Without this, the bundled `.mjs` would fail to import node builtins. This is a build-config fix, not a user-facing API change. **Slice 3** (`server.ts` uses `node:http` and `node:child_process`) depends on this being in place — so it is correctly in this slice's scope as a prerequisite.

2. **Integration test race-condition workaround** — The `bundler.test.ts` (slice 1) removes and rebuilds `grilling-cli.mjs` during its test suite, creating a race with the integration test (slice 2) which spawns the `.mjs`. The worker added a `runCli()` helper that checks for the file and rebuilds on "Cannot find module" errors. This is a test-infrastructure addition, not a scope change. It works (all 450 tests pass including concurrent execution), though the bundler test should ideally not remove the committed artifact during tests — a future cleanup item.

3. **`start` prints real dir to stdout** — The slice doc says `start` "prints the temp dir path to stdout (for the human's benefit)." The implementation does this via `process.stdout.write(stateDir + "\n")` in `start.ts`. This is correct per spec, but the integration tests capture this output (they read `startResult.stdout.trim()` to get the state dir). The `/tmp/grilling-*` lines visible in test output are from `start` printing the real dir — this is expected behavior, not a leak.

### Divergence from acceptance criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `start` creates random temp dir with `state.json` + `grilling.pid`, writes `.grilling.json`, sets page-state=view, prints dir, exits 0 | ✅ | All verified by `start.test.ts` (8 tests) + integration test |
| 2 | `get` prints state/subset, never exposes real dir path | ✅ | `get.test.ts` (7 tests) + integration test ("get never exposes real dir path") |
| 3 | 6 `update` subcommands mutate JSON safely (atomic), no re-render | ✅ | `update.test.ts` (13 tests) — atomic write verified, no side effects beyond JSON |
| 4 | `update` writes do NOT trigger re-render (refresh is stub) | ✅ | `refresh.ts` is a stub that validates state dir; `update` has no side effects |
| 5 | 7-state machine enforced: disallowed transitions fail | ✅ | `transitions.test.ts` (52 tests) — full 7×7 parameterized table |
| 6 | `wait` blocks until match, exits 0; `--timeout` exits non-zero | ✅ | `wait.test.ts` (4 tests) — match, transition, timeout, clear message |
| 7 | `finalize` non-zero when coast NOT clear; markdown + exit 0 when clear; empty → non-zero | ✅ | `finalize.test.ts` (5 tests) — empty, frontier, contradictions, clear, cwd emission |
| 8 | `.grilling.json` and real dir never printed by `get`/`update` | ✅ | Verified by integration test "get never exposes real dir path" + grep of all command output |
| 9 | End-to-end bash loop: start → add-question → add-edge → promote → set-state → answers → get → finalize | ✅ | `integration.test.ts` (6 tests) — full loop + error cases |

All acceptance criteria are met. The three API surface deviations (set-state positional, add-edge --id, wait positional) are necessary consequences of the `--state <key>` indirection pattern that all subcommands share — the slice doc's literal flag names collided with `--state <key>`, and the worker resolved this correctly by using positional arguments for the target values.

### Task doc update needed?
Yes — append a note about the `set-state`, `add-edge`, and `wait` CLI argument shapes so slice 4 (skill-rewire) uses the correct forms:
- `update set-state --state <key> <target-state>` (positional, not `--state <target>`)
- `update add-edge --state <key> --id <edge-id> --from <id> --to <id> --type <type>` (includes `--id`)
- `wait --state <key> <target>` (positional target)

### User attention needed?
No. No scope changed. The API surface deviations are necessary argument-shape resolutions (the slice doc's `--state` flag collided with the `--state <key>` indirection pattern), not changes to what the CLI *does*. All acceptance criteria pass, all 450 tests are green, and the interface contract for slice 3 is satisfied (`start` returns `{stateDir, key}` + placeholder pid; state schema is defined; `refresh` is a stub).
