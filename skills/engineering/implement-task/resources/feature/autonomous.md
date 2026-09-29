# Implement Task (feature path)

Implements every pending ticket of a feature effort. Steps are: architecture
spec (user-approved, at the effort root) → per-ticket chain per dependency
level → coherence refactor.

## Step 0 -- Prerequisites

Read the invoked ticket (subtype, mode, size) through the resolver: a slug or
a path, both tree shapes; the ticket document lives at
`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`. Pending tickets are the
effort frontier:

```
const effortSlug = "<effort-slug>"
const ticketPath = `docs/tasks/${effortSlug}/tickets/${ticketSlug}/ticket.md`
const pendingTickets = tw_frontier(effortSlug)
```

If none pending: "All tickets done. Run `/skill:finalize-task`."

## Step 1 -- Architecture spec (user-approved, at the effort root)

Before any TDD, draft an architecture spec. It lives at the effort root,
`docs/tasks/<effort>/arch-spec.md`, stable and shared across the effort's
ticket chains. The spec is committed on the starting branch before the first chain dispatch,
so every ticket branch includes it.

For each pending ticket, draft:
- **Exports:** planned public API surface
- **Existing abstractions to use:** specific modules/interfaces from the codebase
- **Do NOT reimplement:** specific utilities/patterns to avoid
- **Seams:** the public boundaries under test; list them; the user approves
  them; the tdd-worker tests only at these seams.
- **Interface contract:** for tickets with dependents: what does this ticket
  export that the next ticket calls?

The spec is a frontmattered artifact:

```yaml
---
type: arch spec
title: <title>
status: draft   # stable once the user approves the spec
---
```

Also record in the effort's map or the ticket doc's architecture-notes
section (if the user adds any).

Present the complete spec to the user. One conversation. Iterate if needed.
Once approved, write it to `docs/tasks/<effort>/arch-spec.md` with
`status: stable`, and commit it on the starting branch.

## Step 2 -- Per-ticket chain dispatch

> **Async dispatch (hard rule):** launch every chain with `async: true`. Never
> block on a foreground subagent. After dispatching a ticket's chain, call
> `wait({ id })` to receive its result before moving on -- tickets within a
> level run sequentially on a shared repo cwd, so there is no parallel work
> meanwhile. The run stays tracked, interruptible, and steerable.

The effort's tickets form a **ticket graph** with blocking relationships: each
ticket declares its `blocked_by` dependencies, and the **frontier** is the set
of ready, unfinished tickets (all blockers done). Call
`tw_dependency_levels <effort-slug>` to get BFS levels. The graph model is
the same one `tw_frontier <effort-slug>` exposes: a level is a wave of tickets
whose blockers are all in prior levels.

**Branch model.** Each ticket lands on its own **landing branch**
`task/<ticket-slug>`, created off the branch the previous ticket's chain
landed on (the effort's starting branch, typically main, for the first
ticket), so a chain sees the code its blockers delivered. The tdd-worker
commits checkpoints on the **working branch** `ticket/<ticket-slug>`, created
off the landing branch; the land-worker merges it back with `--no-ff` and
deletes it.

**Communication via context pointers.** Communicate to and from subagents
primarily through context pointers (to the arch spec, ticket docs, research
notes, previous commits). Do not duplicate information already available via
pointers; pass the pointer, not the content.

Tickets within a level run **sequentially** by default (chains share the
repo cwd, so parallel tickets would clash). Levels remain strict barriers:
level N+1 starts only after every ticket in level N has landed.

Each ticket runs as a **sequential chain** that shares the repo working
directory: `tdd-worker → (slice-verifier ∥ deviation-reporter) → land-worker`,
with an ok-gate blocking landing on verify plus deviation. The chain rebases
onto the workflow API: one `subagent({ async: true, workflowScript })` per
ticket chain, `runs.run` for the tdd step, `runs.all` for verify plus
deviation, and output paths bound per step.

