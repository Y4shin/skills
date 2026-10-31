# Implement Ticket (feature path)

Implements the feature tickets of an effort. Steps are: the architecture
read (the opener gates on it, never drafted here) → per-ticket chain per
dependency level → the inlined per-ticket close-out → end-of-effort
workflow (review, architecture reconcile, coherence refactor, suite gate).

## Step 0 -- Prerequisites

The opener has checked the effort's work state and the architecture
document (`docs/tasks/<effort>/architecture.md`, stable; the legacy
`arch-spec.md` is a tolerated input until the migration renames it). Read
the invoked ticket (subtype, mode, size) through the resolver: a slug or
a path, both tree shapes; the ticket document lives at
`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`. Pending tickets are the
effort frontier:

```
const effortSlug = "<effort-slug>"
const ticketPath = `docs/tasks/${effortSlug}/tickets/${ticketSlug}/ticket.md`
const pendingTickets = tw_frontier(effortSlug)
```

## Step 1 -- The architecture read (never drafted)

The architecture document is `to-tickets`' output and this phase only reads
it: for each ticket, read its per-ticket exports, the existing abstractions
to use, the do-not-reimplement notes, the seams (the tdd-worker tests only
at these seams), and the interface contract with the tickets that depend on
it. A missing or unstable architecture document is an opener refusal, never
a draft step here.

If implementation shows the architecture is wrong, do not edit it here:
record the divergence in the deviation report and let the spec-reconciler
fold it in at the level close.

## Step 2 -- Per-ticket chain dispatch

> **Async dispatch (hard rule):** launch every chain with `async: true`. Never
> block on a foreground subagent. After dispatching a ticket's chain, return
> control; Pi wakes this session when it completes, so no wait call is needed.
> One chain runs at a time; each run stays tracked, interruptible, and
> steerable.

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
deletes it. The close-out merges back into that same branch, written below as
`<effort-branch>`.

**Communication via context pointers.** Communicate to and from subagents
primarily through context pointers (to the architecture document, ticket
docs, research notes, previous commits). Do not duplicate information
already available via pointers; pass the pointer, not the content.

**Tickets run one at a time, in level order.** The dependency levels remain
**strict barriers**: level N+1 starts only after every ticket in level N has
landed and closed out, one ticket at a time. Nothing implements level concurrency: every chain
shares the repo working directory, so two chains at once would checkout
different landing branches in one tree and the per-ticket `tw_state_set task`
would be last-writer-wins. Worktree isolation is the follow-up effort's seed,
recorded in the effort's architecture document, not behaviour this pipeline
claims.

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
    for each ticket in level:   // one at a time; the level boundary is a strict barrier
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
            // The chain holds quiet while its workers run (a size-l ticket
            // is up to 45 minutes), so the run watchdog's idle
            // needs_attention pings are pure noise. Completion, failure,
            // and the active_long_running notice still notify.
            control: { notifyOn: ["active_long_running"] },
            workflow: "<skill-dir>/scripts/ticket-chain.js",
            args: {
                effort: effortSlug,
                ticket: ticket,
                ticketPath: ticketPath,
                subtype: "feature"
            }
        })

        // One ticket at a time in level order; the level boundary is a
        // strict barrier. Return control after dispatching: Pi wakes this
        // session with the chain's result.
        result = <the chain's return: { ok, failed?, step?, refs }>

        // Process the chain result
        if result.failed == "gate":
            // The preconditions refused this dispatch: wrong effort/ticket/
            // path, a human-owned ticket, or a subtype mismatch. Re-resolve
            // the ticket, rebuild the args, and relaunch once; a second
            // refusal goes to the user. The failure toolbelt (diagnose,
            // split, retry, escalate) never applies to a gate refusal.

        // The uncertainty path is the ticket-directory one:
        // docs/tasks/<effort>/tickets/<ticket-slug>/.work/uncertainty.md.
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

        // The close-out runs inline, in this same run, before the next
        // dispatch: CI gate, knowledge harvest, changelog, done-marking,
        // close-out, merge to <effort-branch>. The one-owner rule holds: this phase's
        // close-out is the only thing that marks a ticket done (Step 2b).
        // The uncertainty path is
        // docs/tasks/${effortSlug}/tickets/${ticket}/.work/uncertainty.md.

        // On chain failure, apply the failure toolbelt below
        // (diagnose → split → retry +50% → escalate). Never fix code yourself.

    // After each level: read the level's deviation reports (planning input,
    // not implementation). Where actual API surfaces diverged, dispatch the
    // spec-reconciler agent (read plus edit on the architecture document
    // only) with pointers to the reports and the pending tickets; the parent
    // never edits the architecture. If a deviation reveals a
    // workflow/planning problem (ambiguous architecture, wrong interface
    // contract), surface it to the user. Do NOT report the deviation itself
    // -- that's a project finding.
