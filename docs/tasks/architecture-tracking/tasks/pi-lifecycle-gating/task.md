---
type: task
subtype: research
title: Which Pi lifecycle hooks and subagent surfaces does the architecture tooling actually get?
status: stable
workflow_state: ready
blocked_by: []
---

## Question

Which Pi lifecycle surfaces exist for this design, and are they reachable from
the session that actually implements a ticket?

The proposal names five things it cannot verify from prose: whether a turn-end
hook exists and when it fires relative to tool calls, whether a file-change or
tool-completion hook can schedule checks, how a subagent's session loads an
extension and which tools it can therefore call, whether a `tool_call` guard
blocks a subagent the same way it blocks the parent, and what happens to results
still pending at turn end and to warnings still queued when the worker stops.

## The decision it unblocks

`workflow-surface`: which tools the architecture model gets, which phases
disclose them, and whether live checking lives in the worker's own session.

## Trusted source boundaries

The Pi documentation and examples installed with the harness (extension
lifecycle, hooks, custom tools, subagent sessions), and this package's own
source, which is the working reference for what has already been proved:
`src/pi.ts` registers a `tool_call` hook (`guardTaskTreeWrites`),
`src/disclosure.ts` gates tools by phase, and the agents under `agents/` show how
a worker is dispatched. Prefer reading the harness's own docs and type
definitions over blog posts.

## Evidence required

- The hook names available, with the signature and the ordering guarantee for
  each: turn start, turn end, tool call, tool result, file change, session stop.
- Whether a hook can inject a message into the running turn, and what the
  delivery point is.
- How a subagent session is created (which extension loading applies, whether
  the parent's registered tools are inherited, and how the existing
  `tools` allowlist interacts with a phase-disclosed toolset).
- Whether `tool_call` blocks inside a subagent.
- What happens to a queued batch when the worker's session ends mid-flight.
- A short statement of which of the proposal's claims are supported, which are
  false, and which remain untested because they need a live worker session.

## Likely dependents

`workflow-surface`, and the ticket-time design of the live checker. If a needed
hook does not exist, say so: it changes the design rather than being a defect to
work around.
