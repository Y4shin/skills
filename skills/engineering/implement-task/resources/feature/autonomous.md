# Implement Task (feature path)

Implements every pending ticket of a feature effort. Steps are: architecture
spec (user-approved, at the effort root) → per-ticket chain per dependency
level → end-of-effort workflow (review, spec reconcile, coherence refactor,
suite gate).

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
with an ok-gate blocking landing on verify plus deviation. The chain ships
as a pre-canned workflow script, `scripts/ticket-chain.js` in this skill's
directory (shared with the bug pipeline): resolve its path against this
skill's directory, launch it once per ticket with `async: true` and the
ticket's parameters as `args`, and it owns the preconditions gate, the step
order, the ok-gates, and the per-step output bindings. Each child task is composed from identity
and pointers only; procedure lives in the agent definitions and the tdd /
diagnosing-bugs skills, and the caller never authors worker prompts. The gate
is the
read-only `implement-preconditions` agent: it refuses to launch any worker
when the ticket doc does not exist, is human-owned, or does not match the
dispatched subtype. It returns `{ ok, failed?, step?, refs }`:
`step` is the failed step's receipt for diagnosis, `refs` the durable
output references gathered before the failure.

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

        // Resolve the chain script's path against this skill's directory,
        // then launch it once per ticket.
        runId = subagent({
            async: true,
            timeoutMs,
            workflow: "<skill-dir>/scripts/ticket-chain.js",
            args: {
                effort: effortSlug,
                ticket: ticket,
                ticketPath: ticketPath,
                subtype: "feature"
            }
        })

        // Tickets within a level run sequentially (shared repo cwd), so block
        // for this chain before dispatching the next. No parallel work meanwhile.
        wait({ id: runId })
        result = <the chain's return: { ok, failed?, step?, refs }>

        // Process the chain result
        if result.failed == "gate":
            // The preconditions refused this dispatch: wrong effort/ticket/
            // path, a human-owned ticket, or a subtype mismatch. Re-resolve
            // the ticket, rebuild the args, and relaunch once; a second
            // refusal goes to the user. The failure toolbelt (diagnose,
            // split, retry, escalate) never applies to a gate refusal.

        if exists docs/tasks/${effortSlug}/tickets/${ticket}/.work/uncertainty.md:
            // tdd-worker hit uncertainty and stopped (the ok-gate aborted before land)
            // This is a designed-for escape hatch -- record that it fired.
            submit_feedback({ kind: "expected", data: `feature: tdd-worker uncertainty stop on ticket ${ticket}` })
            resolution = ask_user_question({
                header: "Uncertain",
                question: `TDD worker hit uncertainty in ticket ${ticket}:\n{read docs/tasks/${effortSlug}/tickets/${ticket}/.work/uncertainty.md}`
            })
            // Record the resolution through the scoped tool: it writes
            // docs/tasks/<effort>/tickets/<ticket>/.work/resolution.md,
            // deletes the uncertainty file, and can do nothing else.
            resolutionPath = tw_resolve_uncertainty({
                selector: ticketPath,
                resolution: <the user's resolution>
            })
            // Re-route to tdd-worker. Do NOT do the work yourself -- parent context is expensive.
            re-launch the chain for this ticket with the same args plus
            extra: "<resolutionPath> (the recorded resolution)"
            continue

        // On chain failure, apply the failure toolbelt below
        // (diagnose → split → retry +50% → escalate). Never fix code yourself.

        // success path: ticket landed on its landing branch

    // After each level: read the level's deviation reports (planning input,
    // not implementation). Where actual API surfaces diverged, dispatch the
    // spec-reconciler agent (read plus edit on the arch spec only) with
    // pointers to the reports and the pending tickets; the parent never
    // edits the spec itself. If a deviation reveals a workflow/planning
    // problem (ambiguous spec, wrong interface contract), surface it to the
    // user. Do NOT report the deviation itself -- that's a project finding.
