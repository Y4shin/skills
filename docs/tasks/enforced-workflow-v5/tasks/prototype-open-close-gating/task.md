---
type: task
subtype: prototype
title: Validate open/close disclosure and the write guard
status: stable
workflow_state: done
blocked_by:
- research-pi-tool-disclosure
---

# Validate open/close disclosure and the write guard

## Question

Does a `tw_open` / `tw_close` pair reliably gate and disclose a workflow
toolset, and does a `tool_call` guard actually block `write`, `edit`, and
`bash` mutations under `docs/tasks/**` and `docs/bugs/**`?

## Premise corrected by `research-pi-tool-disclosure`

`hidden` exposure cannot gate: hidden tools are unreachable and
`setActiveTools()` cannot activate them. `deferred` is bypassable through
`tool_search`. The gate to validate is `exposure: "direct", defaultActive:
false`, activated only by the opener. See
`tasks/research-pi-tool-disclosure/findings.md` (F1, F2, F3, F8).

## Alternatives worth comparing

- One `tw_open({ skill, effort })` dispatcher versus per-skill
  `open_wayfinder`-style tools.
- Keying the opener to the skill body versus an `input` hook that matches
  `/skill:<name>` (the hook fires before skill expansion; the body call is the
  reliable path).
- Blocking `bash` by scanning the command string versus moving those
  operations into tools so bash never needs to touch the trees.

## Smallest artifact that can answer it

A throwaway extension (never shipped) that registers two `tw_*` tools with
`exposure: "direct", defaultActive: false`, one opener, one closer, and a
`tool_call` guard on `write`, `edit`, and `bash`. It demonstrates that the
tools are invisible and unsearchable before opening, visible and callable
after opening, invisible again after closing, that `tool_search` cannot
surface them while closed, that open and close survive `/tree` and resume,
and that a `docs/tasks` write is refused with a clear reason.

## Who reacts

The user.

## What it unblocks

`grill-disclosure-mechanics`; its result also constrains
`grill-gate-model-and-write-lockdown`.

## Prototype status

`findings.md` (same directory) holds the observations from the throwaway
extension in gitignored `.work/prototype/`: with `exposure: "direct",
defaultActive: false`, the gated `tw_*` tools are absent and unsearchable
before `tw_open`, declared and callable after it, and absent again after
`tw_close`; `tool_search` finds a `deferred` decoy but never the gated tools;
and the `tool_call` guard blocks `write`, `edit`, and `bash` under
`docs/tasks/**` and `docs/bugs/**` while allowing writes elsewhere.

`tw_open` also behaves as the gate, harness-verified: given a target it reads
the effort state and checks existence, `workflow_state`, same-kind
`blocked_by`, and frontier membership; on refusal it activates nothing and
returns `{ opened: false, reason, legal_next }` with a phase-correct
legal-next-calls menu, and a legal target returns `{ opened: true, active }`.
The harness is at 67 PASS, 0 FAIL, with the original 49 checks preserved.

The task question is answered. The live reaction confirmed the transcript
restore after `/tree` and resume (O9) and interactive parity for the
disclosure flip and the guard (O8), so the design is verified by run and not
only by source. What remains is not a blocker for this task: the gate reads a
fixture state table rather than the live effort scan, so wiring it to
`src/core/graph.ts` is still open (U6); bash command-string scanning is an
inherently bypassable heuristic (U2); the opener was not keyed to a real skill
invocation (U3); headless model behavior is a single sample (U4); and fork
shares the resume restore path but was not exercised on its own. The throwaway
extension in the gitignored `.work/prototype/` is deleted now that the
reaction is in; `findings.md` keeps the evidence, the rejected alternatives,
and the decision-rich snippets.

Observed constraint for the effort: progressive disclosure needs
`@earendil-works/pi-coding-agent` 1.0.0; this repo resolves 0.80.10, which has
no `exposure`, `defaultActive`, or `tool_search` API.
