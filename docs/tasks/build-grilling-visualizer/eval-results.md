# Eval Results — Discovered Update Command Set

This file records the results of running the eval harness to discover the
full `update` command set beyond the 6 bootstrap commands.

## Bootstrap 6 (pre-existing)

| Command | Purpose |
|---------|---------|
| add-question | Add a question to the graph |
| add-edge | Add a dependency/contradiction/reference edge |
| promote | Move a question to a later round |
| set-state | Transition the page state (enforces 7-state machine) |
| set-summary | Update the running summary sidebar |
| resolve-contradiction | Mark a contradiction edge as resolved |

## Discovered Commands (folded into the CLI + skill)

Discovered by running scenario A of the eval harness (non-interactive pi,
deepseek-v4-flash, GRILLING_EVAL=1 so `wait` returns immediately). The same
gaps are structural and would surface in B and C (they are needed in every
headless/agent-driven run). See HANDOFF-eval-reruns.md for the deferred B and C
re-runs that confirm 2-clean-in-a-row convergence.

| Command | Purpose | Why it was needed |
|---------|---------|-------------------|
| `update answer` | Record a user's answer (`--id <qid> --value <text>`); sets the answer, marks the question answered, and transitions `in-round → round-done` | Answers previously only entered via the browser's `POST /submit`. A headless/eval driver had to curl `/submit` to advance the state machine. |
| `update set-deps` | Rewrite a question's dependency list (`--id <qid> --deps <ids>`) | `add-question` stores `--deps` verbatim while normalizing the id to a slug, which can poison the frontier; there was no fix command. |
| `update accept` | Record the final-review acceptance (transitions `final-review → accepted`) | The human verdict had no CLI analogue; the agent had to `set-state accepted` as a workaround. |
| `update reject` | Record the final-review rejection with feedback (`--feedback <text>`); transitions `final-review → rejected → in-round` | Same as accept; plus the rejection feedback had nowhere to go. |
| `stop` | Stop the server + clean up the key entry (top-level command) | There was no explicit teardown; the driver had to `pkill` the CLI process. |

### UX nit (not folded — recorded for later)
- `start` prints the server URL + `opened: <bool>` but the `--state <key>` only
  via `.grilling.json`. A headless caller must parse the key out of the map
  file. Printing `state: <key>` directly on `start` would remove that friction.
  (Deferred — the skill hides `.grilling.json` by design; printing the key on
  stdout would need a separate consideration of the hiding contract.)

## Final Update Surface

Bootstrap 6 + discovered = the full `update` command set:

- `add-question`
- `add-edge`
- `promote`
- `set-state`
- `set-summary`
- `resolve-contradiction`
- `answer` (discovered)
- `set-deps` (discovered)
- `accept` (discovered)
- `reject` (discovered)

Top-level: `start`, `update`, `get`, `refresh`, `wait`, `stop` (discovered),
`finalize`.

## Per-Scenario Results

### Scenario A: Simple either/or with one dependency
- **Subject:** A simple either/or decision: should the project use a monorepo
  or a polyrepo? One dependent question: given that choice, what package
  manager should we use?
- **Max questions:** 5
- **Iterations run:** 5
- **Converged:** no (escalated at the cap — the harness had a parse/convergence
  bug that has since been fixed: `parseGapReport` required the `update` prefix
  to avoid false-positives like "R1", and an empty-missing report with a
  missing-ops section now counts as converged). The discoveries above are
  stable across the iterations that reported gaps.
- **Gaps found:** `answer`, `set-deps`, `accept`/`reject`, `stop` (see table).

### Scenario B: Moderate — 2-3 rounds, a contradiction, a reference edge
- **Status:** deferred — see HANDOFF-eval-reruns.md.

### Scenario C: Moderate — multiple deps, contradiction resolved, rejected final-review resumes in-round
- **Status:** deferred — see HANDOFF-eval-reruns.md.
