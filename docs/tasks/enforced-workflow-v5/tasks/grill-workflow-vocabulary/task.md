---
type: task
subtype: grilling
title: Shared vocabulary for the workflow
status: stable
workflow_state: ready
blocked_by: []
---

# Shared vocabulary for the workflow

## Decision to settle

The ubiquitous language of this workflow: what an effort, a map, a task, a
ticket, a spec, and every other recurring term mean, and which legacy terms are
retired. The outcome is one agreed glossary, recorded in this task and in the
map's decisions, so v5 does not recreate the confusion v4 suffered from.

## Parent decisions it depends on

None. This is foundational, and the tasks that name artifacts (front door,
simple map, schema 5, skill surface) depend on it.

## Choices already known

- Whether `effort` means the directory, the whole arc (map, decision tasks,
  spec, tickets, implementation), or both, and which one "done" and "archive"
  attach to.
- How `task` and `ticket` relate: two graph kinds with separate subtypes and
  kinds-scoped edges, or one concept with a subtype.
- How `spec` and `arch-spec` differ, and which one a reader should expect to
  find where.
- Whether legacy terms are retired outright: `slice` (and
  `docs/tasks/<task>/slices/`), maps under `docs/tasks/maps/`, `mode:
  hitl/afk`, the broad legacy `type:` value set, and the six-type model.
- New v5 terms the glossary must include: `intake`, `simple map`,
  `finalize-effort`, `gate` and `precondition`, `disclosure`, opener and
  closer.

## Recommended starting answer

One draft glossary, to be confirmed term by term:

- **Effort**: the whole arc under `docs/tasks/<effort>/`: map, decision tasks,
  spec, tickets, and their implementation. The archival unit and the scope of
  "done".
- **Map**: the effort's low-resolution index (`map.md`): destination,
  constraints, decisions so far, fog, out of scope. No `workflow_state`;
  done-ness is derived by scanning.
- **Decision task** (planning task): `tasks/<slug>/task.md`, subtype research,
  prototype, grilling, or manual. Produces a decision or prerequisite, never a
  deliverable.
- **Ticket**: `tickets/<slug>/ticket.md`, subtype feature or bug. A
  tracer-bullet implementation unit.
- **Spec**: `spec.md`, the translation from planning to implementation.
- **Arch-spec**: `arch-spec.md`, the feature pipeline's per-effort interface
  and seam contract.
- **Frontier**: the ready edge, unfinished items whose same-kind blockers are
  done. **Level**: one BFS wave of the frontier. **blocked_by**: a kind-scoped,
  effort-scoped edge.
- **status**: draft, stable, deprecated. **workflow_state**: todo, ready,
  in-progress, blocked, done, and it is what done-ness gates on.
- **subtype**: the kind of task or ticket. **mode: human**: human-owned.
  **size**: s, m, l, xl, the dispatch budget.
- **intake**: the front door that always creates an effort and its map.
  **simple map**: a map with no decision tasks, meaning nothing to research or
  prototype first.
- **gate / precondition**: the tool-side check that authorizes a transition.
  **disclosure**: tools become available only while a workflow skill is open.
  **opener / closer**: the tools that activate and deactivate a toolset.
- **finalize-task**: per-ticket close-out. **finalize-effort**: whole-effort
  review plus archive.
- **chain**: the per-ticket agent sequence. **landing branch** `task/<slug>`,
  **working branch** `ticket/<slug>`. **fog**: in-scope questions not yet
  sharp enough to become tasks.
- Retired: `slice` and `slices/`, maps under `docs/tasks/maps/`, `mode:
  hitl/afk`, and the broad legacy `type:` value set in favor of `subtype:`.

## Downstream work it may create

The schema 5 field names, the skill names and boundaries, and the effort's
final documentation re-sync ticket, which writes the agreed glossary into
`CONTEXT.md`.
