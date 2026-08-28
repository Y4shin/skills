---
kind: task
type: feature
slug: build-grilling-visualizer
title: Grilling visualizer — detached CLI + browser SPA + skill rewire + eval
map: grilling-visualizer
status: ready
slices:
- bundler-subproject
- cli-core-and-state
- server-and-spa
- skill-rewire
- eval-discover-update-set
---

## User-visible outcome

A long grilling can be tracked visually. The agent drives a detached CLI
(`skills/grilling/grilling-cli.mjs`) via bash; the CLI manages a hidden JSON
state file in a random temp dir and a persistent local web server that serves a
Svelte SPA. The user sees a graph in their browser — rows = rounds, nodes =
questions (5-word ids), black/red/gray edges (dependency/contradiction/reference),
and an always-open free-form summary sidebar. The user answers in the browser
and submits a round at once (with a feedback field); the agent reads the answers
back via `get`, recomputes the frontier, and starts the next round. At the end,
`finalize` checks the coast is clear, stops the server, and emits a markdown
summary (sidebar + all questions & answers). The grilling SKILL.md and Wayfinder
`grilling.md` resource drive the CLI end-to-end, and an eval harness discovers
the full `update` command set beyond the 6 bootstrap commands.

## User story

As a user running a long grilling, I want a live visual graph of the design
tree in my browser, so I can see which questions are settled, which round is
current, what is upcoming/blocked, and the running summary — instead of losing
track as the chat grows. I answer in the browser per round and the agent
continues automatically.

## Scope boundaries

In scope:
- `./scripts` bundler subproject (Vite + plain Svelte 5, no SvelteKit;
  `vite-plugin-singlefile` + `assetsInlineLimit: Infinity`; own tsconfig) that
  emits a single committed `skills/grilling/grilling-cli.mjs` with the inlined
  SPA HTML embedded as a raw string.
- The CLI: `start | update <sub> | get | refresh | wait | finalize`, with
  bootstrap `update` subcommands add-question, add-edge, promote, set-state,
  set-summary, resolve-contradiction.
- The persistent detached HTTP server serving the inlined SPA + a state API,
  with xdg-open auto-open (all 3 platforms), `--no-open` flag, and stdout URL +
  "opened?" status.
- The Svelte SPA: graph (rows=rounds, 5-word id nodes, black/red/gray edges),
  an "upcoming" section for blocked questions, the always-open free-form
  summary sidebar, and per-round answer inputs + a feedback field.
- Rewiring `skills/grilling/SKILL.md` and `skills/wayfinder/resources/grilling.md`
  to drive the CLI end-to-end.
- The eval harness: 3 synthetic scenarios (≤12 questions), non-interactive pi,
  modified CLI (`wait` returns immediately), iterated per scenario until
  2-clean-in-a-row, cap 5 per scenario, escalate near cap.

Out of scope:
- Headless/non-TUI fallback (deferred; D4).
- Live SSE push transport (poll ~1-2s is sufficient).
- A `finalizing` intermediate page state.

## Acceptance criteria

- `scripts/` contains the bundler + TS source with its own tsconfig; running the
  build emits `skills/grilling/grilling-cli.mjs` (committed) that carries the
  inlined SPA HTML and works without a further build step.
- `grilling-cli.mjs start` creates a random temp dir (JSON + .pid), detaches a
  persistent server, prints the server URL + "opened?" to stdout, and auto-opens
  the browser via xdg-open unless `--no-open`.
- `update` subcommands (the 6 bootstrap) mutate the JSON safely (no mangling)
  and do NOT trigger a re-render; `refresh` signals the server to re-render via
  the .pid.
- `get` returns (subsets of) the state to the agent; the raw JSON path is never
  exposed to the agent (hidden via key indirection + Pi path protection + random
  path).
- The 7 page-states and their transitions are enforced by the CLI:
  view→in-round→round-done→{in-round|final-review→{accepted→done|rejected→in-round}}.
