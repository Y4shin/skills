# Architecture spec — build-grilling-visualizer

Shared across all slice chains. The tdd-worker tests **only at the Seams listed
here**. If a test seems to belong at an unlisted seam, the worker writes
`uncertainty.md` and stops.

## Layout & conventions (all slices)

- `scripts/` is a standalone subproject with its own `scripts/tsconfig.json`
  (NOT in root `include: ["src/**/*.ts"]`). Root `npm run typecheck` (tsc
  --noEmit) must keep ignoring `scripts/`.
- Tests live under `scripts/**/*.test.ts` and are run by the **existing root
  `npm test` = `vitest run`** (no vitest config exists; vitest scans all
  `**/*.test.ts`). No separate test command. The slice-verifier's "full
  project suite" therefore covers `scripts/` tests automatically.
- All scripts/ source is ESM (root `"type": "module"`).
- New devDependencies (added in slice 1, used throughout): `svelte`,
  `@sveltejs/vite-plugin-svelte`, `vite-plugin-singlefile`.
- Do NOT add a vitest config that would break the root scan. Do NOT import
  `.svelte` files from unit tests (the root vitest has no svelte plugin) —
  test pure model functions instead (see slice 3).
- The committed artifact is `skills/grilling/grilling-cli.mjs` — a single
  Node ESM file carrying the inlined SPA HTML as a string. Normal use needs
  no build step; the build is run by maintainers via `scripts/build.ts`.

---

## Slice 1 — bundler-subproject (s, afk)

Prefactoring: the build pipeline + minimal placeholders. Does NOT implement
real CLI logic, server, or graph.

### Exports
- `scripts/tsconfig.json` — standalone TS config (target ES2022, NodeNext,
  strict; includes `scripts/**/*.ts`; does NOT emit to root `dist`).
- `scripts/build.ts` — build driver. Two-step Vite build:
  (a) `scripts/grilling-ui/` (Svelte 5 SPA) → one inlined `index.html` via
  `vite-plugin-singlefile` + `build.assetsInlineLimit: Infinity`;
  (b) `scripts/grilling-cli/` (CLI TS) → `skills/grilling/grilling-cli.mjs`
  with the `index.html` embedded as a raw string (Vite `?raw` import or
  read-at-build-time).
- `scripts/grilling-ui/src/App.svelte` (+ `main.ts` entry, `index.html`
  shell) — minimal placeholder page rendering e.g. "grilling visualizer".
- `scripts/grilling-cli/src/index.ts` — minimal CLI entry: `--help` prints a
  usage line and exits 0. Imports the inlined HTML (so the embed is wired).
- Output: `skills/grilling/grilling-cli.mjs` (committed).

### Existing abstractions to use
- Vite 5.4.21 (already in `node_modules`).
- `vite-plugin-singlefile` (new devDep) for single-file inlining.
- `@sveltejs/vite-plugin-svelte` (new devDep) to compile Svelte.

### Do NOT reimplement
- No hand-rolled bundler; use Vite. No SvelteKit (no adapter, no `+server.ts`,
  no SSR, no router) — one page, client-side.
- Do not touch root `tsconfig.json` `include`; give scripts/ its own config.

### Seams (tested by tdd-worker)
1. `scripts/build.ts` run → `skills/grilling/grilling-cli.mjs` exists and is
   non-empty. (integration test: invoke build, assert file.)
2. `node skills/grilling/grilling-cli.mjs --help` exits 0 and prints a usage
   line. (integration test: spawn the .mjs.)
3. The produced `.mjs` contains the inlined SPA HTML (string match for the
   placeholder text) — proves single-artifact inline strategy.
4. Root `npm run typecheck` passes and does NOT type-check `scripts/`
   (scripts/ has its own config; root include stays `src/**`).
5. Build output is a single `index.html` (no separate JS/CSS files emitted
   alongside).