```
levels = JSON.parse(tw_dependency_levels(effortSlug)).levels

for each level in levels:
    for each ticket in level:   // sequential: chains share the repo cwd
        // Budgets come from the ticket's size; absent means m, never an error.
        size = tw_get(ticketPath, "size") || "m"
        budgetMinutes = { s: 15, m: 30, l: 45, xl: 60 }
        const timeoutMs = (budgetMinutes[size] || budgetMinutes.m) * 60 * 1000

        // Point the state file at the ticket its chain is about to run.
        tw_state_set task <ticket-slug>

        runId = subagent({
            async: true,
            workflowScript: (runs) => {
                // Step 1: tdd-worker implements the ticket on ticket/<ticket-slug>.
                runs.run({
                    agent: "tdd-worker",
                    as: "tdd",
                    output: `tdd-${ticket}/result.md`,
                    skill: "tdd",
                    task: `Implement ticket "${ticket}" for effort "${effortSlug}".

Ticket doc: ${ticketPath}
Arch spec: docs/tasks/${effortSlug}/arch-spec.md

Before writing code:
1. Read the arch spec for this ticket's interface contract and abstraction notes.
2. Read the existing source files listed in the arch spec.
3. Read the standards files directly (AGENTS.md, CONTEXT.md, docs/standards.md,
   docs/testing.md).
4. Commit after each GREEN (checkpoint).

If uncertain, write docs/tasks/${effortSlug}/tickets/${ticket}/.work/uncertainty.md and stop.`,
                    timeoutMs
                });
                // Step 2: verify plus deviation in parallel; both must pass.
                const [verify, deviation] = runs.all([
                    {
                        agent: "slice-verifier",
                        as: "verify",
                        output: `verify-${ticket}/result.md`,
                        task: `Verify ticket "${ticket}".
Implementation: {outputs.tdd}.
Run lint and tests. Block on failure.`,
                        timeoutMs
                    },
                    {
                        agent: "deviation-reporter",
                        as: "deviation",
                        output: `deviation-${ticket}/result.md`,
                        task: `Check ticket "${ticket}" for deviations from the arch spec and ticket doc.

Ticket doc: ${ticketPath}
Arch spec: docs/tasks/${effortSlug}/arch-spec.md
Implementation: {outputs.tdd}.

Compare the implementation against the spec. Write a frontmattered deviation
report to docs/tasks/${effortSlug}/tickets/${ticket}/deviation-reports/ covering:
- API surface changes (planned vs actual)
- Abstraction usage (used what was specified?)
- Out-of-scope additions
- Any divergence from the ticket doc's acceptance criteria

