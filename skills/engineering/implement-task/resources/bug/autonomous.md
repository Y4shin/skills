# Implement Task (bug path)

Implements one bug ticket through a lean chain: no architecture spec
conversation, no dependency levels, no coherence refactor, no deviation
reporting step. The spec fed to the chain is the bug doc and its
reproduction, both referenced from the ticket body, plus the ticket doc.

## Step 0  --  Prerequisites

The ticket resolves through the resolver (a slug or a path, both tree shapes);
the ticket document lives at
`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`. The bug doc (under
`docs/bugs/`) and the reproduction are referenced from the ticket body: the
old bug frontmatter field is dead, the reference moved into the body.

```
const effortSlug = "<effort-slug>"
const ticketPath = `docs/tasks/${effortSlug}/tickets/${ticketSlug}/ticket.md`
// Read the ticket body for the bug doc path and the reproduction path.
const bugPath = <from the ticket body>
const reproPath = <from the ticket body>
```

## Step 1  --  Single chain dispatch

Run one sequential chain that shares the repo working directory:
`tdd-worker → slice-verifier → land-worker`, with an ok-gate blocking landing
on verify. Point the state file at the ticket before the chain runs:
`tw_state_set task <ticket-slug>`.

> **Async dispatch (hard rule):** launch this chain with `async: true`. Never
> run a blocking/foreground subagent. After dispatching, call `wait({ id })` to
> receive the result while keeping the turn alive; the run is then tracked,
> interruptible, and steerable.

```
// Budgets come from the ticket's size; absent means m, never an error.
size = tw_get(ticketPath, "size") || "m"
budgetMinutes = { s: 15, m: 30, l: 45, xl: 60 }
const timeoutMs = (budgetMinutes[size] || budgetMinutes.m) * 60 * 1000

runId = subagent({
    async: true,
    workflowScript: (runs) => {
        // Step 1: tdd-worker fixes the bug on ticket/<ticket-slug>.
        runs.run({
            agent: "tdd-worker",
            as: "tdd",
            output: `tdd-${ticket}/result.md`,
            skill: "diagnosing-bugs",
            task: `Implement ticket "${ticket}" for bug effort "${effortSlug}".

You are on a \`subtype: bug\` ticket; consult the \`/diagnosing-bugs\` skill for
the 6-phase debugging discipline (Phase 1 non-skippable; others skippable with
a recorded reason).

Bug doc: ${bugPath}
Reproduction: ${reproPath}
Ticket doc: ${ticketPath}

Before writing code:
1. Read the bug doc, the reproduction, and the ticket doc.
2. Read the existing source files referenced by the bug.
3. Read the standards files directly (AGENTS.md, CONTEXT.md, docs/standards.md,
   docs/testing.md).
4. Commit after each GREEN (checkpoint).

First, convert the reproduction into a regression test that is RED against the
unfixed code (the test rule), then make it GREEN, then run the full suite.`,
            timeoutMs
        });
        // Step 2: verify; the ok-gate blocks landing on it.
        const verify = runs.run({
            agent: "slice-verifier",
            as: "verify",
            output: `verify-${ticket}/result.md`,
            task: `Verify ticket "${ticket}".
Implementation: {outputs.tdd}.
Run lint and tests. Block on failure.`,
            timeoutMs
        });
        if (verify.ok) {
            runs.run({
                agent: "land-worker",
                as: "land",
                output: `land-${ticket}/result.md`,
                task: `Land ticket "${ticket}" for effort "${effortSlug}".
Ticket doc: ${ticketPath}
TDD output: {outputs.tdd}. Verify output: {outputs.verify}.

Merge ticket/${ticket} into task/${ticket} with --no-ff, delete the working
branch, append the implementation note to the ticket doc, commit.`,
                timeoutMs
            });
        }
    }
})

// No independent work between dispatch and result  --  block for the chain.
// wait() keeps the turn alive for notifications and keeps the run steerable.
wait({ id: runId })
```

The ticket's `workflow_state` is NOT marked here: finalize-task owns the
marking, one owner.

## Code review (advisory)

After the ticket lands, run a two-axis code review over the bug-fix diff before finalizing. The review is advisory  --  it does not gate landing or finalize.

```js
reviewId = subagent({
  async: true,
  agent: "code-reviewer",
  skill: "code-review",
  as: "review",
  output: "review/result.md",
  task: `Review the bug-fix diff for ticket ${ticket}. Fixed point: the starting branch. Spec source: the bug doc plus its reproduction. Report Standards + Spec findings side by side.`
})

wait({ id: reviewId })
```

Read `review/result.md` and surface the findings to the user.

## Step 2  --  Report

Report the landed ticket, the regression test added, and any user interventions.

"If the ticket is done: run `/skill:finalize-task <ticket-slug>`" (finalize
marks the ticket's `workflow_state`).

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first**  --  read worker outputs and any partial diff. A budget-exhausted tdd-worker attempt is the preferred diagnostic; its findings seed the sub-ticket breakdown. Never blindly redo.
2. **First failure → split**  --  split the ticket into sub-tickets registered
   in the effort (the split rules in the feature pipeline's failure toolbelt
   apply here too). Exception: if the ticket is already atomic, skip to retry.
3. **Second attempt → retry +50%**  --  re-run the chain with timeoutMs increased by 50% and the diagnosis/fix instructions in the prompt.
4. **Backstop → escalate**  --  after two consecutive retries still fail, ask the user: "Two retries for ticket {ticket} failed. Should I increase budgets further, relax constraints, or skip this ticket?"

Hard rule: the parent context is large and expensive; routing through workers is always cheaper than pulling the fix into the parent. The parent never writes code or edits files as a fix.

Each toolbelt step is a designed-for adjustment, not a snag  --  but record
which one fired so its frequency can be correlated. Each time you take a
toolbelt action, call `submit_feedback({ kind: "expected", data })` with `data`
naming the step, e.g. `"bug: split ticket <slug> after first failure"` or
`"bug: retry +50% on ticket <slug>"` or `"bug: escalate ticket <slug> (two
retries failed)"`. One call per action, right when you take it.

## Workflow feedback

When the *workflow itself* snags  --  the bug chain failing for a workflow reason,
a reproduction that didn't line up with the ticket doc, a regression test the test rule
made hard to write, or something that worked notably well  --  call
`submit_feedback({ kind, data })` autonomously to record it. `kind` is a
short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
two specific, actionable sentences about the *workflow*, not the bug. The
tdd-worker, slice-verifier, and land-worker agents also call this tool
themselves; you don't need to relay their friction, only record what you
observe at the orchestration level. Requires the `pi-telemetry`
extension (`submit_feedback` tool).
