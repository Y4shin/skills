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

## Step 2 -- Orchestrator dispatch

> **Async dispatch (hard rule):** launch the orchestrator with `async: true`.
> Never run a blocking/foreground subagent. After dispatching, return
> control; Pi wakes this session on completion or attention, so no wait call
> is needed. Supervisor questions from the orchestrator are uncertainty asks:
> run `ask_user_question` and reply through the channel.

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
directory (shared with the bug pipeline): you pass its resolved absolute
path in the orchestrator's brief, and the read-only `implement-orchestrator`
agent launches it once per ticket with the ticket's parameters as `args`.
The script owns the preconditions gate, the step order, the ok-gates, the
host-enforced deliverable gates, and the per-step output bindings; each
child task is composed from identity and pointers only, and procedure
lives in the agent definitions and the tdd / diagnosing-bugs skills, so no
caller ever authors worker prompts. The gate is the read-only
`implement-preconditions` agent: it refuses to launch any worker when the
ticket doc does not exist, is human-owned, or does not match the dispatched
subtype. The chain returns `{ ok, failed?, step?, refs }`: `step` is the
failed step's receipt for the orchestrator's diagnosis, `refs` the durable
output references gathered before the failure.

```
// Planning-subtype items on the frontier already ran inline. One dispatch
// executes the effort's tickets; the parent never enters the loop itself:
runId = subagent({
    async: true,
    agent: "implement-orchestrator",
    task: [
        'Execute the ticket frontier for effort "${effortSlug}" (subtype feature).',
        "",
        "Arch spec: docs/tasks/${effortSlug}/arch-spec.md (user-approved, stable)",
        "Chain workflow: <absolute path to scripts/ticket-chain.js, resolved against this skill's directory>",
        "Follow your contract; return the structured report."
    ].join("\n")
})

// Return control; Pi wakes this session when the orchestrator finishes or
// asks. Answer its supervisor questions (uncertainty asks) with
// ask_user_question and reply through the channel.
result = <the orchestrator's report: landed[], needsSplit?, escalate?, planning problems>

if result.needsSplit:
    // The orchestrator diagnosed a ticket that must split. You own the
    // registration: apply the split rules below, then re-dispatch the
    // orchestrator for the remaining frontier.
if result.escalate:
    // The ticket exhausted its re-run. Ask the user: increase budgets
    // further, relax constraints, or skip the ticket?
if result.planning problems:
    // Surface them to the user; graph updates and Wayfinder run after the
    // orchestrator returns, per the skill's frontier mode.

// success path: every frontier ticket landed on its landing branch
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

Hard rule: the parent never implements. In-flight recovery belongs to the
orchestrator: it diagnoses from the failed step's output, re-runs an atomic
ticket once with `timeoutMs` increased by 50 percent and `args.extra`
pointing at the prior attempt, and stops at boundaries. What returns to the
parent is an escalation, and the parent's only moves are:

1. **needsSplit -- register the split** -- split the ticket into sub-tickets
   registered in the effort, per the split rules below, then re-dispatch the
   orchestrator for the remaining frontier.
2. **escalate -- ask the user** -- "Two retries for ticket {ticket} failed.
   Should I increase budgets further, relax constraints, or skip this
   ticket?"

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
