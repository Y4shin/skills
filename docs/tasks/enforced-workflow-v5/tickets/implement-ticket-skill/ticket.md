---
type: ticket
subtype: feature
title: implement-ticket owns the ticket phase and the inline close-out
status: stable
workflow_state: ready
blocked_by: [implementation-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets]
size: xl
---

## What to build

`implement-ticket`, the model-invoked skill that owns the implementation
phase, replacing the ticket half of `implement-task` and all of
`finalize-task`.

It reads the architecture document rather than drafting one: a missing or
unstable `architecture.md` (or the legacy `arch-spec.md`) is an opener
refusal, never a draft step. It owns the ticket frontier, the dependency
level loop, the per-ticket chain dispatch, the end-of-effort pass, the
failure toolbelt, and the inlined per-ticket close-out.

Ticket concurrency: tickets within one dependency level may run concurrently;
tickets across levels serialize on the level boundary. Running tickets from
different levels at once is out of scope unless the human asks explicitly.

The per-ticket close-out runs inline, in the same autonomous run that lands
the ticket: CI gate, knowledge harvest, changelog write, done-marking,
close-out, and merge to main. The human never waits to type
`/skill:finalize-task`. This phase stays the only thing that sets a ticket's
`workflow_state: done`, so the one-owner rule holds.

Ticket resources and the chain scripts move under `implement-ticket/`. The
duplicate planning resources under `implement-task/resources/` are deleted
(the planning half is Wayfinder's now). `implement-task` and `finalize-task`
are retired to `skills/deprecated/` with their replacements named, and they
leave `package.json` `pi.skills`, the bucket README, and the docs page tree.

## Acceptance criteria

- [ ] `implement-ticket` exists as a model-invoked skill and opens through
      `tw_open`.
- [ ] A missing or unstable architecture document is refused, never drafted.
- [ ] The ticket frontier, the level loop, concurrency within a level, and
      serialization across levels are the skill's stated behavior.
- [ ] The per-ticket close-out (CI gate, knowledge harvest, changelog,
      done-marking, close-out, merge) runs inline in the same run.
- [ ] Only this phase sets a ticket's `workflow_state: done`.
- [ ] Ticket resources and `ticket-chain.js`/`end-of-effort.js` live under
      `implement-ticket/`; the chain return shapes are unchanged.
- [ ] `implement-task` and `finalize-task` are retired with replacements
      named and are absent from `pi.skills`.
- [ ] `tests/skills.test.ts`, `tests/skill-rewire.test.ts`, and the chain
      tests are green.

## Blocked by

- implementation-transition-tools (ticket marking and the changelog writer).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the implement-ticket gate and toolset).