```

The ticket is NOT marked done here: finalize-task owns the marking, one
owner. Landing leaves the ticket unfinished in the graph. The uncertainty
path is `docs/tasks/<effort>/tickets/<ticket-slug>/.work/uncertainty.md`.

## Step 3 -- End-of-effort workflow (review, spec reconcile, coherence, suite gate)

After all tickets have landed, run the wrap-up as one pre-canned workflow
script, `scripts/end-of-effort.js` in this skill's directory (resolve its
path against this skill's directory). It runs, in order: the advisory
whole-effort review (code-reviewer, two-axis), the final arch-spec
reconcile (spec-reconciler), the coherence refactor (coherence-refactorer),
and the suite gate (test-runner, reading the repo's docs/testing.md
protocol). This stage owns refactoring; the tdd-worker loop is RED→GREEN
only. The parent composes inputs and handles the result; it never
refactors, never edits the spec, and never runs the suite itself.

**Determine scale first** (dispatch criteria, from the deviation reports):
- If TDD workers refactored out-of-scope code or altered API surfaces not
  in the spec → **ask user** before launching
- If coherence would need large-scale refactors of out-of-scope code →
  **ask user** before launching
- Otherwise → compose the inconsistency list and launch. The
  coherence-refactorer enforces the same boundaries in flight and stops
  rather than cross them.

```
// Compose the coherence input from the deviation reports: concrete
// inconsistencies, one line each (API drift between tickets, duplicated
// helpers, mismatched error handling or test setup, naming).
inconsistencies = <from the deviation reports>

runId = subagent({
    async: true,
    workflow: "<skill-dir>/scripts/end-of-effort.js",
    args: {
        effort: effortSlug,
        startingBranch: <the effort's starting branch>,
        inconsistencies: inconsistencies,
        optionalTests: <integers naming docs/testing.md "run if asked" commands; usually []>
    }
})

wait({ id: runId })
result = <the workflow's return: { ok, failed?, step?, reviewOk?, refs }>

// The review is advisory: read result.refs.review and surface its findings
// to the user. It does not gate landing or finalize.

// On result.failed == "suite": emergent cross-ticket breakage. Add the
// failures to the inconsistencies list and relaunch the workflow with
// review: false (the review already ran). Large, ambiguous, or
// API-surface failures go to the user instead of a relaunch.

// On result.failed == "coherence": the refactorer stopped on a scope or
// API-surface boundary. Take its reason to the user; do not relaunch the
// same list.

// On result.failed == "spec": relaunch once; a second failure goes to the user.
```

## Step 4 -- Report

Report completed tickets, any deviations found and resolved, user interventions.

"If all tickets done: run `/skill:finalize-task <ticket-slug>`" (per ticket;
finalize marks each ticket's `workflow_state`).

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first** -- read worker outputs and any partial diff. Never blindly redo.
2. **First failure -> split** -- split the ticket into sub-tickets registered in the effort, per the split rules below. Exception: if the ticket is
   already atomic, skip to retry.
3. **Second attempt -> retry +50%** -- re-run the chain with timeoutMs increased by 50 percent and args.extra pointing at the failed step's output reference (and any recorded resolution), so the worker re-reads its prior attempt. Never author prompt instructions for the worker; pass pointers.
4. **Backstop -> escalate** -- after two consecutive retries still fail, ask the user: "Two retries for ticket {ticket} failed. Should I increase budgets further, relax constraints, or skip this ticket?"

**Split rules (sub-tickets, never ad-hoc files).** A split decomposes the
failed ticket into sub-tickets that the effort's graph absorbs; no ad-hoc
slice docs and no ad-hoc numbering convention exist anymore:

- Write each sub-ticket to
  `docs/tasks/<effort>/tickets/<sub-ticket-slug>/ticket.md` with v4
  frontmatter: `type: ticket`, the original's inherited subtype, `status:
  stable`, `workflow_state: ready`, a size from the diagnosis (how big
  each remaining piece really is), and a `blocked_by` that inherits the
  original's edges and chains between the subs (sub two blocked by sub one
  when the work is sequential).
- Supersede the original: set its frontmatter to `status: deprecated` plus
  `workflow_state: done` (the deprecated-plus-done pair takes it out of the
  graph), and add a body note naming its sub-tickets so the history reads.
- Re-run the chain per sub-ticket; the frontier and dependency levels pick
  the sub-tickets up like any other ticket.

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
