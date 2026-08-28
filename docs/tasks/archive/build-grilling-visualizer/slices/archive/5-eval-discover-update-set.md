---
kind: slice
slug: eval-discover-update-set
title: "Eval harness: 3 synthetic scenarios discover the full update command set"
task: ../task.md
mode: afk
status: done
size: m
blocked_by:
- skill-rewire
---

# eval-discover-update-set

## End-to-end behavior

An eval harness runs non-interactive pi on a grilling task using a MODIFIED CLI
whose `wait` returns immediately (instead of blocking) and tells the agent to
hand back to the user. The agent grills a synthetic subject, interacts with the
CLI, and at the end reports what was missing in its interaction with the CLI —
i.e. which `update` operations it needed but did not exist. This discovers the
full `update` command set beyond the 6 bootstrap commands.

There are 3 synthetic scenarios, each a trivial-to-moderate subject that does
not exceed 12 questions. Per scenario, the eval iterates: run → collect reported
gaps → add the missing commands → re-run, until the agent reports no missing
commands 2 times in a row (convergence), capped at 5 iterations per scenario.
If the iteration count is about to exceed the cap, escalate to the user before
exceeding. Discovered commands are recorded.

## Acceptance criteria

- A modified CLI build/branch where `wait` returns immediately with a message
  telling the agent to hand back to the user (simulating non-interactive mode)
  is available for the eval.
- 3 synthetic grilling scenarios are defined, each trivial-to-moderate and
  ≤12 questions, written down in the slice/task artifacts.
- The harness runs non-interactive pi on each scenario, captures the agent's
  end-of-run report of missing CLI operations, and logs the reported gaps.
- Per scenario, the harness iterates: add the reported missing commands to the
  CLI, re-run, until the agent reports no missing commands 2 runs in a row
  (convergence), capped at 5 iterations.
- If an iteration is about to exceed the cap (i.e. the 5th did not converge),
  the harness stops and escalates to the user with the scenario + last gaps
  before proceeding.
- The discovered `update` commands (beyond the 6 bootstrap) are recorded in the
  task/slice artifacts and added to the CLI + skill prose.
- The final CLI `update` surface is documented (bootstrap 6 + discovered).

## Test plan

### Seams
- The modified `wait` (returns immediately) is the eval's instrument; it must
  be a build flag or a separate entrypoint, not a destructive change to the real
  CLI.
- The gap-reporting contract: the agent must be prompted/trained to report
  missing CLI operations at the end of the run (e.g. a final instruction in
  the eval task: "report any CLI operations you needed but did not exist").
- The harness is deterministic enough to re-run: same scenario + current CLI
  command set → comparable gap report.

### Failure modes
- Agent does not report gaps (just struggles silently): the eval task prompt
  must explicitly ask for the missing-operations report; if still silent, that
  scenario is a non-convergence and counts toward the cap.
- Agent reports a gap that is actually covered by an existing command (false
  positive): a human triages before adding; do not blindly add.
- Non-convergence at the cap: escalate to the user with the scenario + last
  gaps; do not silently loop forever.
- The modified `wait` breaks the real CLI: keep the modification isolated
  (flag/entrypoint) so the committed `.mjs` is unaffected.

### Scenarios
- Scenario A (trivial, ~3-5 questions): a simple either/or decision with one
  dependency.
- Scenario B (moderate, ~6-9 questions): a decision with 2-3 rounds, a
  contradiction, and a reference edge.
- Scenario C (moderate, ~9-12 questions): a decision with multiple
  dependencies, a contradiction that must be resolved, and a rejected
  final-review that resumes `in-round`.
- Each scenario: run, collect gaps, iterate to 2-clean-in-a-row (cap 5),
  record discovered commands.

### Edge cases
- A scenario converges immediately (0 gaps on first run): counts as 1 of the
  2-clean-in-a-row; run once more to confirm.
- A scenario oscillates (reports gap X, then on re-run reports gap Y that
  was previously covered): counts as non-convergence; do not count toward
  2-clean-in-a-row.
- Discovered command overlaps an existing one under a different name: triage
  and name it consistently; do not duplicate.

## Constraints and dependencies

- D8e (iterated; 3 scenarios; 2-clean-in-a-row; cap 5; escalate), D8e-subject
  (synthetic ≤12 questions), D8m (bootstrap 6), D8x (full set discovered here).
- blocked_by: skill-rewire (the agent must be driving the CLI via the skill to
  discover real gaps).
- The eval uses non-interactive pi; the modified `wait` is the key instrument.
- This is the LAST slice; its output (discovered commands) is folded back into
  the CLI + skill prose, and the final update surface is documented.
