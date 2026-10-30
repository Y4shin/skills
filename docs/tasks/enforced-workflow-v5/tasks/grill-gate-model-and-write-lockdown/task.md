---
type: task
subtype: grilling
title: Gate model and write lockdown
status: stable
workflow_state: done
blocked_by:
- grill-disclosure-mechanics
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

## Settled decisions

### Q1 - Gate preconditions live in the extension tools only (settled)

- The opener and every transition tool compute their own preconditions from the
  real artifact tree, the `src/core/graph.ts` path that `tw_frontier` already
  uses. That is the single source of truth.
- Host `gate:` commands stay where they already are, guarding real execution
  boundaries in the chain, and are not duplicated at skill entry.
- Rejected: a second fail-closed host gate at skill entry, which duplicates the
  truth and needs a `tw_*` CLI; or making the host gate primary and letting the
  extension only disclose, which inverts the design.

### Q2 - Named transition tools encode the state machine (settled)

- Replace free `tw_set` transitions with named tools whose preconditions encode
  the state machine, for example `tw_mark_done`, `tw_add_ticket`,
  `tw_split_ticket`, `tw_write_spec`, `tw_write_section`, and
  `tw_finalize_map`.
- The surface must cover every workflow write, because the write lockdown makes
  the tools the only writers: task and ticket creation, map sections, the
  specification, the architecture, the changelog, out-of-scope notes, and the
  archive move.
- Rationale: a free `tw_set` lets a model perform an illegal transition by
  setting a field directly, and simple-map Q4 already required `tw_set` to be
  unable to write `ready_for_spec`.
- Whether `tw_set` is removed entirely or kept for non-transitional metadata is
  Q5, asked next.

### Q3 - Block `write` and `edit` on `docs/tasks/**`; drop the bash scan (settled)

- The write guard blocks the built-in `write` and `edit` tools on
  `docs/tasks/**` only. `docs/bugs/**` is out of scope because the bug
  substrate retires (front-door Q1).
- The `bash` mutation scan is dropped entirely, for simplicity (the user's
  ruling). The guard is a `tool_call` handler on `write` and `edit` only.
- Every mutating operation that needs `bash` today moves into a tool instead:
  the archive move, the `git mv`, and the changelog write become `tw_*` calls,
  so no legitimate step needs `bash` on the tree.
- Accepted residual risk: a model that insists can still mutate the tree through
  `bash` (`rm`, `git`, `python -c`, and so on), because a command string cannot
  be gated soundly (U2). The protection is that no legitimate path needs it, not
  that the shell is blocked.
- Reading the tree with `bash` or `read` stays allowed, and the human's own
  editor is unaffected.

### Q4 - Every escape hatch stays, tool-mediated (settled)

- Keep all three hatches, each with a tool:
  - uncertainty: `tw_resolve_uncertainty`, which already exists;
  - split: a new `tw_split_ticket` that performs the split rules the feature and
    bug pipelines describe in prose today (create the sub-tickets, supersede the
    original as deprecated plus done);
  - out of scope: a new tool that writes the `out-of-scope note` artifact.
- Rationale: with direct writes locked, a prose instruction to "write the
  sub-tickets" cannot work, so every hatch needs a tool. The same treatment
  covers finalize-effort's finding disposition.
- The out-of-scope note's home and tool name are Q6, asked next.

## Frontier for round 2

Q5 (is `tw_set` removed entirely or kept for non-transitional metadata) and Q6
(the out-of-scope note's home and tool).

### Q5 - `tw_set` is removed (settled)

- Remove `tw_set` entirely. The user's ruling: remove it unless a legitimate use
  turns up down the line.
- Evidence: every real call site writes a transition, `workflow_state` to `done`
  or `blocked`, or `status` to `stable` or `deprecated`, and each of those
  belongs to a named tool (`tw_mark_done`, a blocked-state transition,
  `tw_write_spec`, and the supersede step in `tw_split_ticket`). No
  non-transitional metadata is left.
- If a genuine non-transitional need appears later, it gets its own named tool
  rather than a general escape hatch. `tw_state_set` survives, because it is
  already a named tool for the one state file, not a free-form field writer.

### Q6 - The out-of-scope hatch is `tw_record_out_of_scope` against the global KB (settled)

- One tool writes a rejected-or-deferred note into the global KB at
  `docs/tasks/out-of-scope/` and updates its index.
- The in-effort version of the same idea stays the map's `## Non-goals`. Work
  that is in scope but deferred becomes a ticket or a follow-up effort through
  `finalize-effort`, not a KB note.
- Rejected: a per-effort `docs/tasks/<effort>/out-of-scope.md`; dropping the
  global KB and letting `## Non-goals` be the only record.
- Flagged: with the front door turning every request into an effort, intake may
  reject nothing, so the KB's producers become wayfinder and the skills that
  defer work. That is a skill-surface detail.

## Frontier empty

Q1 to Q6 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q6 summary as the shared understanding, with the
  one amendment that `tw_set` is removed rather than narrowed. The planning task
  is done on that basis.
