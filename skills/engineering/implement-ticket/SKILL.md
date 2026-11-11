---
name: implement-ticket
description: "Autonomous. Owns the implementation phase: reads the effort's architecture document, works the ticket frontier in dependency levels, dispatches the per-ticket chain per ticket, and closes each landed ticket out inline (CI gate, knowledge harvest, changelog, done-marking, push of the effort branch). The successor to the ticket half of the retired implementation router and the retired close-out skill."
---

# Implement Ticket

Every message to the operator follows the `operator-communication`
skill: load it before your first message.

If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.

`implement-ticket` is the implementation phase. It replaces the ticket half
of the retired implementation router and all of the retired close-out skill:
one skill dispatches every
per-ticket chain and closes each landed ticket out in the same run. It is
model-invoked, so the model reaches for it whenever implementation work is
ready; the human can also run `/skill:implement-ticket` explicitly.

## Open first

This phase's first action is its branch step, and the branch step comes from
the profile rather than from this file. Call `tw_phase_brief` with
`{ skill: "implement-ticket", effort: "<effort-slug>", ticket: "<ticket-slug>" }`
before anything else: it reports the branch this phase must be on, the step
that creates that branch off the trunk when it does not exist yet, and the
phase's instruction text. Perform the step it reports, then open. A repository
whose profile names different branches needs no edit here.

Every run starts by opening the skill: call `tw_open` with
`{ skill: "implement-ticket", effort: "<effort-slug>", target: "<ticket-slug>" }`.
The opener is the gate, and the branch is the first half of it: a checkout that
is not on the branch the brief reported is refused, naming the branch the
checkout is on, the required branch, and the step that creates it. Nothing
latches, so creating that branch off the trunk and retrying the open passes. A
run that skipped the brief is refused by the same check, and both read one
resolver, so the brief and the refusal cannot disagree.

The opener's other checks: it checks the effort's work state (ticket generation
ran, work remains), the architecture document (a missing or unstable one is
refused here and is never drafted below), and the target ticket's readiness
(a ticket that is done, blocked, or not yet ready is refused with the legal
next calls). It activates the toolset only when they pass. Work only through the tools the
opener discloses. When a step genuinely needs a tool this phase does not
disclose, call `tw_request_tool` and let the operator decide: never close the
phase early to reopen another one for its tools. Close the phase with
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
checkout` a different ticket branch in the same tree, and the
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

**Branch step.** The phase is on the effort branch its brief reported, and the
open refuses from anywhere else. For each ticket, ask the brief again with the
ticket's slug and the worker that will run (`skill: "tdd-worker"` for the
implementation step): it answers with the branch that worker requires and the
step that creates it off the effort branch. **This phase creates and checks that
branch out before it dispatches the chain, not a worker**: every worker expects
its branch already checked out, and the spawn guard blocks an
implementation spawn made from anywhere else, naming the branch to create and
nothing else, so a dispatch that skips the step fails that step instead of
starting a worker on the wrong branch. There is no landing branch: the chain
merges the finished ticket's branch into the effort branch and deletes it, so
the next ticket's branch is created off the effort branch and sees the code
its blockers delivered. A profile that requires no branch says so, and the
phase dispatches directly.

`<effort-branch>` below is the branch the brief reported, never a name written
here.

**Communication via context pointers.** Communicate to and from subagents
primarily through context pointers (to the architecture document, ticket
docs, research notes, previous commits). Do not duplicate information
already available via pointers; pass the pointer, not the content.

The chain ships as a pre-canned workflow script,
`scripts/ticket-chain.js` in this skill's directory (shared by the feature
and bug pipelines): resolve its path against this skill's directory, launch
it once per ticket with `async: true` and the ticket's parameters as
`args`, and it owns the preconditions gate, the step order, the ok-gates,
and the per-step output bindings. The land-worker reports the landing note
in its output and the phase writes it through `tw_write_ticket_note`, the
named writer for a ticket doc. The phase writes it rather than the worker: an
agent's `tools:` allowlist does not load the extension that registers the
writer, so a worker would need this package loaded in its own child session. Each child task is composed from identity
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

// The two branch names the chain's host gates assert. A workflow script has
// no filesystem and no tools, so the phase resolves the profile's templates
// and passes the names in. The ticket branch is created here, by this phase,
// before the dispatch; a profile that requires no branch passes neither name
// and the chain asserts no branch.
effortBranch = <this phase's brief branch>
ticketBranch = tw_phase_brief(
    { skill: "tdd-worker", effort: effortSlug, ticket: ticketSlug }
).branch

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
        // The resolved branch names: the chain's host gates assert these and
        // the land step merges one into the other. The merge flag is the
        // profile's too, so the chain never writes one down.
        branch: ticketBranch,
        effortBranch: effortBranch,
        merge: <this phase's brief merge flag>,
        // bug only, optional: a separate bug doc and reproduction path,
        // passed only when the ticket body names them. Schema 5 keeps the
        // defect record in the ticket body, so most bug tickets pass neither.
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

   The chain leaves the checkout on the effort branch, where its land step
   merged the ticket's branch and deleted it; a profile that requires no branch
   leaves the checkout where it found it. Run the
   project's CI command, detected from repo tooling: package.json
   scripts, Makefile, CI config, or the `docs/testing.md` protocol; ask the
   user when ambiguous. If it fails: STOP. Fix forward on the effort branch
   before the next chain is dispatched. A red effort branch never carries into
   the next ticket.

   Fix-forward is a designed-for adjustment, record that it fired so its
   frequency can be correlated. Call `tw_feedback({ kind: "expected", data })`
   with `data` e.g. `"implement-ticket: CI gate red on <ticket-slug>, fixing
   forward"`.

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

