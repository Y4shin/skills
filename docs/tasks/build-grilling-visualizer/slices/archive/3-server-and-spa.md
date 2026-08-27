---
kind: slice
slug: server-and-spa
title: Persistent detached HTTP server + inlined Svelte SPA + xdg-open auto-open
task: ../task.md
mode: afk
status: done
size: l
blocked_by:
- cli-core-and-state
---

# server-and-spa

## End-to-end behavior

`start` now actually starts a persistent, detached HTTP server (the `.pid`
from the previous slice becomes real) that serves the inlined Svelte SPA at
`/` and a state API the SPA polls (~1-2s). The SPA renders the graph: rows =
rounds, nodes = questions (5-word ids), edges in three styles — dependency
(black solid), contradiction (red solid), reference (gray dashed) — and an
"upcoming" section at the bottom for blocked questions. An always-open free-form
summary sidebar (LLM-maintained via `set-summary`) is visible. In `in-round`
state, each current-round node has an answer input; a single "Send all answers"
button + a free-text feedback field submits the round, writing answers into the
JSON and setting page-state=`round-done`. `start` auto-opens the browser via
xdg-open (Linux/macOS/Windows) unless `--no-open` is passed, and always prints
the server URL + whether the browser was opened to stdout. `refresh` now really
signals the server (via the `.pid`) to re-render / push the current JSON to the
SPA. The server is persistent across the whole grilling session (not per-round)
and lives until `finalize` stops it.

## Acceptance criteria

- `grilling-cli.mjs start` starts a detached HTTP server on an auto-picked free
  port, writes the real `.pid` (server process), sets page-state=`view`, prints
  `<url>\nopened: <true|false>` to stdout, and auto-opens the browser via
  xdg-open unless `--no-open`.
- xdg-open invocation works on Linux (`xdg-open`), macOS (`open`), and Windows
  (`start`); detected via `process.platform`.
- The server serves the inlined SPA HTML at `GET /` and a state API:
  - `GET /state` returns the current JSON state for the SPA to render.
  - `POST /submit` accepts the round's answers + feedback, writes them into the
    JSON (atomic), and sets page-state=`round-done`.
- The SPA polls `GET /state` (~1-2s) and re-renders; it does not require SSE.
- The SPA renders: rounds as rows, current-round questions as answerable nodes
  (in `in-round`), 5-word ids as node labels, edges in the three styles with a
  legend, an "upcoming" section listing blocked questions with their blockers,
  and the always-open free-form summary sidebar.
- Submitting a round in the SPA writes answers + feedback and transitions
  page-state to `round-done`; `wait round-done` (run by the agent) then unblocks.
- `refresh` signals the server (via `.pid`) to push the current JSON to
  connected SPAs (or force a re-read); subsequent SPA polls reflect the new
  state.
- The server is persistent: it survives across rounds (no restart per round)
  and is stopped by `finalize` (or on `start` of a new grilling's explicit
  teardown).
- The server cleans up on `finalize`: stops the process, removes the temp dir
  and `.grilling.json` entry.

## Test plan

### Seams
- The state API contract (`GET /state`, `POST /submit`) — consumed by the SPA
  and by the eval-modified CLI in the next slice.
- `refresh`→server signaling mechanism (SIGHUP to the `.pid` process, or a file
  touch the server watches) — implementation detail (D-Fog), pick one.
- Port picking: bind to port 0, read the assigned port, write it into the
  state/`.grilling.json`.

### Failure modes
- Port already in use: `start` should auto-pick a free port (bind 0), not fail.
- xdg-open missing or fails: `start` must still print the URL and `opened:
  false`, and exit 0 (not crash).
- SPA open during `view` (not `in-round`): answer inputs are disabled/hidden;
  only the graph + summary render.
- Submit with empty answers: allowed (user may submit a round with no answers,
  e.g. to signal "skip") — sets `round-done` with empty answers.
- Server crash mid-session: `wait` should eventually time out rather than hang;
  `finalize` should detect the dead `.pid` and clean up.
- Browser refresh / reconnect: the SPA polls, so a refresh just resumes polling
  — no SSE reconnect logic needed.

### Scenarios
- Full interactive loop: `start` (browser opens) → agent `add-question`×N →
  `refresh` → SPA shows round 1 → user types answers + feedback → "Send all
  answers" → `wait round-done` unblocks → agent `get` answers → recompute →
  `set-state in-round` + `refresh` → next round … → `finalize`.
- `--no-open` mode: `start --no-open` prints the URL + `opened: false`, no
  browser launched; user opens manually.
- Cross-platform xdg-open: simulate/verify the platform branch for
  linux/mac/win (at minimum, the correct binary is selected per
  `process.platform`).

### Edge cases
- Large graph (12 questions, ~20 edges): SPA remains responsive; polling
  ~1-2s is acceptable.
- Summary sidebar updates: after `set-summary` + `refresh`, the SPA shows the
  new summary on the next poll.
- "upcoming" section: a question whose `--deps` are not all answered appears in
  upcoming, not in a round row.
- Two SPAs open (two tabs): both poll the same state; a submit from one
  transitions state, the other reflects it on next poll (no double-submit
  protection needed beyond state-transition enforcement).

## Constraints and dependencies

- D1/D5/D6/D-FE/D11/D9/D9s/D9t.
- blocked_by: cli-core-and-state (needs the state machine + JSON + `wait`).
- The SPA is built by the bundler-subproject's Vite + plain Svelte 5 pipeline
  and inlined into the `.mjs`; this slice implements the real Svelte page(s) and
  the server that serves them.
- Polling transport only (no SSE) per D-out-of-scope.
- Does NOT rewire the skill or run the eval — those are the next two slices.
