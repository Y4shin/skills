---
type: task
subtype: prototype
title: Validate open/close disclosure and the write guard
status: stable
workflow_state: ready
blocked_by: [research-pi-tool-disclosure]
---

# Validate open/close disclosure and the write guard

## Question

Does a `tw_open` / `tw_close` pair reliably gate and disclose a workflow
toolset, and does a `tool_call` guard actually block `write`, `edit`, and
`bash` mutations under `docs/tasks/**` and `docs/bugs/**`?

## Alternatives worth comparing

- One `tw_open({ skill, effort })` dispatcher versus per-skill
  `open_wayfinder`-style tools.
- `hidden` exposure plus `pi.setActiveTools()` versus `deferred` exposure plus
  `tool_search`. The latter may let a model bypass the skill by searching for
  the tool directly.
- Blocking `bash` by scanning the command string versus moving those
  operations into tools so bash never needs to touch the trees.

## Smallest artifact that can answer it

A throwaway extension (never shipped) that registers two hidden `tw_*` tools,
one opener, one closer, and a `tool_call` guard on `write`, `edit`, and
`bash`. It demonstrates that the tools are invisible before opening, visible
and callable after opening, invisible again after closing, and that a
`docs/tasks` write is refused with a clear reason.

## Who reacts

The user.

## What it unblocks

`grill-disclosure-mechanics`; its result also constrains
`grill-gate-model-and-write-lockdown`.
