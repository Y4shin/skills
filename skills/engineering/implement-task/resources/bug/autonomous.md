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

## Step 1  --  Orchestrator dispatch

Run the ticket through the read-only orchestrator: one `implement-orchestrator`
child executes it end to end. The chain itself ships as a pre-canned workflow
script, `scripts/ticket-chain.js` in this skill's directory (shared with the
feature pipeline): `tdd-worker → slice-verifier → land-worker`, with an
ok-gate blocking landing on verify and host-enforced deliverable gates. Each
child task is composed from identity and pointers only; procedure lives in
the agent definitions and the tdd / diagnosing-bugs skills, and no caller
ever authors worker prompts. The chain opens with the read-only
`implement-preconditions` gate: it refuses to run when the ticket doc does
not exist, is human-owned, or does not match the dispatched subtype. The
orchestrator owns the dispatch, the size-keyed budgets, the state pointer,
the gate-refusal recovery, and the uncertainty loop; it returns a structured
report (`landed[]`, `needsSplit?`, `escalate?`, planning problems).

> **Async dispatch (hard rule):** launch the orchestrator with `async: true`.
> Never run a blocking/foreground subagent. After dispatching, return
> control; Pi wakes this session on completion or attention, so no wait call
> is needed. Supervisor questions from the orchestrator are uncertainty asks:
> run `ask_user_question` and reply through the channel.

```
runId = subagent({
    async: true,
    agent: "implement-orchestrator",
    task: [
        'Execute the ticket frontier for bug effort "${effortSlug}" (subtype bug; the single ticket ${ticketSlug}).',
        "",
        "Ticket doc: ${ticketPath}",
        "Bug doc: ${bugPath}",
        "Reproduction: ${reproPath}",
        "Chain workflow: <absolute path to scripts/ticket-chain.js, resolved against this skill's directory>",
        "Follow your contract; return the structured report."
    ].join("\n")
})

// Return control; Pi wakes this session when the orchestrator finishes or
// asks. Answer its supervisor questions (uncertainty asks) with
// ask_user_question and reply through the channel.
result = <the orchestrator's report: landed[], needsSplit?, escalate?, planning problems>

// On result.needsSplit: register the split per the failure toolbelt below,
// then re-dispatch the orchestrator. On result.escalate: ask the user.
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
  output: "review/result.md",
  task: `Review the bug-fix diff for ticket ${ticket}. Fixed point: the starting branch. Spec source: the bug doc plus its reproduction.`
})

wait({ id: reviewId })
```

Read `review/result.md` and surface the findings to the user.

## Step 2  --  Report

Report the landed ticket, the regression test added, and any user interventions.

"If the ticket is done: run `/skill:finalize-task <ticket-slug>`" (finalize
marks the ticket's `workflow_state`).

## Failure toolbelt (parent never implements)

Hard rule: the parent never implements. In-flight recovery belongs to the
orchestrator: it diagnoses from the failed step's output, re-runs an atomic
ticket once with `timeoutMs` increased by 50% and `args.extra` pointing at
the prior attempt, and stops at boundaries. What returns to the parent is
an escalation, and the parent's only moves are:

1. **needsSplit -- register the split** -- split the ticket into sub-tickets
   registered in the effort: write each to
   `docs/tasks/<effort>/tickets/<sub-ticket-slug>/ticket.md` with v4
   frontmatter (inherited subtype, size from the diagnosis, `blocked_by`
   inheriting the original's edges and chained between the subs), and
   supersede the original as `status: deprecated` plus `workflow_state: done`
   with a body note naming its sub-tickets. The split rules in the feature
   pipeline's failure toolbelt apply here in full. Then re-dispatch the
   orchestrator.
2. **escalate -- ask the user** -- "Two retries for ticket {ticket} failed.
   Should I increase budgets further, relax constraints, or skip this
   ticket?"

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
