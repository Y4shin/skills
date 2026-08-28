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
gaps are structural and surface in every headless/agent-driven run.

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

Each scenario was run with `--max-iterations 2` (2-clean-in-a-row against the
fixed harness, with the 5 discovered commands already folded into the CLI +
skill). The folding happens **between** runs, not within the in-process loop:
the loop is only a non-determinism guard ("does the agent report clean twice
in a row against the same prompt").

### Scenario A: Simple either/or with one dependency
- **Subject:** A simple either/or decision: should the project use a monorepo
  or a polyrepo? One dependent question: given that choice, what package
  manager should we use?
- **Max questions:** 5
- **Iterations:** 2
- **Converged:** yes (2-clean-in-a-row on the first run — no folding needed)
- **Gaps found:** none. Both iterations used the folded commands (`answer`,
  `accept`) and reported "No missing operations."

### Scenario B: Moderate — 2-3 rounds, a contradiction, a reference edge
- **Subject:** A moderate decision: choosing a deployment strategy for a web
  app. 2-3 rounds of questions. One contradiction (two answers that conflict).
  One reference edge (a question that references another without depending
  on it).
- **Max questions:** 9
- **Iterations:** 2
- **Converged:** yes (2-clean-in-a-row on the first run — no folding needed)
- **Gaps found:** none. Both iterations used the folded commands (`set-deps`,
  `resolve-contradiction`, `answer`, `accept`) and reported "No missing
  operations."

### Scenario C: Moderate — multiple deps, contradiction resolved, rejected final-review resumes in-round
- **Subject:** A moderate decision: designing the data layer for a SaaS app.
  Multiple dependencies between questions. A contradiction that must be
  resolved. A final-review that is rejected, causing a resume in-round to
  address the gap, then re-reach final-review.
- **Max questions:** 12
- **Iterations:** 2
- **Converged:** yes (2-clean-in-a-row on the first run — no folding needed)
- **Gaps found:** none. Both iterations exercised the full rejection/resume
  flow (`reject --feedback` → resume in-round → `accept`) plus `answer`,
  `set-deps`, `resolve-contradiction`, and reported "No missing operations."
- **Minor observation (not a missing op):** `add-question` errors on
  duplicate IDs but the message is quiet (no output shown for success cases;
  the duplicate error appeared only via the frontier read). Recorded for later,
  not folded.

## Verdict

All 3 scenarios converge with the **bootstrap 6 + 5 discovered = 11-command**
surface. No further commands surfaced from B or C beyond the 5 already folded
from A. The eval confirms the folded command set is complete for the grilling
round loop, contradiction resolution, and the final-review reject/resume flow.
