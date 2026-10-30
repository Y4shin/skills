# Implement Ticket (bug path)

Implements one bug ticket through a lean chain: no architecture conversation,
no deviation reporting step (a bug-only effort has no architecture document
by design). The opener's gate checked the effort's work state and, for a
bug-only effort, the architecture check is exempt. The spec fed to the chain
is the bug doc and its reproduction, both referenced from the ticket body,
plus the ticket doc.

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
on verify. The chain ships as a pre-canned workflow script,
`scripts/ticket-chain.js` in this skill's directory (shared with the feature
pipeline): resolve its path against this skill's directory, launch it once
with `async: true` and the ticket's parameters as `args`, and it returns
`{ ok, failed?, step?, refs }` (`step` is the failed step's receipt for
diagnosis, `refs` the durable output references). Each child task is
composed from identity and pointers only; procedure lives in the agent
definitions and the tdd / diagnosing-bugs skills, and the caller never
authors worker prompts. It opens with the
read-only `implement-preconditions` gate: the chain refuses to run when
the ticket doc does not exist, is human-owned, or does not match the
dispatched subtype; on a gate refusal, re-resolve the ticket, rebuild the
args, and relaunch once (a second refusal goes to the user; the failure
toolbelt never applies). Point the state file at the ticket before the
chain runs: `tw_state_set task <ticket-slug>`.

> **Async dispatch (hard rule):** launch this chain with `async: true`. Never
> run a blocking/foreground subagent. After dispatching, return control; Pi
> wakes this session on completion or attention, so no wait call is needed;
> the run stays tracked, interruptible, and steerable.

```
// Budgets come from the ticket's size; absent means m, never an error.
size = tw_get(ticketPath, "size") || "m"
budgetMinutes = { s: 15, m: 30, l: 45, xl: 60 }
const timeoutMs = (budgetMinutes[size] || budgetMinutes.m) * 60 * 1000

// Resolve the chain script's path against this skill's directory,
// then launch it once per ticket.
runId = subagent({
    async: true,
    timeoutMs,
    // The chain holds quiet while its workers run, so the run watchdog's
    // idle needs_attention pings are pure noise. Completion, failure,
    // and the active_long_running notice still notify.
    control: { notifyOn: ["active_long_running"] },
    workflow: "<skill-dir>/scripts/ticket-chain.js",
    args: {
        effort: effortSlug,
        ticket: ticketSlug,
        ticketPath: ticketPath,
        subtype: "bug",
        bugPath: bugPath,
        reproPath: reproPath
    }
})

// Return control after dispatching; Pi wakes this session with the chain's
// result, tracked, interruptible, and steerable.
result = <the chain's return: { ok, failed?, step?, refs }>
```

The ticket's `workflow_state` is NOT marked by the chain: this phase's
inline close-out owns the marking, one owner.

## Step 2 -- The inlined per-ticket close-out

After the chain returns ok, run the close-out in this same run. The steps
interleave **Pi tool calls** with shell commands: the tw_* tools are tools
you invoke as functions, **not** shell binaries; wrapping them in a
`set -e` block makes them fail with `command not found` (exit 127) and
aborts the sequence. Call them as tools, and run the shell steps in a
separate bash block.

1. **CI gate**: checkout `task/<ticket-slug>`, `git merge main 2>/dev/null
   || true`, run the project's CI command (from the `tw_context` profile or
   detected from repo tooling; ask the user when ambiguous). A red branch
   is never merged: fix forward on the landing branch, and record that
   fix-forward fired with `submit_feedback({ kind: "expected", data })`.
2. **Knowledge harvest**: read the ticket doc and the combined diff; fold
   durable knowledge into `docs/testing.md` and other relevant docs, and
   append root-cause lessons to the ticket doc's `## Implementation notes`.
   Commit:
   `git add -A && git commit -m "docs(ticket): harvest knowledge for {ticketSlug}"`
3. **Changelog**: write the entry through `tw_write_changelog`, the only
   writer of `docs/tasks/CHANGELOG.md` (the built-in write and edit are
   refused there): the slug, the ticket title, and a 3-5 line body. Commit
   through the shell afterwards (the commit is git, not a tree mutation):
   `git add docs/tasks/CHANGELOG.md && git commit -m "docs: changelog {ticketSlug}"`
4. **Bug closure**: read the ticket body for the bug doc reference; if the
   body names no bug doc, ask the user which bug doc to close and do not
   proceed until answered. Read `docs/bugs/<slug>.md`, set `status: fixed`,
   fill `fix_commit` with the landing branch's SHA
   (`git rev-parse task/<ticket-slug>`), fill the Root cause and Fix
   summary sections from the ticket's `## Implementation notes`, commit,
   then archive the bug doc with
   `git mv docs/bugs/<slug>.md docs/bugs/archive/<slug>.md` and commit.
5. **Mark the ticket done through `tw_mark_done`** (the one owner of the
   marking: this phase; the chain never marks it). The tool checks the
   changelog entry references the ticket before it writes
   `workflow_state: done`, so the changelog step must land first.
6. **`tw_finalizable <ticket-slug>`** (Pi tool, not a shell command):
   verifies the ticket is finalizable and surfaces the effort graph's
   anomalies, which you should report if any appear.
7. **`tw_state_set task null`** (Pi tool, not a shell command): clears the
   current item pointer.
8. **Merge the landing branch into main** (shell, safe under `set -e`):

   ```bash
   set -e
   git checkout main
   git merge --no-ff task/<ticket-slug> -m "ticket: finalize {ticketSlug}"
   git branch -d task/<ticket-slug>
   ```

   If remote exists: `git push origin main`

There is **no per-ticket move**: the ticket stays in the live effort.
Moving one ticket out would split the effort's graph scope and trip the
spec-plus-zero-tickets rule; the effort archives as a unit.

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

// Return control after dispatching; Pi wakes this session with the review
// result. Then read it and surface the findings to the user.
```

Read `review/result.md` and surface the findings to the user.

## Step 3  --  Report

Report with the skill's completion report resource,
[resources/report.md](../report.md): the fixed five-part shape, tuned for
this skill, which names the next step (continue the frontier, or, when
every ticket has landed and closed out, the end-of-effort pass and then
`/skill:finalize-effort <effort-slug>`). A refusal, failure, or escalation
is the same shape.

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first**  --  read worker outputs and any partial diff. A budget-exhausted tdd-worker attempt is the preferred diagnostic; its findings seed the sub-ticket breakdown. Never blindly redo.
2. **First failure → split**  --  split the ticket into sub-tickets registered in the effort: go through
   `tw_split_ticket`, which creates each sub-ticket at
   `docs/tasks/<effort>/tickets/<sub-ticket-slug>/ticket.md` (inheriting the
   original's subtype and `blocked_by`, with the new sub edges chained
   between the subs and sizes taken from the diagnosis) and supersedes the
   original as `status: deprecated` plus `workflow_state: done` with a body
   note naming its sub-tickets. The split rules in the feature
   pipeline's failure toolbelt apply here in full; hand edits to ticket
   files are refused by the write guard. Exception: if the ticket is
   already atomic, skip to retry.
3. **Second attempt → retry +50%**  --  re-run the chain with timeoutMs increased by 50% and args.extra pointing at the failed step's output reference (and any recorded resolution), so the worker re-reads its prior attempt. Never author prompt instructions for the worker; pass pointers.
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
