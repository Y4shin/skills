---
name: implement-ticket
description: "Autonomous. Owns the implementation phase: reads the effort's architecture document, works the ticket frontier in dependency levels, dispatches the per-ticket chain per ticket, and closes each landed ticket out inline (CI gate, knowledge harvest, changelog, done-marking, merge to the effort's landing branch). The successor to the ticket half of the retired implementation router and the retired close-out skill."
---

# Implement Ticket

`implement-ticket` is the implementation phase. It replaces the ticket half
of the retired implementation router and all of the retired close-out skill:
one skill dispatches every
per-ticket chain and closes each landed ticket out in the same run. It is
model-invoked, so the model reaches for it whenever implementation work is
ready; the human can also run `/skill:implement-ticket` explicitly.

## Open first

Every run starts by opening the skill: call `tw_open` with
`{ skill: "implement-ticket", effort: "<effort-slug>", target: "<ticket-slug>" }`.
The opener is the gate: it checks the effort's work state (ticket generation
ran, work remains), the architecture document (a missing or unstable one is
refused here and is never drafted below), and the target ticket's readiness
(a ticket that is done, blocked, or not yet ready is refused with the legal
next calls). It activates the toolset only when they pass. Work only through
the tools the opener discloses, and close the phase with
`tw_close implement-ticket` when the run releases.

The opener reads `docs/tasks/<effort>/architecture.md` (or the legacy
`arch-spec.md`, which the schema-5 migration renames; the refusal names the
rename). A missing or unstable architecture document is an opener refusal,
never a draft step: the architecture is `to-tickets`' output. A bug-only
effort, which has no architecture document by design, is exempt from that
check.

## Routing

The ticket resolves through the resolver (a slug or a path, both tree
shapes; the ticket document lives at
`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`). Read its routing
fields from the frontmatter: "subtype" (the ticket's feature or bug kind)
and "mode" (the optional human-owned marker). Implementation work is always
a ticket: `type: ticket` with `subtype` `feature` or `bug`, never a planning
subtype. The planning subtypes (research, prototype, grilling, manual) are
Wayfinder's frontier; if a run needs planning work, end the run and tell the
human to run `/skill:wayfinder`.

## The ticket frontier and the level loop

Read the ready edge with `tw_frontier <effort-slug>` and layer the ticket
graph with `tw_dependency_levels <effort-slug>` (BFS levels). A level is a
wave of tickets whose blockers are all done; levels are strict barriers:
level N+1 starts only after every ticket in level N has landed.

**The loop is serial: tickets run one at a time, in level order.** The levels
stay barriers, and no two chains ever run at once. Every chain shares the one
repo working directory, so a second chain at the same time would `git
checkout` a different `task/<ticket-slug>` branch in the same tree, and the
per-ticket `tw_state_set task <slug>` would be last-writer-wins. Worktree
isolation is the follow-up effort's seed, not behaviour this skill claims.

## Step 1 -- Per-ticket chain dispatch

Ticket writes go through the named tools only: `tw_add_ticket` creates a
new ticket in dependency order (edges validated at creation, so the
retired by-hand wiring pass has no mechanism here), `tw_split_ticket`
supersedes an oversized ticket, and the close-out's changelog write goes
through `tw_write_changelog`. Hand edits under `docs/tasks/` are refused
by the write guard.

> **Async dispatch (hard rule):** launch every `subagent(...)` call in this
> skill's resources -- ticket chains and any fan-out -- with `async: true`.
> Never run a blocking/foreground subagent. After dispatching, return
> control; Pi wakes this session on completion or attention, so no wait call
> is needed to receive the result.

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

The chain ships as a pre-canned workflow script,
`scripts/ticket-chain.js` in this skill's directory (shared by the feature
and bug pipelines): resolve its path against this skill's directory, launch
it once per ticket with `async: true` and the ticket's parameters as
`args`, and it owns the preconditions gate, the step order, the ok-gates,
and the per-step output bindings. The land-worker writes the landing note
through `tw_write_ticket_note`, the named writer for a ticket doc: it
reaches the tool through its own `tools:` allowlist, because a subagent runs
in its own session where no phase is open. Each child task is composed from identity
and pointers only; procedure lives in the agent definitions and the tdd /
diagnosing-bugs skills, and the caller never authors worker prompts. The
gate is the read-only `implement-preconditions` agent: it refuses to launch
any worker when the ticket doc does not exist, is human-owned, or does not
match the dispatched subtype. It returns `{ ok, failed?, step?, refs }`:
`step` is the failed step's receipt for diagnosis, `refs` the durable output
references gathered before the failure.

