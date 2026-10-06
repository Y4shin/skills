---
name: to-tickets
description: "Turn a settled spec into the living architecture document and a tracer-bullet ticket graph under docs/tasks/<effort>/, both written through the tw_* transition tools; the opener is the gate."
disable-model-invocation: true
---

# To Tickets

`to-tickets` turns a settled specification into two artifacts: the **living
architecture document** and the **ticket graph**. The architecture is
produced from the spec, not invented fresh.
It inlines the spec's architecture content in full,
then adds the implementation-facing material. The ticket graph breaks the
work into **tracer bullet** tickets: vertical slices, each declaring the
tickets that block it. The phase quizzes you on the proposed breakdown before
anything is written.

## Open first

Every run starts by opening the skill: call `tw_open` with
`{ skill: "to-tickets", effort: "<effort-slug>" }` (the effort slug is the
directory name under `docs/tasks/`). The opener is the gate: it checks the
phase preconditions against the artifact tree, refuses with the legal next
calls when they fail, and activates the toolset only when they pass. Work only
through the tools the opener discloses, and close the phase with
`tw_close to-tickets` when it releases.

## The architecture document

Read the spec at `docs/tasks/<effort>/spec.md` and inline its architecture
content **in full**, then add what implementation needs on top of it:

- **Per-ticket exports**: what each ticket hands the tickets that depend on it;
- **Existing abstractions to use**, so the tickets stand on what is already
  there;
- **Do-not-reimplement** notes, naming the parallel versions not to invent;
- **Seams**: the boundaries where tickets, tests, and tools meet the code;
- **Per-ticket interface contracts**: what each ticket promises the tickets
  that depend on it, so they can be implemented in dependency order without
  re-deriving the design.

Write the document with `tw_write_architecture`
(the only writer of the architecture document)
at `docs/tasks/<effort>/architecture.md`. The document is the living
architecture from then on: every later change goes through the same writer,
and the specification's architecture content becomes archival.
The write also adds the note to `spec.md` pointing at the architecture,
and deletes nothing from the specification.

End the phase with a publish write (`publish: true`) so the document is
stable when the implementation phase reads it.

A **bug-only effort produces tickets with no architecture document**. The spec
is always present; the architecture exists exactly when the ticket graph
needs interface contracts. When every ticket in the graph is a bug fix,
skip the architecture write entirely and produce the tickets alone.

## The tickets

### Draft the graph, then quiz the user

Work from the spec and whatever is already in the conversation context. If
you have not already explored the codebase, do so to understand the current
state of the code: ticket titles and bodies should use the project's domain
glossary vocabulary (read `CONTEXT.md` if it exists) and respect ADRs in the
area you are touching. Look for opportunities to prefactor the code to make
the implementation easier. "Make the change easy, then make the easy change."

Present the proposed breakdown as a numbered list before creating anything.
For each ticket, show:

- **Title**: short descriptive name
- **Subtype**: feature or bug
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that
  genuinely gate it?
- Should any tickets be merged or split further?

Iterate until the user approves the breakdown.

### Create the tickets in dependency order

Create each approved ticket with `tw_add_ticket`, the only ticket creator. It
validates `blocked_by` at creation (kind-scoped: only existing tickets of the
same effort; no dangling edges), so create the tickets in dependency order:
blockers first, each new ticket naming its blockers as they are created.
Hand edits to ticket files are refused by the write guard, and there is no
wiring step after creation: the edges are already wired when the last ticket
lands.

`tw_add_ticket` writes the v5 ticket shape at
`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`:

```yaml
---
type: ticket
subtype: feature   # or bug
title: <title>
status: stable
workflow_state: ready
blocked_by: [<ticket-slug>, ...]
size: m   # optional; s | m | l | xl; absent means m
mode: human   # optional; omit unless the human must implement it
---
```

The ticket body (the `content` argument) is the end-to-end behaviour this
ticket makes work, from the user's perspective, not layer-by-layer
implementation:

```markdown
## What to build

The end-to-end behaviour this ticket makes work.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)".
```

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API,
  UI, tests): vertical, NOT a horizontal slice of one layer.
- A completed slice is demoable or verifiable on its own.
- Each slice is sized to fit in a single fresh context window.
- Any prefactoring should be done first.

</vertical-slice-rules>

One-ticket efforts are fine: a one-off is an effort whose tickets directory
holds exactly one ticket.

**Wide refactors are the exception to vertical slicing.** A **wide refactor**
is one mechanical change (rename a column, retype a shared symbol) whose
**blast radius** fans across the whole codebase, so a single edit breaks
thousands of call sites at once and no vertical slice can land green. Don't
force it into a tracer bullet; sequence it as **expand-contract**. First
expand: add the new form beside the old so nothing breaks. Then migrate the
call sites over in batches sized by blast radius (per package, per
directory), each batch its own ticket blocked by the expand, keeping CI green
batch to batch because the old form still exists. Finally contract: delete
the old form once no caller remains, in a ticket blocked by every migrate
batch. When even the batches can't stay green alone, keep the sequence but
let them share an integration branch that all block a final
integrate-and-verify ticket; green is promised only there.

Avoid specific file paths or code snippets in ticket bodies: they go stale
fast. Exception: if a prototype produced a snippet that encodes a decision
more precisely than prose can (state machine, reducer, schema, type shape),
inline it and note briefly that it came from a prototype. Trim to the
decision-rich parts, not a working demo, just the important bits.

### Verify the graph

Layer the graph with `tw_dependency_levels <effort-slug>` (BFS levels) and
read the ready edge with `tw_frontier <effort-slug>`: a ticket is ready when
every ticket in its `blocked_by` list is done. The levels are the
dependency order the implementation phase serializes on.

A ticket that turns out too large or wrong once implementation starts is not
edited by hand: supersede it with `tw_split_ticket`, which creates the
sub-tickets and marks the original deprecated plus done, so the graph absorbs
the split and the history reads.

Do NOT close or modify the effort's map: effort done-ness is derived by
scanning the tree.

## Hand off

With the architecture published (or skipped, for a bug-only effort) and the
graph verified, close the phase with `tw_close to-tickets` and hand the
effort to the implementation phase, which implements the tickets in
dependency order, one ticket at a time.

> **Feedback:** if the phase hits a snag (an edge that would not validate, a
> breakdown the tools could not express, or something that worked notably
> well), call `submit_feedback({ kind, data })` autonomously to record it.
> `kind` is a short category (`good`, `bad`, `friction`, `architecture`);
> `data` is one or two specific, actionable sentences about the *workflow*,
> not the project work. Requires the `pi-telemetry` extension
> (`submit_feedback` tool).
