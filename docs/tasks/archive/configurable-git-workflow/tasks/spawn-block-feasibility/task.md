---
type: task
subtype: research
title: Establish how the extension blocks a sub-agent spawn and what identifies the child
status: deprecated
workflow_state: done
blocked_by: []
---

## Question

The operator's requirement, recorded as settled: spawning any implementation
sub-agent is blocked when the checkout is not on the branch that child must
commit on. The operator called the mechanism an implementation detail but does
want it documented. This task establishes whether the requirement is
implementable as stated and what it needs.

## What to find, with evidence

1. Whether a `tool_call` handler in this extension can block the `subagent` tool
   before the child launches, and what the caller sees (an error result, a
   refusal message, a failed step).
2. What the call input carries that identifies the child: the agent name, the
   task text, `args`, or another structured field. pi's extension docs say a
   `tool_call` handler sees the tool input, so the question is whether
   pi-subagents passes a machine-readable ticket slug or only prose.
3. If only prose, whether the chain script can pass the slug in a field the
   handler reads (for example `args: { ticket, effort, phase }`), or whether the
   spawn block has to parse the task text.
4. The workflow-script case: the chain launches children from inside a workflow
   run. Whether those launches go through the same `subagent` tool call, and so
   through the same handler, or through a separate path.
5. The fallback if a spawn block cannot see the ticket: the chain's host gate
   asserts the expected branch and fails the run, which is after the fact.

## Why it matters

The spawn guard is the only enforcement point that stops work before it happens
on the wrong branch. If the ticket identity cannot reach the handler, the guard
either moves into the chain gates or needs a new parameter convention.

## Output

An evidence note in this task's `## Notes`: the verified block surface, the
identifier available, the fallback, and the pi-subagents version the evidence is
pinned to.

## Notes

## Findings (Pi 1.5.0, pi-subagents 0.86.0, repo 5.4.0 at 9ba3204)

- **A spawn can be blocked before the child exists.** A `tool_call` handler
  returns `{ block: true, reason }` and the call becomes an error tool result;
  throwing also blocks. Two surfaces exist:
  - the outer `subagent` call, which stops before any child is created and shows
    the model the reason;
  - the per-child `subagent_launch` call, which pi-subagents offers to the
    session's handlers for every workflow child start, so a workflow child can be
    refused individually and the workflow sees "Workflow child '<key>' was not
    started".
- **`runs.run` and `runs.all` are not a hidden path.** They go through the same
  `subagent_launch` tool call, so the same handlers see them.
- **What identifies the child pre-spawn.** The outer call carries `agent`,
  `workflow`, and a free-form top-level `args` (where the chain already puts
  `ticket`, `effort`, `ticketPath`, `subtype`), plus `options`. The per-child
  `subagent_launch` input is a closed set of ten fields (`workflowRunId`, `key`,
  `agent`, `task`, `cwd`, `model`, `async`, `worktree`, `resume`, `commands`,
  `output`). Extra fields passed to `runs.run` do not reach the handler, and
  `label` is display-only. So the ticket identity comes from the outer `args`, a
  `key` that embeds the slug, the `output` path, or the task prose.
- **Host gates run after the child finishes**, so the existing branch assertions
  enforce after the fact. A raw workflow script has no pre-child host command.
- **Blast radius.** An outer block means no run at all. A blocked `runs.run` child
  throws a tagged error and the chain aborts, failing the whole chain as a child
  failure. A blocked `runs.all` item resolves `{ ok: false }`, so the chain
  returns its usual `{ ok: false, failed }` shape.
- **Coverage gaps**: schedule ticks, auto-resume, `/prompt-workflow`, prompt
  template delegation, RPC and SDK launches, workflows started inside a child,
  children reused from a journal, and a `--tools` allowlist that drops
  `subagent_launch`.

## Recommendation

Two layers, in the package's existing `tool_call` hook. Primary: block the outer
`subagent` call, reading `workflow` and `args` (`ticket`, `effort`) for chain
launches and `agent` for direct spawns, comparing `git rev-parse --abbrev-ref
HEAD` against the profile's expected branch. Backstop: block `subagent_launch`
for the chain's worker agents, taking the ticket from a `key` that embeds the
slug. Keep the chain's host gates as defense in depth, not as the enforcement
point.

Settled elsewhere: the phase creates both ticket branches before dispatch, so the
expected branch at the `tdd-worker` spawn is the working branch.

## Unresolved (operator decisions)

1. Which branch a spawn expects where the worker used to create its own: with the
   phase creating the branches first, the guard expects `ticket/<slug>` for
   `tdd-worker` and `task/<slug>` for `land-worker`.
2. Whether launches outside the model's tool path (slash, RPC, schedule,
   prompt-template) need blocking now or are recorded as out of scope.
3. Whether to depend on the internal `launch.json` lookup, which is undocumented
   and async-top-level only.

Evidence is documentation and source; no live Pi session was launched.
