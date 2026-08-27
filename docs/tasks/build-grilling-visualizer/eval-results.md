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

## Discovered Commands

The eval harness has not yet been run against live non-interactive pi. The
discovered commands will be recorded here after running:

```bash
npx vite-node scripts/eval/main.ts
```

The harness runs 3 synthetic scenarios (A, B, C), each iterated to
2-clean-in-a-row (cap 5 per scenario). Discovered commands are folded back
into the CLI (`scripts/grilling-cli/src/commands/update.ts`) and the skill
prose (`skills/grilling/SKILL.md`).

## Final Update Surface

Bootstrap 6 (discovered commands will be appended after the eval runs):

- `add-question`
- `add-edge`
- `promote`
- `set-state`
- `set-summary`
- `resolve-contradiction`

## Per-Scenario Results

### Scenario A: Simple either/or with one dependency

- **Subject:** A simple either/or decision: should the project use a monorepo or a polyrepo? One dependent question: given that choice, what package manager should we use?
- **Max questions:** 5
- **Status:** not yet run

### Scenario B: Moderate: 2-3 rounds, a contradiction, a reference edge

- **Subject:** A moderate decision: choosing a deployment strategy for a web app. 2-3 rounds of questions. One contradiction (two answers that conflict). One reference edge (a question that references another without depending on it).
- **Max questions:** 9
- **Status:** not yet run

### Scenario C: Moderate: multiple deps, contradiction resolved, rejected final-review resumes in-round

- **Subject:** A moderate decision: designing the data layer for a SaaS app. Multiple dependencies between questions. A contradiction that must be resolved. A final-review that is rejected, causing a resume in-round to address the gap, then re-reach final-review.
- **Max questions:** 12
- **Status:** not yet run
