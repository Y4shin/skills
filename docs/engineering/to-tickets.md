# to-tickets

## What it does

`to-tickets` turns a settled spec into two artifacts: the **living
architecture document** and the **ticket graph**.

The architecture document (`docs/tasks/<effort>/architecture.md`) is produced
from the spec, not invented fresh: it inlines the spec's architecture content
in full, then adds per-ticket exports, the existing abstractions to use,
do-not-reimplement notes, the seams, and the per-ticket interface contracts.
Written through `tw_write_architecture` (the only writer of the architecture
document), it becomes the living architecture: the specification's
architecture content turns archival, a note pointing at the architecture is
added to `spec.md`, and nothing is deleted from the specification. A bug-only
effort produces tickets with no architecture document: the architecture
exists exactly when the ticket graph needs interface contracts.

The ticket graph breaks the work into **tracer bullet tickets**: vertical
slices that each cut a narrow but complete path through every layer (schema,
API, UI, tests), each declaring the tickets that block it via `blocked_by`.
Every ticket is created with `tw_add_ticket`, the only ticket creator, which
validates `blocked_by` at creation (kind-scoped: only existing tickets of the
same effort), so tickets are created in dependency order: blockers first,
edges named as they are created. Hand edits to ticket files are refused by
the write guard, and there is no wiring step after creation. A ticket that
turns out too large is superseded with `tw_split_ticket`, which creates the
sub-tickets and marks the original deprecated plus done. The graph is
verified with `tw_dependency_levels <effort-slug>` (BFS levels) and
`tw_frontier <effort-slug>` (the ready, unfinished tickets).

Before creating anything, the skill quizzes you on the proposed breakdown:
granularity, blocking edges, merges and splits, until you approve. Wide
refactors (one mechanical change whose blast radius spans the codebase) are
the exception to vertical slicing: they run as **expand-contract**,
expanding the new form beside the old, migrating call sites in batches, and
contracting in a final ticket. One-ticket efforts are fine.

The phase opens through `tw_open` (the opener is the gate) and is
user-invoked: the model does not reach for it on its own.

## When to reach for it

Type `/skill:to-tickets` when an approved spec exists and the work needs to
become the living architecture plus executable units. It is the third step of
the main flow, right after `/skill:to-spec`. Skip it for planning questions
that are not yet decisions (wayfinder's job).

## Common questions

**Vertical or horizontal slices?**
Vertical, always. A completed slice is demoable or verifiable on its own and
sized to fit a single fresh context window. A "slice" of one layer (all the
schema, then all the API) is the anti-pattern this skill exists to prevent.

**Who writes the ticket files?**
The tools do. `tw_add_ticket` is the only ticket creator: it writes the v5
ticket frontmatter (type, subtype, status, workflow_state, blocked_by, and
the optional size and mode) and validates every `blocked_by` edge at
creation. Hand edits under `docs/tasks/` are refused by the write guard.

**How do I order the tickets?**
By creation order: blockers are created before the tickets that block on
them, and each ticket names its blockers in the same call that creates it.
There is no wiring step afterwards. `tw_dependency_levels <effort-slug>`
layers the finished graph and `tw_frontier <effort-slug>` names what is ready.

**Does every effort get an architecture document?**
No. A bug-only effort produces tickets with no architecture document; the
architecture exists exactly when the ticket graph needs interface contracts.
When it exists, it is the living document and the spec's architecture content
is archival (the spec keeps everything; it just points at the architecture).

**What about a refactor that cannot land green as a vertical slice?**
That is the wide-refactor case: sequence it as expand-contract, one ticket
per migrate batch, keeping CI green because the old form still exists until
the final contract ticket deletes it.

## It's working if

- `docs/tasks/<effort>/architecture.md` exists (for efforts whose ticket graph
  needs interface contracts), inlines the spec's architecture content in full,
  and adds the exports, existing abstractions, do-not-reimplement notes,
  seams, and per-ticket interface contracts.
- `spec.md` carries the note pointing at the architecture, and none of its
  content was deleted.
- Each ticket file sits at `docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`
  and describes end-to-end behaviour, not layer-by-layer work.
- Every ticket declares honest `blocked_by` edges, validated at creation, and
  the ones that can run in parallel have no blockers between them.
- The effort's graph answers queries: `tw_frontier <effort-slug>` names the
  ready tickets and `tw_dependency_levels <effort-slug>` layers the whole set.
- You approved the breakdown before any ticket was created, and the map was
  not modified (done-ness is derived by scanning the tree).
