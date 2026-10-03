---
type: task
subtype: research
title: Pi progressive tool disclosure mechanics
status: stable
workflow_state: ready
blocked_by: []
---

# Pi progressive tool disclosure mechanics

## Question

What exactly does the Pi harness support for progressive tool disclosure, and
what is the minimal mechanism for a workflow skill to activate its toolset on
entry and deactivate it on exit, keyed to a skill invocation?

## What it unblocks

`grill-disclosure-mechanics` and `grill-gate-model-and-write-lockdown`.

## Trusted source boundaries

- Pi documentation: `docs/extensions.md` (events, tool exposure,
  `setActiveTools`, `prepareLoadout`), `docs/skills.md`, `docs/settings.md`,
  `docs/mcp.md`, `docs/cli.md`.
- Pi examples: `examples/extensions/plan-mode/index.ts`,
  `examples/extensions/dynamic-tools.ts`, `examples/extensions/preset.ts`,
  `examples/extensions/tools.ts`.
- Local: `src/pi.ts` (current tool registrations and the `input` hook),
  `src/core/repo-gate.ts`.

## Evidence required

A `findings.md` in this task directory recording, with citations:

- the exposure levels, and which are reachable without an explicit activation
  (specifically whether `deferred` tools can be reached through `tool_search`);
- how `pi.setActiveTools()` interacts with declarations, `/tree`, resume, and
  fork;
- how `prepareLoadout` and `hiddenDeclarations` behave;
- the per-agent scope of activation (parent versus subagent, fresh context);
- a minimal worked recipe for an opener that gates and activates, plus a
  closer that deactivates.