### Interface contract (for slice 2)
`skills/grilling/grilling-cli.mjs` exists and is invokable as
`node skills/grilling/grilling-cli.mjs <subcommand> [flags]`. Slice 2 replaces
the placeholder CLI internals with real subcommands; the entrypoint shape and
the committed-artifact contract are fixed here.

---

## Slice 2 — cli-core-and-state (m, afk)

The real CLI logic as pure modules under `scripts/grilling-cli/src/`, bundled
to the existing `grilling-cli.mjs`. Drivable end-to-end from bash, NO server
yet (`refresh` is a stub).

### Exports (modules under `scripts/grilling-cli/src/`)
- `state.ts` — `createStateDir()` → random dir under `os.tmpdir()`;
  `loadState(dir)` / `saveState(dir, state)` with **atomic writes** (temp file
  + rename); schema + validation for the JSON state (page-state, questions[],
  edges[], summary, rounds, answers).
- `key.ts` — `writeKey(cwd, key, dir)` / `resolveKey(cwd, key)` → dir; the
  `.grilling.json` map file (key → real dir) in CWD.
- `transitions.ts` — `canTransition(from, to)`, `assertTransition(from, to)`;
  the 7-state table:
  view→in-round→round-done→{in-round|final-review→{accepted→done|rejected→in-round}}.
- `commands/start.ts` — `start({cwd})` → `{ stateDir, key }`: creates random
  temp dir, writes `state.json` (page-state=view) + placeholder `grilling.pid`,
  writes `.grilling.json` key map in CWD, prints the real dir to stdout.
- `commands/get.ts` — `get(dir, subset?)` → state subset; never prints the
  real dir path.
- `commands/update.ts` — the 6 bootstrap subcommands as pure functions:
  `addQuestion`, `addEdge`, `promote`, `setState` (enforces transitions),
  `setSummary`, `resolveContradiction`. Writes are atomic; do NOT trigger
  re-render.
- `commands/refresh.ts` — `refresh(dir)`: validates the state dir (stub; no
  server yet).
- `commands/wait.ts` — `wait(dir, target, timeoutMs)`: polls `state.json`
  until page-state matches target or timeout.
- `commands/finalize.ts` — `finalize(dir)`: checks coast-clear (empty
  frontier, all questions answered, no unresolved contradictions); if clear,
  emits `<slug>-grilling-summary.md` (sidebar summary + all Q&A) and returns;
  else non-zero with a message.
- `index.ts` — argv wiring (use `node:util.parseArgs`); dispatches to the
  command modules.

### Existing abstractions to use
- `node:os.tmpdir()`, `node:fs/promises`, `node:util.parseArgs`.

### Do NOT reimplement
- No hand-rolled atomic write (use temp + rename). No hand-rolled argv parser
  (use `parseArgs`). No long-polling/event loop for `wait` (simple poll loop).

### Seams (tested by tdd-worker)
1. `state.ts` — atomic save survives an interrupt mid-write (test: write,
   corrupt the temp, ensure load detects/handles; or test that rename is
   atomic by checking no partial file appears at the target path).
2. `transitions.ts` — allowed transitions succeed; disallowed ones throw with
   a clear error (parameterized test over the 7×7 table).
3. `update` subcommands — each mutates state correctly and does NOT trigger
   re-render (no side effects beyond the JSON). `addQuestion` rejects duplicate
   ids; `addEdge` rejects unknown node ids; `setState` rejects disallowed
   transitions.
4. `start`/`key` — two parallel `start`s produce two distinct random dirs and
   two key-map entries (no collision); `.grilling.json` maps key→dir.
5. `get` — returns requested subsets; never exposes the real dir path in its
   output.
6. `wait` — blocks until state matches, exits 0; times out with non-zero + clear
   message on `--timeout`.
7. `finalize` — non-zero + clear message when coast NOT clear (non-empty
   frontier / unanswered / unresolved contradiction); emits markdown + exits 0
   when clear. Empty grilling → non-zero ("no questions resolved").
