---
type: task
subtype: grilling
title: Gate model and write lockdown
status: stable
workflow_state: ready
blocked_by: [grill-disclosure-mechanics]
---

# Gate model and write lockdown

## Decision to settle

Where the gates live, how writes under `docs/tasks/` and `docs/bugs/` are
locked down, and how the existing escape hatches survive.

## Parent decisions it depends on

`grill-disclosure-mechanics`, because the gate surface and the disclosure
surface are the same tools.

## Choices already known

- Extension preconditions only, or preconditions plus host gate commands at
  skill entry as a second, fail-closed layer.
- Keep free `tw_set` versus replacing it with named transition tools such as
  `tw_write_spec` and `tw_add_ticket`.
- Escape hatches: uncertainty (`tw_resolve_uncertainty`, exists), split
  (`tw_split_ticket`), out-of-scope, all tool-mediated.
- `bash` coverage: scan the command string, or move the git operations that
  need it (finalize's `git mv`, the archive move) into tools.

## Recommended starting answer

Tool preconditions are the source of truth, with host gate commands at skill
entry as a second layer. Replace free `tw_set` with named transition tools
whose preconditions encode the state machine. Keep every escape hatch, but
tool-mediated. Block `write` and `edit` on the two trees, and cover `bash` by
moving the git operations into tools so no scanning heuristic is needed.

## Downstream work it may create

The schema 5 plan, the skill surface, and the router's refusal messages.