```

## Step 2b -- The inlined per-ticket close-out

After a ticket's chain returns ok, run the close-out in this same run
before the next dispatch. The steps interleave **Pi tool calls** with shell
commands: the tw_* tools are tools you invoke as functions, **not** shell
binaries; wrapping them in a `set -e` block makes them fail with
`command not found` (exit 127) and aborts the sequence. Call them as tools,
and run the shell steps in a separate bash block.

1. **CI gate**: checkout `task/<ticket-slug>`, `git merge <effort-branch>
   2>/dev/null || true`, run the project's CI command, detected from repo
   tooling or the `docs/testing.md` protocol; ask the user when ambiguous.
   A red branch
   is never merged: fix forward on the landing branch, and record that
   fix-forward fired with `submit_feedback({ kind: "expected", data })`.
2. **Knowledge harvest**: read the ticket doc, all deviation reports from
   `docs/tasks/<effort>/tickets/<ticket-slug>/deviation-reports/`, and the
   combined diff; fold durable knowledge into `docs/testing.md` and other
   relevant docs, and append architecture lessons to the ticket doc's
   `## Implementation notes`. Commit:
   `git add -A && git commit -m "docs(ticket): harvest knowledge for {ticketSlug}"`
3. **Changelog**: write the entry through `tw_write_changelog`, the only
   writer of `docs/tasks/CHANGELOG.md` (the built-in write and edit are
   refused there): the slug, the ticket title, and a 3-5 line body. Commit
   through the shell afterwards (the commit is git, not a tree mutation):
   `git add docs/tasks/CHANGELOG.md && git commit -m "docs: changelog {ticketSlug}"`
4. **Bug closure (subtype: bug only)**: read the ticket body for the bug doc
   reference; if the body names no bug doc, ask the user which bug doc to
   close and do not proceed until answered. Read `docs/bugs/<slug>.md`, set
   `status: fixed`, fill `fix_commit` with the landing branch's SHA, fill
   the Root cause and Fix summary sections, commit, then archive the bug
   doc with `git mv docs/bugs/<slug>.md docs/bugs/archive/<slug>.md` and
   commit.
5. **Mark the ticket done through `tw_mark_done`** (the one owner of the
   marking: this phase; the chain never marks it). The tool checks the
   changelog entry references the ticket before it writes the done state,
   so the changelog step must land first.
6. **`tw_finalizable <ticket-slug>`** (Pi tool, not a shell command):
   verifies the ticket is finalizable and surfaces the effort graph's
   anomalies, which you should report if any appear.
7. **`tw_state_set task null`** (Pi tool, not a shell command): clears the
   current item pointer.
8. **Merge the landing branch into the effort's branch** (shell, safe under
   `set -e`), where `<effort-branch>` is the branch the previous ticket
   landed on, not the literal `main` unless `main` is that branch:

   ```bash
   set -e
   git checkout <effort-branch>
   git merge --no-ff task/<ticket-slug> -m "ticket: finalize {ticketSlug}"
   git branch -d task/<ticket-slug>
   ```

   If remote exists: `git push origin <effort-branch>`

There is **no per-ticket move**: the ticket stays in the live effort.
Moving one ticket out would split the effort's graph scope and trip the
spec-plus-zero-tickets rule; the effort archives as a unit.

## Step 3 -- End-of-effort workflow (review, architecture reconcile, coherence, suite gate)