8. End-to-end bash loop (integration test): start → add-question ×N → add-edge
   → promote → set-state in-round → (test helper sets answers) → set-state
   round-done → get shows answers → finalize emits markdown.

### Interface contract (for slice 3)
- `start` returns `{ stateDir, key }` and writes a placeholder `grilling.pid`;
  slice 3 extends `start` to also start the detached server and write the
  real pid + return `{ url, opened }`.
- The JSON state schema (from `state.ts`) is the contract slice 3's server
  reads/serves and the SPA renders.
- `refresh(dir)` is a stub here; slice 3 makes it signal the real server.

---

## Slice 3 — server-and-spa (l, afk)

The persistent detached HTTP server + the real Svelte graph SPA. `start` now
really starts the server; `refresh` signals it.

### Exports
- `scripts/grilling-cli/src/server.ts` — `startServer({stateDir, html})` →
  `{ url, pid }`: binds port 0, reads assigned port, serves the inlined HTML
  at `GET /`, `GET /state` (returns JSON), `POST /submit` (writes answers +
  feedback atomically, sets page-state=round-done). Detaches (the `.pid`
  becomes real). Cross-platform xdg-open (`open` on mac, `start` on win,
  `xdg-open` on linux via `process.platform`).
- `scripts/grilling-ui/src/graph.ts` — **pure** `graphModel(state)` →
  `{ rows: {round, nodes}[], upcoming: {node, blockedBy}[], edges:
  {from,to,type}[] }`. This is the SPA's render model and the testable seam.
- `scripts/grilling-ui/src/App.svelte` — renders `graphModel(state)`: rows =
  rounds, nodes = 5-word ids, edges in three styles (dep black solid, contra
  red solid, ref gray dashed) + legend, the "upcoming" section, the always-open
  free-form summary sidebar, and per-round answer inputs + feedback field; a
  "Send all answers" button POSTs to `/submit`.
- `commands/refresh.ts` — now signals the server via the `.pid` (SIGHUP or a
  watched file touch — implementation choice) to push/re-read current JSON.
- `commands/start.ts` — extended: starts server, writes real pid, prints
  `<url>\nopened: <bool>`, auto-opens via xdg-open unless `--no-open`.
- `commands/finalize.ts` — extended: stops the server process, removes the
  temp dir + `.grilling.json` entry.

### Existing abstractions to use
- `node:http` for the server (no framework).
- `node:child_process` (`spawn` detached) for the server + xdg-open.

### Do NOT reimplement
- No SSE (polling ~1-2s via `GET /state`). No express/koa. No hand-rolled
  router beyond a small dispatch on method+path.
- Do not unit-test `.svelte` files (root vitest has no svelte plugin); test
  the pure `graphModel` function only.

### Seams (tested by tdd-worker)
1. `graph.ts` `graphModel(state)` — pure: given a state, returns correct
   rows (by round), upcoming (blocked nodes with their blockers), and edges
   with correct types. Parameterized over fixture states (including a
   contradiction and a reference edge).
2. `server.ts` routing — start the server on port 0 in-process (not detached)
   for the test: `GET /state` returns the JSON; `POST /submit` with answers +
   feedback writes them and transitions to round-done; `GET /` returns the
   HTML string. (Test the http handlers, not the detach.)
3. xdg-open platform branch — assert the correct binary is selected per
   `process.platform` (linux/mac/win); `--no-open` skips the call and still
   prints the URL + `opened: false`.
4. `refresh` signals the server (test: a flag/file flips after `refresh`).
5. `finalize` stops the server + cleans up the temp dir + `.grilling.json`
   entry (integration).
6. End-to-end interactive loop (integration, may be manual/smoke): start →
   add-question ×N → refresh → (SPA shows round) → submit answers → wait
   round-done unblocks → get → finalize.