```js
// Point the state file at the ticket its chain is about to run.
tw_state_set task <ticket-slug>

// Budgets come from the ticket's size; absent means m, never an error.
size = tw_get(ticketPath, "size") || "m"
budgetMinutes = { s: 15, m: 30, l: 45, xl: 60 }
const timeoutMs = (budgetMinutes[size] || budgetMinutes.m) * 60 * 1000

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
        ticket: ticketSlug,
        ticketPath: ticketPath,
        subtype: "<feature|bug>",
        // bug only: read the bug doc path and the reproduction path
        // from the ticket body.
        bugPath: bugPath,
        reproPath: reproPath
    }
})

// Tickets run one at a time in level order; the level boundary stays a
// strict barrier. Return control after dispatching: Pi wakes this session
// with the chain's result.
result = <the chain's return: { ok, failed?, step?, refs }>
```

Feature tickets route through the feature router
([resources/feature.md](resources/feature.md)); bug tickets through the bug
router ([resources/bug.md](resources/bug.md)). Each router selects the
pipeline for the ticket's mode: the autonomous pipeline carries the full
dispatch loop with the uncertainty path, the gate-refusal path, and the
per-level deviation-report reconciliation; the human-mode protocol is the
other branch.

**Human-owned tickets (mode: human) are hard-refused.** The router
**hard-refuses autonomous dispatch**: it never launches subagent chains for
a marked ticket and does not fall through to the subtype resource's
autonomous pipeline. It hands back the re-invocation
for the human to run:

> "This ticket is marked `mode: human`, so it is yours to implement. Run
> `/skill:implement-ticket <slug>` yourself, saying that you will implement
> it, and the human-mode protocol will walk you through it."

The refusal is a router rule, not a pipeline decision: it fires before any resource is selected, here and again in the feature and bug routers.

## Step 2 -- The inlined per-ticket close-out

The close-out runs inline, in the same autonomous run that lands the
ticket. The human never waits to type a close-out skill. The steps
interleave **Pi tool calls** with shell commands: the tw_* tools are tools
you invoke as functions, **not** shell binaries; wrapping them in a
`set -e` block makes them fail with `command not found` (exit 127) and
aborts the sequence. Call them as tools, and run the shell steps in a
separate bash block.

1. **CI gate.**

   ```
   git checkout task/<ticket-slug>
   git merge <effort-branch> 2>/dev/null || true
   ```

   Run the project's CI command, detected from repo tooling: package.json
   scripts, Makefile, CI config, or the `docs/testing.md` protocol; ask the
   user when ambiguous. If it fails: STOP. Fix forward on the landing
   branch. Do not merge a red branch.

   Fix-forward is a designed-for adjustment, record that it fired so its
   frequency can be correlated. Call `submit_feedback({ kind: "expected",
   data })` with `data` e.g. `"implement-ticket: CI gate red on
   <ticket-slug>, fixing forward"`.

2. **Knowledge harvest.** Read the ticket doc, all deviation reports from
   `docs/tasks/<effort>/tickets/<ticket-slug>/deviation-reports/`, and the
   combined diff. Fold durable knowledge into project docs: update
   `docs/testing.md` if new patterns or tools were discovered, update any
   other relevant docs under `docs/`, and append architecture lessons to the
   ticket doc's `## Implementation notes` through `tw_write_ticket_note`, the
   only writer of that section (the built-in edit is refused under
   `docs/tasks/`).
   Commit: `git add -A && git commit -m "docs(ticket): harvest knowledge for {ticketSlug}"`

3. **Changelog.** Write the entry through `tw_write_changelog`, the only
   writer of `docs/tasks/CHANGELOG.md` (the built-in write and edit are
   refused there): the slug, the ticket title, and a 3-5 line body naming
   the key changes and decisions and the outcome in one sentence. Commit
   through the shell: `git add docs/tasks/CHANGELOG.md && git commit -m
   "docs: changelog {ticketSlug}"` (the tool writes the file; the commit is
   git, not a tree mutation).

4. **Bug closure (subtype: bug only).** If the ticket's `subtype` is
   `feature` or absent, skip. Otherwise read the ticket body for the bug doc
   reference; if the body names no bug doc, ask the user which bug doc to
   close and do not proceed until answered. Read `docs/bugs/<slug>.md`, set
   `status: fixed`, fill `fix_commit` with the landing branch's SHA
   (`git rev-parse task/<ticket-slug>`), fill the Root cause and Fix summary
   sections from the ticket's `## Implementation notes` and deviation
   reports, commit, then archive the bug doc with
   `git mv docs/bugs/<slug>.md docs/bugs/archive/<slug>.md` and commit.
   (`docs/bugs/` is outside the write guard's scope, so these writes are
   legal there.)

5. **Mark the ticket done through `tw_mark_done`** (the one owner of the
   marking: this phase; the chain never marks it). The tool checks the
   changelog entry references the ticket before it writes
   `workflow_state: done`, so the changelog step must land first.

6. **Call the Pi tool** to verify the ticket is finalizable; the check also
   surfaces the effort graph's anomalies, which you should report if any
   appear:

   ```
   tw_finalizable <ticket-slug>   # Pi tool, not a shell command
   ```

7. **Call the Pi tool** to clear the current item (the state setter has no
   slice field and it is not called):

   ```
   tw_state_set task null   # Pi tool, not a shell command
   ```

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

## Step 3 -- End-of-effort pass