If the ticket doc's ## Implementation notes needs updating, note it.`,
                        timeoutMs
                    }
                ]);
                // Ok-gate: landing is blocked on verify plus deviation.
                if (verify.ok && deviation.ok) {
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

        // Tickets within a level run sequentially (shared repo cwd), so block
        // for this chain before dispatching the next. No parallel work meanwhile.
        wait({ id: runId })

        // Process the chain result
        if exists docs/tasks/${effortSlug}/tickets/${ticket}/.work/uncertainty.md:
            // tdd-worker hit uncertainty and stopped (the ok-gate aborted before land)
            // This is a designed-for escape hatch -- record that it fired.
            submit_feedback({ kind: "expected", data: `feature: tdd-worker uncertainty stop on ticket ${ticket}` })
            resolution = ask_user_question({
                header: "Uncertain",
                question: `TDD worker hit uncertainty in ticket ${ticket}:\n{read docs/tasks/${effortSlug}/tickets/${ticket}/.work/uncertainty.md}`
            })
            delete the uncertainty file
            // Re-route to tdd-worker. Do NOT do the work yourself -- parent context is expensive.
            re-run the chain for this ticket,
            appending the user's resolution to the tdd task prompt
            continue

        // On chain failure, apply the failure toolbelt below
        // (diagnose → split → retry +50% → escalate). Never fix code yourself.

        // success path: ticket landed on its landing branch

    // After each level: read deviation reports for tickets that flagged
    // user-attention-needed. Update the arch spec for pending tickets if API
    // surfaces changed. If a deviation reveals a workflow/planning problem
    // (ambiguous spec, wrong interface contract), surface it to the user.
    // Do NOT report the deviation itself -- that's a project finding.
```

The ticket is NOT marked done here: finalize-task owns the marking, one
owner. Landing leaves the ticket unfinished in the graph. The uncertainty
path is `docs/tasks/<effort>/tickets/<ticket-slug>/.work/uncertainty.md`.

## Whole-effort code review (advisory)

After all tickets have landed, run a two-axis code review over the whole-effort diff before the coherence refactor. The review is advisory -- it does not gate landing (the tickets already landed) and does not gate finalize.

```js
reviewId = subagent({
  async: true,
  agent: "code-reviewer",
  skill: "code-review",
  as: "review",
  output: "review/result.md",
  task: `Review the whole-effort diff for effort ${effortSlug}. Fixed point: the starting branch. Spec source: the ticket docs plus the effort-root arch spec. Report Standards + Spec findings side by side.`
})

wait({ id: reviewId })
```

Read `review/result.md` and surface the findings to the user. Step 3 (coherence refactor) uses these findings to drive refactoring priorities.

## Step 3 -- Coherence refactor

This stage owns refactoring; the tdd-worker loop is RED→GREEN only. Refactor here, not in the per-ticket worker.

After all tickets landed and the advisory code review findings have been surfaced, review the combined diff and all deviation reports.

Read:
- `docs/tasks/${effortSlug}/tickets/*/deviation-reports/*.md`
- `docs/tasks/${effortSlug}/arch-spec.md`
- Combined diff: `git diff <starting-branch>...task/<last-landed-ticket>` (the landing branches chain, so the last contains every landed ticket)

**Determine scale:**
- If TDD workers refactored out-of-scope code or altered API surfaces not in the spec → **ask user**
- If you'd need large-scale refactors of out-of-scope code to make things coherent → **ask user**
- Otherwise → do small/medium refactors autonomously:
  - Rename symbols for consistency
  - Extract shared helpers duplicated across tickets
  - Align error handling patterns
  - Consolidate duplicate test setup
  - Ensure naming conventions are consistent

Do NOT change API surfaces that dependents call without user approval.
Do NOT refactor outside the effort's scope.

**Cost note:** these refactors are done directly by you (the parent), which
means your full context is loaded. Keep them genuinely small -- if a refactor
would require reading more than ~5 files or editing more than ~50 lines,
consider routing it through a subagent instead.

**Final suite gate:** Run the full project test suite. It must be green before Step 3 is complete. If red, this is emergent cross-ticket breakage -- breakage that only appears when all tickets combine and no single ticket owns the fix. Apply small/medium root-cause fixes within the effort's scope autonomously (same rules as above); escalate large, ambiguous, or API-surface-touching fixes to the user. For test failures: first try re-routing the fix through a subagent before doing it yourself.

## Step 4 -- Report

Report completed tickets, any deviations found and resolved, user interventions.

"If all tickets done: run `/skill:finalize-task <ticket-slug>`" (per ticket;
finalize marks each ticket's `workflow_state`).

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first** -- read worker outputs and any partial diff. Never blindly redo.
2. **First failure -> split** -- split the ticket into sub-tickets registered
   in the effort (the split rules below). Exception: if the ticket is already
   atomic, skip to retry.
3. **Second attempt -> retry +50%** -- re-run the chain with timeoutMs increased by 50 percent and the diagnosis/fix instructions in the prompt.
4. **Backstop -> escalate** -- after two consecutive retries still fail, ask the user: "Two retries for ticket {ticket} failed. Should I increase budgets further, relax constraints, or skip this ticket?"

Hard rule: the parent context is large and expensive; routing through workers is always cheaper than pulling the fix into the parent. The parent never writes code or edits files as a fix.

Each toolbelt step is a designed-for adjustment, not a snag -- but record
which one fired so its frequency can be correlated. Each time you take a
toolbelt action, call `submit_feedback({ kind: "expected", data })` with `data`
naming the step, e.g. `"feature: split ticket <slug> after first failure"`
or `"feature: retry +50% on ticket <slug>"` or `"feature: escalate ticket <slug>
(two retries failed)"`. One call per action, right when you take it.

## Workflow feedback

When the *workflow itself* snags -- a chain that keeps failing for the same
reason, a ticket that won't split, a worker that lacked a tool it needed, a
dependency level that blocked unnecessarily, an arch spec that contradicted a
ticket doc, or something that worked notably well -- call
`submit_feedback({ kind, data })` autonomously, without prompting. `kind` is a
short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
two specific, actionable sentences about the *workflow*, not the code. The
tdd-worker, slice-verifier, deviation-reporter, and land-worker agents also
call this tool themselves; you don't need to relay their friction, only record
what you observe at the orchestration level. Requires the `pi-telemetry`
extension (`submit_feedback` tool).