### Interface contract (for slice 4)
The CLI surface (`start`, `update`, `get`, `refresh`, `wait`, `finalize`) is
now complete and stable. Slice 4 rewires skill prose to drive it; no code
contract beyond the subcommands' argv shapes (which slice 2 fixed).

---

## Slice 4 — skill-rewire (m, hitl)

Rewrites skill prose + wires Pi path protection. Human-in-the-loop: wording
benefits from review.

### Exports (edits, no new modules)
- `skills/grilling/SKILL.md` — rewritten to drive the CLI end-to-end
  (start → update → set-state + refresh → wait → get → recompute → … →
  final-review → wait accepted/rejected → finalize). NEVER mentions
  `.grilling.json` or the temp dir path; only the `--state <key>` handle.
- `skills/wayfinder/resources/grilling.md` — updated: a `type: grilling`
  task's execution drives the CLI; task body still states the decision etc.
- `src/pi.ts` — registers the resolved temp dir as a Pi-protected path
  (backstop to the skill's "don't touch the dir" instruction).

### Existing abstractions to use
- Pi's path-protection API (already protects `.env`, `node_modules/`).
  Inspect `src/pi.ts` and the Pi extension docs for the exact registration
  call before wiring.
- The CLI surface from slices 2-3.

### Do NOT reimplement
- Do not change the CLI. Do not change the grilling skill's core semantics
  (design tree, frontier, rounds, "facts are the agent's job", completion
  gate) — only the interaction mechanism.

### Seams (tested by tdd-worker)
1. Grep test: `skills/grilling/SKILL.md` and
   `skills/wayfinder/resources/grilling.md` contain NO occurrence of
   `.grilling.json`, `tmpdir`, or a temp-dir path pattern.
2. The skill text describes the full round loop using only the CLI surface
   (a structural test: assert it mentions `start`, `update`, `refresh`,
   `wait`, `get`, `finalize`).
3. `src/pi.ts` registers the temp dir as a protected path (assert the
   registration call is present with the resolved dir; if the API is not
   easily unit-testable, assert the call site exists via a focused test).

### Interface contract (for slice 5)
The skill now drives the CLI end-to-end. Slice 5's eval runs non-interactive
pi against this rewritten skill + a modified CLI (`wait` returns immediately).

---

## Slice 5 — eval-discover-update-set (m, afk)

The eval harness that discovers the full `update` set beyond the 6 bootstrap.

### Exports
- `scripts/grilling-cli/src/cli-eval.ts` (or a build flag) — the modified CLI
  where `wait` returns immediately with a "hand back to user" message
  (isolated via flag/entrypoint; the committed `.mjs` is unaffected).
- `scripts/eval/harness.ts` — `runScenario(scenario, cliPath)` → gap report;
  iterates per scenario until 2-clean-in-a-row (cap 5), escalates near cap.
- `scripts/eval/scenarios.ts` — 3 synthetic scenarios (trivial-to-moderate,
   ≤12 questions each).
- Recorded discovered commands written to
  `docs/tasks/build-grilling-visualizer/eval-results.md`.

### Existing abstractions to use
- The CLI surface (slices 2-3) + the rewritten skill (slice 4).
- Non-interactive pi invocation (the harness shells out to pi headless).

### Do NOT reimplement
- Do not modify the real committed `.mjs` for the eval; keep the modified
  `wait` isolated (flag/entrypoint).

### Seams (tested by tdd-worker)
1. `runScenario` parses the agent's end-of-run gap report correctly
   (parameterized over sample reports, including a silent one = non-convergence).
2. The harness iterates and converges: given a mock that reports gaps then
   clean-then-clean, it stops at 2-clean-in-a-row; given perpetual gaps, it
   caps at 5 and escalates.
3. The modified `wait` returns immediately and does not alter the real CLI
   behavior when the flag is absent.

### Interface contract
None (last slice). Output: `eval-results.md` (discovered commands) + the
updated CLI `update` surface + skill prose.
