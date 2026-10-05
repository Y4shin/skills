---
type: ticket
subtype: feature
title: Progressive disclosure core, the three-way flip, and nested opens
status: stable
workflow_state: ready
blocked_by: [bump-dependencies]
size: l
---

## What to build

The disclosure mechanism, built on the 1.0.0 API.

Register the gated workflow tools with `exposure: "direct"` and
`defaultActive: false`, the bypass-free combination the prototype proved.
`hidden` cannot be activated, and `deferred` plus codemode are reachable
through `tool_search` without the opener.

Add `tw_open`, `tw_close`, and `tw_next`:

- `tw_open` is a single dispatcher whose parameter contract is a
  discriminated union on `skill`. A Wayfinder open carries only the effort;
  a planning-task or ticket open carries the effort and the target. Runtime
  validation backs the union up in case a provider flattens it.
- `tw_open` refuses for exactly two reasons: the skill is already open, or it
  conflicts with a currently open skill. Exclusivity is a symmetric data
  table, so the check is order-independent and adding a skill is a table
  entry.
- Nested opens are supported. The open set is a set closed by name, not a
  stack.
- `tw_close` names the skill it closes and removes only the tools no other
  open skill still needs. It refuses if the named skill is not open.
- `tw_next` is declared in every state and never errors. Outside a skill it
  returns short prose about what to do next; inside a skill it says to finish
  the current work first and must not suggest closing the skill now. It never
  returns a structured frontier.

The declared set is two-state: idle declares `tw_open` and `tw_next`; a
working state declares the open skills' toolsets plus `tw_open`, `tw_next`,
and `tw_close`.

The opener absorbs the explicit `telemetry_skill_context` calls, recording
the skill, effort, and target automatically. `submit_feedback` stays
model-available. Skills do not declare `allowed-tools`.

## Acceptance criteria

- [ ] Before open, gated tools are absent, inactive, and unsearchable; after
      open they are declared and callable; after close they are absent and
      unsearchable again.
- [ ] Idle declares exactly `tw_open` and `tw_next`; a working state also
      declares `tw_close`.
- [ ] `tw_open` refuses a duplicate and a conflicting skill, order
      independently.
- [ ] A nested open adds a second toolset without disturbing the first.
- [ ] `tw_close` removes only the named skill's unneeded tools.
- [ ] `tw_next` answers in prose in both states and never errors.
- [ ] The opener records telemetry with no model call to
      `telemetry_skill_context`.
- [ ] The nested-open integration test is green: open a phase, nest
      `skill-creator`, assert the declared set is the union of both toolsets,
      close `skill-creator`, assert the phase is still open with its own
      tools intact.
- [ ] Open state survives `/tree` and resume via the transcript restore path.

## Blocked by

- bump-dependencies (the `exposure`, `defaultActive`, `setActiveTools`, and
  `tool_search` APIs exist only after the bump).