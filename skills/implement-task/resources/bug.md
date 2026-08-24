# Implement Task (bug path)

Implements the single slice of a bug task. The chain is lean: no architecture spec conversation, no dependency levels, no coherence refactor, no deviation-reporter. The spec fed to the chain is the bug doc, its `repro.md`, and the slice doc.

## Step 0 — Prerequisites

Bug task doc exists with `type: bug`, `bug: <slug>`, and a `slices:` list. The slice doc is at `docs/tasks/${taskSlug}/slices/<n>-${slice}.md`. The bug doc lives at `docs/bugs/${bugSlug}.md` and the reproduction at
`docs/tasks/${taskSlug}/repro.md` (promotion moved it next to `task.md`).

```
const taskSlug = "<task-slug>"
const taskPath = `docs/tasks/${taskSlug}/task.md`
const bugSlug = task_get(taskPath, "bug")
const bugPath = `docs/bugs/${bugSlug}.md`
const reproPath = `docs/tasks/${taskSlug}/repro.md`
const slice = task_slices(taskSlug)[0]
```

## Step 1 — Single chain dispatch

Run one sequential chain that shares the repo working directory: `tdd-worker → slice-verifier → land-worker`.

> **Async dispatch (hard rule):** launch this chain with `async: true`. Never
> run a blocking/foreground subagent. After dispatching, call `wait({ id })` to
> receive the result while keeping the turn alive; the run is then tracked,
> interruptible, and steerable.

```
size = task_get(<slice-path>, "size")
budgets = { s: [15, 120], m: [30, 300], l: [60, 600], xl: [90, 1200] }
[maxTurns, timeoutMs] = budgets[size] || budgets.m

runId = subagent({
    async: true,
    chain: [
        {
            agent: "tdd-worker",
            as: "tdd",
            output: `tdd-${slice}/result.md`,
            skill: "tdd",
            task: `Implement slice "${slice}" for bug task "${taskSlug}".

Bug doc: ${bugPath}
Reproduction: ${reproPath}
Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Task doc: ${taskPath}

Before writing code:
1. Read the bug doc, repro.md, and slice doc.
2. Read the existing source files referenced by the bug.
3. Call get_guidelines for relevant languages.
4. Commit after each GREEN (checkpoint).

First, convert repro.md into a regression test that is RED against the unfixed code (the test rule), then make it GREEN, then run the full suite.`,
            turnBudget: { maxTurns, graceTurns: Math.ceil(maxTurns / 6) }
        },
        {
            agent: "slice-verifier",
            as: "verify",
            output: `verify-${slice}/result.md`,
            task: `Verify slice "${slice}".
Implementation: {outputs.tdd}.
Run lint and tests. Block on failure.`,
            timeoutMs
        },
        {
            agent: "land-worker",
            as: "land",
            output: `land-${slice}/result.md`,
            task: `Land slice "${slice}" for bug task "${taskSlug}".
Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Task doc: ${taskPath}
TDD output: {outputs.tdd}. Verify output: {outputs.verify}.

Merge the slice branch into the task branch, archive the slice doc, commit.
Set task_set status done on slice.`
        }
    ],
    failFast: true
})
```

// No independent work between dispatch and result — block for the chain.
// wait() keeps the turn alive for notifications and keeps the run steerable.
wait({ id: runId })

## Step 2 — Report

Report the landed slice, the regression test added, and any user interventions.

"If all slices done: run `/skill:finalize-task <slug>`"

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first** — read worker outputs and any partial diff. A budget-exhausted tdd-worker attempt is the preferred diagnostic; its findings seed the sub-slice breakdown. Never blindly redo.
2. **First failure → split** — always split slice N into ad-hoc sub-slices Na, Nb, Nc (`slices/<N>a-<slug>.md`, conforming, chained via `blocked_by`; update the task doc `slices:` list; mark slice N `status: split`). Exception: if the slice is already atomic, skip to retry.
3. **Second attempt → retry +50%** — re-run the chain with maxTurns increased by 50% and the diagnosis/fix instructions in the prompt.
4. **Backstop → escalate** — after two consecutive retries still fail, ask the user: "Two retries for slice {slice} failed. Should I increase budgets further, relax constraints, or skip this slice?"

Hard rule: the parent context is large and expensive; routing through workers is always cheaper than pulling the fix into the parent. The parent never writes code or edits files as a fix.

Each toolbelt step is a designed-for adjustment, not a snag — but record
which one fired so its frequency can be correlated. Each time you take a
toolbelt action, call `submit_feedback({ kind: "expected", data })` with `data`
naming the step, e.g. `"bug: split slice <slug> after first failure"` or
`"bug: retry +50% on slice <slug>"` or `"bug: escalate slice <slug> (two
retries failed)"`. One call per action, right when you take it.

## Workflow feedback

When the *workflow itself* snags — the bug chain failing for a workflow reason,
a repro that didn't line up with the slice doc, a regression test the test rule
made hard to write, or something that worked notably well — call
`submit_feedback({ kind, data })` autonomously, without prompting. `kind` is a
short category (`good`, `bad`, `friction`, `architecture`); `data` is one or two
specific, actionable sentences about the *workflow*, not the bug. The
tdd-worker, slice-verifier, and land-worker agents also call this tool
themselves; you don't need to relay their friction, only record what you
observe at the orchestration level. Requires the `pi-telemetry` extension
(`submit_feedback` tool).