4. **There is no bug-closure step.** A bug ticket's record is the ticket
   itself: `docs/bugs/` is a static archive in schema 5, the defect's doc and
   reproduction are read from the ticket body as the spec source, and nothing
   in this phase writes under `docs/bugs/`.

5. **Mark the ticket done through `tw_mark_done`** (the one owner of the
   marking for a landed ticket: this phase; the chain never marks it). The tool
   checks the changelog entry references the ticket before it writes
   `workflow_state: done`, so the changelog step must land first. The rule has
   two sanctioned exceptions, named so it reads true: wayfinder's
   planning-task half of `tw_mark_done` marks planning tasks (that half
   refuses tickets), and `tw_split_ticket` supersedes an oversized ticket as
   `status: deprecated` plus `workflow_state: done`.

6. **Call the Pi tool** to verify the ticket is finalizable; the check also
   surfaces the effort graph's anomalies, which you should report if any
   appear:

   ```
   tw_finalizable <ticket-slug>   # Pi tool, not a shell command
   ```

7. **Call the Pi tool** to clear the current item (the state setter takes
   pointers only, so the task pointer is the one cleared):

   ```
   tw_state_set task null   # Pi tool, not a shell command
   ```

   The pointer file is tracked, so it is committed with the note in step 8:
   never leave `docs/tasks/state.yaml` dirty across the next chain's
   checkout.

8. **Record the note on the effort branch** (shell, safe under `set -e`).
   There is no second merge here: the chain already merged the ticket's branch
   into `<effort-branch>` and deleted it, so the checkout is on the branch
   this phase must leave its work on.

   First write the note the land-worker reported through
   `tw_write_ticket_note` (selector: the ticket doc, note: its
   `## Implementation note`), and commit it here: `git add docs/tasks/ &&
   git commit -m "docs(ticket): note {ticketSlug}"`. The `git add docs/tasks/`
   covers the note and the `state.yaml` pointer cleared in step 7, so both land
   in this commit. The worker cannot write the note: its session has no phase
   open.

   Then push per the profile's push policy, which this phase's brief reports
   next to the branch: a policy the profile sets to never means the phase
   pushes nothing and the commits stay local, and a repository with no remote
   has nothing to push to.

   ```bash
   set -e
   git push origin <effort-branch>
   ```

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

- The review is advisory: read `result.refs.review`, surface its findings to
  the user, and record them in the effort tree through `tw_write_review`
  with `pass: "end-of-effort"`, which writes
  `docs/tasks/<effort>/end-of-effort-review.md`. That file is the landing
  place finalize-effort's triage reads; a review that only lives in a run
  artifact is never dispositioned. It does not gate landing or the
  close-out.
- The reconcile's output is `result.refs.spec`; the reconciler child cannot
  write `docs/tasks/`, so record the reconciled document through
  `tw_write_architecture` (this phase holds the writer) before the close-out
  report. Use `section: "<heading>"` per corrected section when only parts of
  the document moved; resend the whole body only when the design changed
  throughout. A reconcile that is never recorded leaves the living
  architecture document stale.
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

Keep the report in the operator's terms. Three checks it must pass:

- Every term you coined or read during this run is defined in the sentence
  that first uses it, or it is left out.
- The first sentence gives the state of the work now.
- Nothing is labelled before it is explained: no heading, bold lead-in, or
  bullet label names something the operator has not already seen.

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
ad-hoc artifact docs and no ad-hoc numbering convention exist; hand edits to
ticket files are refused by the write guard. Re-run the chain per
sub-ticket; the frontier and dependency levels pick the sub-tickets up like
any other ticket.

Hard rule: the parent context is large and expensive; routing through
workers is always cheaper than pulling the fix into the parent. The parent
never writes code or edits files as a fix.

Each toolbelt step is a designed-for adjustment, not a snag -- but record which
one fired so its frequency can be correlated. Each time you take a toolbelt
action, call `tw_feedback({ kind: "expected", data })` with `data` naming the
step, e.g. `"feature: split ticket <slug> after first failure"` or `"feature:
retry +50% on ticket <slug>"` or `"feature: escalate ticket <slug> (two retries
failed)"`. One call per action, right when you take it.

## Workflow feedback

When the *workflow itself* snags -- a chain that keeps failing for the same
reason, a ticket that will not split, a worker that lacked a tool it needed, a
dependency level that blocked unnecessarily, an architecture document that
contradicted a ticket doc, or something that worked notably well -- call
`tw_feedback({ kind, data })` autonomously, without prompting. `kind` is one of
`good`, `bad`, `friction`, `architecture`; `data` is one or two specific,
actionable sentences about the *workflow*, not the code. The tdd-worker,
slice-verifier, deviation-reporter, and land-worker agents also call this tool
themselves; you do not need to relay their friction, only record what you
observe at the orchestration level. Requires the `pi-telemetry` extension.