- `wait <state>` blocks the terminal until the page-state matches.
- `finalize` checks the coast is clear (empty frontier, all questions answered,
  no unresolved contradictions) and, if clear, stops the server and emits a
  markdown file containing the sidebar summary + all questions & answers.
- The Svelte SPA renders the graph with rows=rounds, 5-word-id nodes, the three
  edge colors/styles, an "upcoming" section, the summary sidebar, and per-round
  answer inputs + feedback field; submitting a round sets page-state=round-done.
- The grilling SKILL.md and wayfinder grilling.md resource drive the CLI
  end-to-end and never mention `.grilling.json` or the temp dir.
- The eval runs 3 synthetic scenarios, each iterated to 2-clean-in-a-row (cap 5
  per scenario), and records the discovered update commands.

## Existing abstractions to use

- `src/pi.ts` extension entry — for registering the state dir as a Pi-protected
  path (D7h). No new Pi tool is created (D1: detached CLI, not a tool).
- Pi's path-protection feature (already protects `.env`, `node_modules/`).
- The existing `scripts/` dir (currently only `release.sh`) as the home of the
  new bundler subproject.
- Vite + SvelteKit (bundleStrategy:'inline', available since SvelteKit v2.13.0)
  for single-file HTML output.
- `os.tmpdir()` for the random temp dir.

## Architecture and domain decisions

See the map's "Decisions so far" for the full 17-decision index. Load-bearing
ones for implementation:
- D6/D-FE: one artifact — the CLI `.mjs` carries the inlined SPA HTML; the
  detached server serves it at `/` and a state API (`GET /state`, `POST /submit`)
  for the SPA. No SvelteKit adapter/SSR/routing — one page, client-side.
- D7/D7h: the agent only ever holds the `--state <key>` string; the real dir is
  hidden.
- D9/D9t: the 7-state machine with CLI-enforced transitions is the loop's
  backbone.
- D8m/D8e: ship the 6 bootstrap `update` commands, then let the eval discover
  the rest — do not over-design the full set up front.

## Slice list

1. `bundler-subproject` (s) — `./scripts` Vite/SvelteKit bundler + own tsconfig;
   emits a committed `.mjs` with inlined HTML. Prefactoring; enables all later
   slices.
2. `cli-core-and-state` (m) — `start`/`get`/`wait`/`refresh` + hidden JSON state,
   random temp dir, .pid, the 7-state machine with enforced transitions; no
   server/SPA yet (drivable from bash). blocked_by: [bundler-subproject].
3. `server-and-spa` (l) — persistent detached HTTP server + inlined Svelte SPA
   (graph rows=rounds, 5-word ids, 3 edge styles, upcoming section, summary
   sidebar, per-round answer inputs + feedback field) + xdg-open auto-open.
   blocked_by: [cli-core-and-state].
4. `skill-rewire` (m) — rewrite grilling SKILL.md + wayfinder grilling.md to
   drive the CLI end-to-end; never mention the hidden files.
   blocked_by: [server-and-spa].
5. `eval-discover-update-set` (m) — 3 synthetic scenarios, modified CLI (wait
   returns immediately), non-interactive pi, iterated to 2-clean-in-a-row per
   scenario (cap 5), record discovered update commands.
   blocked_by: [skill-rewire].

## Implementation notes

- Slice 1 (bundler-subproject) landed — Vite+Svelte5 single-file pipeline,
  committed `skills/grilling/grilling-cli.mjs` with inlined HTML, `scripts/` has
  its own `tsconfig.json` (root `include` stays `src/**`). DevDeps pinned:
  `@sveltejs/vite-plugin-svelte@^3`, `vite-plugin-singlefile@^2`, `svelte@^5`
  (Vite 5.4.21 compat — the latest `vite-plugin-svelte@7` requires Vite 8, so
  v3 is used). The `.mjs` loads and runs with no further build step. Build
  driver is `scripts/build.ts` (two-step: SPA → inlined `index.html`, then
  CLI TS → `.mjs` with the HTML embedded via `?raw` import).