After every ticket has landed and closed out, run the wrap-up as one
pre-canned workflow script, `scripts/end-of-effort.js` in this skill's
directory (resolve its path against this skill's directory). It runs, in
order: the advisory whole-effort review (code-reviewer, two-axis), the
final architecture reconcile (spec-reconciler), the coherence refactor
(coherence-refactorer), and the suite gate (test-runner, reading the repo's
docs/testing.md protocol). This stage owns refactoring; the tdd-worker loop
is RED→GREEN only. The parent composes inputs and handles the result; it
never refactors, never edits the architecture document, and never runs the
suite itself.

**Determine scale first** (dispatch criteria, from the deviation reports):
- If TDD workers refactored out-of-scope code or altered API surfaces not
  in the architecture → **ask user** before launching
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
    // The wrap-up workflow holds quiet while its steps run, so the run
    // watchdog's idle needs_attention pings are pure noise. Completion,
    // failure, and the active_long_running notice still notify.
    control: { notifyOn: ["active_long_running"] },
    workflow: "<skill-dir>/scripts/end-of-effort.js",
    args: {
        effort: effortSlug,
        startingBranch: <the effort's starting branch>,
        inconsistencies: inconsistencies,
        optionalTests: <integers naming docs/testing.md "run if asked" commands; usually []>
    }
})

// Return control after dispatching; Pi wakes this session with the
// workflow's result.
result = <the workflow's return: { ok, failed?, step?, reviewOk?, refs }>

// The review is advisory: read result.refs.review and surface its findings
// to the user. It does not gate landing or the close-out.

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

Report with the skill's completion report resource,
[resources/report.md](../report.md): the fixed five-part shape, tuned
for this skill, which names the next step (continue the frontier, or, when
every ticket has landed and closed out, the end-of-effort pass and then
`/skill:finalize-effort <effort-slug>`). A refusal, failure, or escalation
is the same shape.

## Failure toolbelt (parent never implements)

The close-out's done-marking tool call above is this phase's one-owner
marking, not a chain step: `tw_mark_done` runs in the parent (the close-out
sequence), never inside a chain step.

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first** -- read worker outputs and any partial diff. Never blindly redo.
2. **First failure -> split** -- split the ticket into sub-tickets registered in the effort, per the split rules below. Exception: if the ticket is
   already atomic, skip to retry.
3. **Second attempt -> retry +50%** -- re-run the chain with timeoutMs increased by 50 percent and args.extra pointing at the failed step's output reference (and any recorded resolution), so the worker re-reads its prior attempt. Never author prompt instructions for the worker; pass pointers.
4. **Backstop -> escalate** -- after two consecutive retries still fail, ask the user: "Two retries for ticket {ticket} failed. Should I increase budgets further, relax constraints, or skip this ticket?"

**Split rules (sub-tickets, never ad-hoc files).** A split goes through
`tw_split_ticket`, which creates the sub-tickets and supersedes the
original, so the effort's graph absorbs it; no ad-hoc slice docs and no
ad-hoc numbering convention exist anymore:

- `tw_split_ticket` writes each sub-ticket to
  `docs/tasks/<effort>/tickets/<sub-ticket-slug>/ticket.md` with v5
  frontmatter: the original's inherited subtype, `status: stable`,
  `workflow_state: ready`, a size from the diagnosis (how big each
  remaining piece really is), and a `blocked_by` that inherits the
  original's edges and chains between the subs (sub two blocked by sub one
  when the work is sequential).
- The original is superseded as `status: deprecated` plus
  `workflow_state: done` (the deprecated-plus-done pair takes it out of the
  graph), with a body note naming its sub-tickets so the history reads.
- Hand edits to ticket files are refused by the write guard; the tool is
  the only writer.
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
dependency level that blocked unnecessarily, an architecture document that
contradicted a ticket doc, or something that worked notably well -- call
`submit_feedback({ kind, data })` autonomously, without prompting. `kind` is a
short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
two specific, actionable sentences about the *workflow*, not the code. The
tdd-worker, slice-verifier, deviation-reporter, and land-worker agents also
call this tool themselves; you don't need to relay their friction, only record
what you observe at the orchestration level. Requires the `pi-telemetry`
extension (`submit_feedback` tool).
