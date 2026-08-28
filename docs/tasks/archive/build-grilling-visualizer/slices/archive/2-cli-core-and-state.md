---
kind: slice
slug: cli-core-and-state
title: "CLI core + hidden JSON state + 7-state machine: start/get/wait/refresh, drivable from bash"
task: ../task.md
mode: afk
status: done
size: m
blocked_by:
- bundler-subproject
---

# cli-core-and-state

## End-to-end behavior

The CLI core is implemented and drivable end-to-end from bash, WITHOUT the
server or SPA yet. `start` creates a random temp dir under `os.tmpdir()`,
writes the JSON state + a `.pid` file, sets page-state=`view`, prints the
temp dir path to stdout (for the human's benefit — the agent only ever holds
the `--state <key>`), and exits (no server to start in this slice). `get`
returns (subsets of) the state to the agent. `update` subcommands (the 6
bootstrap: add-question, add-edge, promote, set-state, set-summary,
resolve-contradiction) mutate the JSON safely and do NOT trigger a re-render.
`refresh` is a no-op stub in this slice (no server yet) but validates the
state dir. `wait <state>` blocks the terminal until the page-state matches the
target, reading the JSON. The 7 page-states and their transitions are enforced
by the CLI — only allowed transitions succeed (see D9t). `finalize` checks the
coast is clear (empty frontier, all questions answered, no unresolved
contradictions) and, if clear, emits a markdown file (sidebar summary + all
questions & answers) and returns; stopping a server is a no-op here (none
running).

The `--state <key>` indirection: `start` writes `.grilling.json` (mapping
key → real temp dir path) into the CWD; later subcommands take `--state <key>`
and resolve the real dir via that file. The real dir uses a random path under
`os.tmpdir()` to prevent collisions on parallel agents. The agent never learns
the real dir path through the CLI surface.

## Acceptance criteria

- `grilling-cli.mjs start` creates `${tmpdir()}/grilling-<random>/` containing
  `state.json` and `grilling.pid`, writes `.grilling.json` in CWD mapping the
  key to the real dir, sets page-state=`view`, prints the real dir to stdout,
  and exits 0.
- `grilling-cli.mjs --state <key> get` prints the state (or a requested subset)
  to stdout; the agent can use it without ever seeing the real dir path.
- The 6 `update` subcommands work and mutate `state.json` safely (atomic write
  — write to temp file then rename; no partial/mangled JSON on interrupt):
  - `add-question --id <5-word> --title --body --rec --round <n> --deps <ids>`
  - `add-edge --from <id> --to <id> --type dep|contra|ref`
  - `promote --id <id> --to-round <n>`
  - `set-state --state <one of 7>`
  - `set-summary --text "running summary"`
  - `resolve-contradiction --edge <id>`
- `update` writes do NOT trigger any re-render (no server yet; `refresh` is a
  stub that validates the state dir and exits).
- The 7-state machine is enforced: `set-state` rejects disallowed transitions
  with a clear error and non-zero exit. Allowed transitions:
  view→in-round→round-done→{in-round|final-review→{accepted→done|rejected→in-round}}.
- `wait <state>` blocks until the page-state matches, then exits 0; supports a
  `--timeout` option (default e.g. 30 min) that exits non-zero on timeout.
- `finalize` returns non-zero with a clear message if the coast is NOT clear
  (non-empty frontier, unanswered questions, or unresolved contradictions); if
  clear, emits `<slug>-grilling-summary.md` (sidebar summary + all questions &
  answers rendered to markdown) and exits 0.
- `.grilling.json` and the real dir path are never printed by `get` or `update`;
  only `start` prints the real dir (for the human).

## Test plan

### Seams
- The JSON state schema (page-state, questions[], edges[], summary, rounds) is
  defined here and consumed by later slices (server/SPA, eval).
- `--state <key>` resolution + the `.grilling.json` map file format.
- Atomic JSON writes (temp file + rename) to avoid mangling.

### Failure modes
- Disallowed state transition: `set-state --state done` from `view` must fail
  with a clear error and non-zero exit.
- Missing/invalid `--state <key>`: clear error, non-zero exit, no file writes.
- Corrupt or concurrent `.grilling.json`: detect and error cleanly (do not
  silently overwrite).
- `wait` timeout: exits non-zero with a clear message, does not hang forever.
- `finalize` with unresolved contradictions: non-zero, clear message naming the
  unresolved edge ids.

### Scenarios
- Full bash-driven loop without a server: `start` → `add-question` (×N) →
  `add-edge` → `promote` → `set-state in-round` → (simulate user: edit JSON
  answers directly or via a test helper) → `set-state round-done` → `get` shows
  answers → recompute → next round → ... → `finalize` emits markdown.
- Two parallel `start`s produce two distinct random dirs and two `.grilling.json`
  entries (or two CWDs) — no collision.
- `get` with subset args returns only the requested fields (e.g. `get answers`,
  `get frontier`, `get summary`).

### Edge cases
- Empty grilling: `finalize` immediately on a fresh state — should it be
  "coast clear" (trivially empty) or "nothing to finalize"? Decide: an empty
  grilling is NOT clear (no decisions reached); `finalize` returns non-zero
  with "no questions resolved".
- 5-word id collisions: `add-question` with a duplicate id fails with a clear
  error.
- `add-edge` referencing unknown node ids fails with a clear error.

## Constraints and dependencies

- D1/D2/D7/D7h/D8m/D9/D9t/D-end.
- blocked_by: bundler-subproject (needs the committed `.mjs` build target).
- Pi path protection for the real temp dir is wired in a later slice
  (skill-rewire) once the skill references the CLI; here we only implement the
  hiding mechanics (key indirection + random path).
- Does NOT include the server, SPA, xdg-open, or skill rewire — those are later
  slices. `refresh` is a no-op stub here.
