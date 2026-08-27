---
kind: map
slug: grilling-visualizer
title: Grilling visualizer — a detached CLI + browser SPA for tracking long grillings
status: active
tasks:
- slug: build-grilling-visualizer
  blocked_by: []
  done: false
---

## Destination

A grilling visualizer: a detached CLI the agent drives via bash, backed by a
hidden JSON state file and a persistent local web server, rendering an
interactive Svelte graph in the user's browser so a long grilling can be
tracked without losing state. The user answers in the browser; the agent reads
answers back through the CLI. When the coast is clear, `finalize` emits a
markdown summary. The grilling SKILL.md and Wayfinder `grilling.md` resource are
rewired to drive the CLI end-to-end, and an eval harness discovers the full
`update` command set.

## Constraints

- Works on all 3 platforms (xdg-open auto-open must work on Linux/macOS/Windows).
- The agent must never see the raw JSON or the temp dir path — hidden via key
  indirection (`--state <key>` → `.grilling.json` in CWD → random temp dir), Pi
  path protection, and a random temp path.
- The `.grilling.json` filename is never mentioned in the skill prose.
- CLI state transitions are enforced — only allowed transitions succeed.
- The committed `skills/grilling/grilling-cli.mjs` must work without a build
  step in normal use; the bundler is run by maintainers.
- Grilling is always interactive; headless/non-TUI behavior is out of scope for
  now (fix later if it becomes real).

## Decisions so far

- D1 architecture = detached CLI via bash; no blocking Pi tool.
- D2 state-ownership = JSON in temp dir; agent writes via `update`, reads via
  `get`; JSON hidden from agent.
- D3 edge-types = dependency (black), contradiction (red), reference (gray
  dashed).
- D4 headless = out of scope for now.
- D5 server-lifecycle = persistent across the whole grilling session.
- D6 bundler = Vite + plain Svelte 5 (no SvelteKit), single inlined HTML via
  `vite-plugin-singlefile` + `assetsInlineLimit: Infinity` → one artifact (the
  CLI carries the inlined SPA).
- D-FE UI architecture = Svelte SPA (no meta-framework) inlined as single HTML
  into the CLI; the CLI's Node server serves it at `/` + a state API. No
  `+server.ts`, no adapter, no SSR — one page, client-side, fetch()es same-origin.
- D13 svelte-flavor = plain Svelte + Vite, NOT SvelteKit (one-page client SPA,
  our own Node API; the meta-framework's adapter/routing/SSR are unneeded).
- D7 cli-handle = `--state <key>` → `.grilling.json` in CWD → random temp dir,
  hidden from agent.
- D7h hiding = not mentioned in skill + Pi path protection + random path.
- D8m update-bootstrap = 6: add-question, add-edge, promote, set-state,
  set-summary, resolve-contradiction.
- D8e eval = iterated; 3 scenarios; per scenario: 2-clean-in-a-row to converge,
  cap 5, escalate if near cap.
- D8e-subject = synthetic trivial-to-moderate, ≤12 questions each.
- D9 page-state-set = 7: view / in-round / round-done / final-review / accepted /
  rejected / done.
- D9t transitions = view→in-round→round-done→{in-round|final-review→{accepted→done|rejected→in-round}}.
- D9s summary sidebar = free-form markdown (LLM-maintained via set-summary) +
  rejection feedback field.
- D11 browser-open = auto-open via xdg-open (all 3 platforms) + stdout URL +
  "opened?" flag + `--no-open` flag.
- D12 scope = everything: bundler + CLI + .mjs + skill rewire + eval.
- D-FE UI architecture = Svelte SPA (no meta-framework) inlined as single HTML
  into the CLI (one artifact). [superseded by D13 detail above]
- D6s scripts/ structure = src in `scripts/`, emit committed
  `skills/grilling/grilling-cli.mjs`; own tsconfig (kept out of root `src/**`
  include).
- D-end final artifact = sidebar summary + all questions & answers → markdown
  at finalize.

## Fog

- `.grilling.json` exact schema/location — resolves during implementation.
- `refresh`→server signaling (SIGHUP vs file touch) — implementation detail.
- SPA update transport (poll ~1-2s vs SSE) — implementation detail; round
  cadence makes polling fine.
- 5-word id representation (slug vs free text) — minor.
- D8x full update set — discovered by the eval at execution time, not a
  planning decision.

## Out of scope

- Headless / non-TUI fallback (D4) — deferred until grilling-in-headless becomes
  real.
- A live SSE push transport — polling ~1-2s is sufficient for round cadence.
- A `finalizing` intermediate page state — `finalize` is a CLI call, not a page
  state.