- Slice 2 (cli-core-and-state) landed — real CLI modules (state/key/transitions
  + start/get/update/refresh-stub/wait/finalize), 7-state machine enforced,
  drivable from bash, 450 tests green.
  IMPORTANT for slice 4 (skill-rewire): the `--state <key>` flag collided with
  `set-state --state <target>`, so the target values are POSITIONAL args:
  - `update set-state --state <key> <target-state>`   (positional, NOT `--state <target>`)
  - `update add-edge --state <key> --id <edge-id> --from <id> --to <id> --type <type>`   (includes `--id` for edge)
  - `wait --state <key> <target>`   (positional target)
  Also: `scripts/build.ts` now externals `node:*` builtins (needed for slice 3's
  `node:http` / `node:child_process`).
- Slice 3 (server-and-spa) landed — persistent detached HTTP server (node:http,
  no framework), real Svelte graph SPA (rows=rounds, 5-word ids, black/red/gray
  edges, upcoming section, summary sidebar, per-round answer inputs + feedback),
  xdg-open auto-open all 3 platforms + --no-open, refresh signals server via
  .pid, finalize stops server + cleans up. 483 tests green.
  Key fix: startServer calls child.unref() and index.ts main() calls process.exit(0)
  after start, so the parent node process exits deterministically (the detached
  server stays alive). Without this, spawnSync in integration tests hung forever.
  Interface contract for slice 4: CLI surface is complete & stable. Slice 4
  rewires skill prose to drive it. Note set-state target is positional:
  `update set-state --state <key> <target-state>`.
- Slice 4 (skill-rewire) landed — grilling SKILL.md + wayfinder grilling.md rewritten to drive the CLI end-to-end (start --open, update, set-state + refresh, wait, get, final-review, finalize); never mentions hidden files. src/pi.ts registers the grilling temp dir as a Pi-protected path (tool_call handler blocks write/edit into os.tmpdir()/grilling-* + .grilling.json). 46 skill-rewire tests + 528 full suite green.
  Browser-spawn footgun fix (folded in): open-browser.test.ts no longer calls the real openBrowser() (was spawning xdg-open -> real tabs every run); start default inverted to opt-in --open so bare start never opens a browser.
  Interface contract for slice 5: the skill drives the CLI end-to-end. Slice 5's eval runs non-interactive pi against this skill + a modified CLI (wait returns immediately).
- Slice 5 (eval-discover-update-set) landed — eval harness built (GRILLING_EVAL=1 flag: wait returns immediately, start forces noOpen; runScenario iterates to 2-clean-in-a-row, cap 5, escalate; 3 synthetic scenarios; strippedEnv removes DISPLAY/WAYLAND_DISPLAY). 38 unit tests green. Scenario A spike surfaced 5 missing commands, folded into the CLI + skill: update answer, update set-deps, update accept, update reject, top-level stop. Harness parse/convergence bugs fixed (require 'update' prefix; empty-missing + missing-ops section = converged). Final update surface: bootstrap 6 + answer/set-deps/accept/reject + stop. eval-results.md records it. All 5 slices landed; task complete.
- Slice 5 follow-up (eval re-runs + typeset) — the deferred live re-runs of scenarios A, B, C were completed. All 3 converge 2-clean-in-a-row on their first run with the 5 folded commands; B and C surfaced no new commands beyond the 5 from A, confirming the 11-command surface is complete. Harness gained a backward-compatible `--max-iterations` knob (the in-process loop is a non-determinism guard only — folding happens between separate runs, not within the loop) and a footgun fix so `--scenario`-filtered runs no longer clobber `eval-results.md`. The slice-1 Impeccable note was actioned: `/impeccable typeset` on `index.html` established base type roles (system-ui sans + monospace tokens, 1rem floor, line-height 1.5, light/dark color-scheme, description/theme-color meta) that survive the single-file inlining; `App.svelte` was already built out by slice 3 so its `shape` note was obsolete. 566 tests green; typecheck clean.