After every ticket has landed and closed out, run the wrap-up as one
pre-canned workflow script, `scripts/end-of-effort.js` in this skill's
directory (resolve its path against this skill's directory). It runs, in
order: the advisory whole-effort review (code-reviewer, two-axis), the
final architecture reconcile (spec-reconciler), the coherence refactor
(coherence-refactorer), and the suite gate (test-runner, reading the repo's
docs/testing.md protocol). This stage owns refactoring; the tdd-worker loop
is RED, GREEN only. The parent composes inputs and handles the result; it
never refactors, never edits the architecture document, and never runs the
suite itself.

**Determine scale first** (dispatch criteria, from the deviation reports):
- If TDD workers refactored out-of-scope code or altered API surfaces not
  in the architecture, **ask the user** before launching.
- If coherence would need large-scale refactors of out-of-scope code,
  **ask the user** before launching.
- Otherwise compose the inconsistency list and launch.

```js
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
```

- The review is advisory: read `result.refs.review` and surface its
  findings to the user. It does not gate landing or the close-out.
- On `result.failed == "suite"`: emergent cross-ticket breakage. Add the
  failures to the inconsistencies list and relaunch the workflow with
  `review: false` (the review already ran). Large, ambiguous, or
  API-surface failures go to the user instead of a relaunch.
- On `result.failed == "coherence"`: the refactorer stopped on a scope or
  API-surface boundary. Take its reason to the user; do not relaunch the
  same list.
- On `result.failed == "spec"`: relaunch once; a second failure goes to
  the user.

## Resuming and uncertainty

An in-progress ticket is a legal opener target: a resumed run picks it back
up. When a run discovers planning work it cannot settle itself, it stops
and tells the human to run `/skill:wayfinder`; do not improvise a hidden
plan, and do not re-open a settled planning task.

When a chain's tdd step stops on uncertainty
(`docs/tasks/<effort>/tickets/<ticket-slug>/.work/uncertainty.md` exists),
ask the human with the file's contents, record the resolution through
`tw_resolve_uncertainty` (it writes `.work/resolution.md`, deletes the
uncertainty file, and returns the path), and relaunch the chain with
`args.extra` pointing at the recorded resolution. Do NOT do the work
yourself: parent context is expensive, so routing through workers is always
cheaper.

## Step 4 -- Report

End the run with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves
are re-dispatch strategies, applied in this order:

1. **Diagnose first** -- read worker outputs and any partial diff. Never
   blindly redo.
2. **First failure -> split** -- split the ticket into sub-tickets
   registered in the effort, per the split rules below. Exception: if the
   ticket is already atomic, skip to retry.
3. **Second attempt -> retry +50%** -- re-run the chain with `timeoutMs`
   increased by 50 percent and `args.extra` pointing at the failed step's
   output reference (and any recorded resolution), so the worker re-reads
   its prior attempt. Never author prompt instructions for the worker; pass
   pointers.
4. **Backstop -> escalate** -- after two consecutive retries still fail,
   ask the user: "Two retries for ticket {ticket} failed. Should I increase
   budgets further, relax constraints, or skip this ticket?"

**Split rules (sub-tickets, never ad-hoc files).** A split goes through
`tw_split_ticket`, which creates each sub-ticket (inheriting the original's
subtype and `blocked_by`, with the new sub edges chained between the subs
and sizes taken from the diagnosis) and supersedes the original as
`status: deprecated` plus `workflow_state: done` with a body note naming
its sub-tickets, so the graph absorbs the split and the history reads. No
ad-hoc slice docs and no ad-hoc numbering convention exist; hand edits to
ticket files are refused by the write guard. Re-run the chain per
sub-ticket; the frontier and dependency levels pick the sub-tickets up like
any other ticket.

Hard rule: the parent context is large and expensive; routing through
workers is always cheaper than pulling the fix into the parent. The parent
never writes code or edits files as a fix.

Each toolbelt step is a designed-for adjustment, not a snag -- but record
which one fired so its frequency can be correlated. Each time you take a
toolbelt action, call `submit_feedback({ kind: "expected", data })` with
`data` naming the step, e.g. `"feature: split ticket <slug> after first
failure"` or `"feature: retry +50% on ticket <slug>"` or
`"feature: escalate ticket <slug> (two retries failed)"`. One call per
action, right when you take it.

## Workflow feedback

When the *workflow itself* snags -- a chain that keeps failing for the same
reason, a ticket that will not split, a worker that lacked a tool it needed,
a dependency level that blocked unnecessarily, an architecture document that
contradicted a ticket doc, or something that worked notably well -- call
`submit_feedback({ kind, data })` autonomously, without prompting. `kind`
is a short category (`good`, `bad`, `friction`, `architecture`); `data` is
one or two specific, actionable sentences about the *workflow*, not the
code. The tdd-worker, slice-verifier, deviation-reporter, and land-worker
agents also call this tool themselves; you do not need to relay their
friction, only record what you observe at the orchestration level.
Requires the `pi-telemetry` extension (`submit_feedback` tool).
