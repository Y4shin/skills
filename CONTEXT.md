# task-workflow

The ubiquitous language of the task-workflow package: the terms the skills,
the shipped documentation, and the `tw_*` tools use for the enforced workflow,
schema 5. This repo is the workflow package itself, so its vocabulary is the
domain.

## Language

**Effort**:
The unit of work and the unit that archives: one directory under `docs/tasks/`
holding a map, its planning tasks, the specification, the architecture document
when one is needed, the implementation tickets, and the review artifact. Every
request becomes exactly one effort, and a bug report becomes an effort whose
defect is a `subtype: bug` implementation ticket.
_Avoid_: project, initiative, epic (too broad)

**Front door**:
The single entry point into the workflow: the intake phase and its skill. It is
where a raw request and its stories enter, and it is the only way an effort
starts. There is no parallel queue and no rejection path.
_Avoid_: inbox, request queue, bug tracker

**Map**:
The low-resolution index for an effort: one document at
`docs/tasks/<effort>/map.md` holding the destination, the constraints, the
decisions so far, the fog, the non-goals, and the non-negotiable facts.
Wayfinder creates and grows it; it indexes the work, it does not store it.
_Avoid_: plan (too vague), sprint

**Planning task**:
A planning unit of work at `docs/tasks/<effort>/tasks/<slug>/task.md`, with a
subtype of research, prototype, grilling, or manual. Wayfinder creates it and
works it; its result is a decision written back to the map, not a deliverable.
The long form is canonical, and the short form is allowed only where the kind
is already unambiguous.
_Avoid_: decision ticket, chore

**Implementation ticket**:
An implementation unit of work at `docs/tasks/<effort>/tickets/<slug>/ticket.md`,
with a subtype of feature or bug and a size of s, m, l, or xl. `to-tickets`
creates it, `implement-ticket` builds it, and its close-out marks it done. The
long form is canonical, and a discipline never calls it a bare task.
_Avoid_: issue, story, work item (and a bare task, for a ticket)

**Graph kind**:
One of the two node kinds an effort's graph is built from: the planning task and
the implementation ticket. A kind is the scope of every edge and every computed
view, so one effort holds two independent graphs.
_Avoid_: layer, track, stream

**Blocked_by**:
The frontmatter list of the slugs that must be done before an artifact can
start. It is kind-scoped and effort-scoped: a planning task blocks only planning
tasks, an implementation ticket blocks only tickets, and every target lives in
the same effort.
_Avoid_: depends on (too prose-y; this is the field name), prerequisites

**Frontier**:
The ready edge of one graph: the artifacts of a kind whose `blocked_by`
dependencies are all done. It is computed per kind, so an effort has a planning
frontier and a ticket frontier, never one combined queue; `tw_frontier` reports
each ready artifact with its kind.
_Avoid_: queue, backlog (both imply FIFO, and the frontier is dependency-ordered)

**Dependency level**:
A breadth-first level of one kind's graph: level 0 is the unblocked frontier,
level N is blocked by level N-1. `tw_dependency_levels` returns them. Tickets
run one at a time in level order; the level boundary is a strict barrier, and
level concurrency is not implemented.
_Avoid_: rank, tier

**Specification**:
The settled statement of what an effort will build, at
`docs/tasks/<effort>/spec.md`, written by `to-spec` from the map and the planning
tasks. It is the handoff between the two graph kinds, it asks nothing planning
already settled, and its architecture content is archival once `architecture.md`
exists.
_Avoid_: requirements doc, PRD

**Architecture**:
The living interface contract for an effort, at
`docs/tasks/<effort>/architecture.md`, written by `to-tickets`: the per-ticket
exports, the abstractions to reuse, the seams, and the contracts between
tickets. It exists exactly when the ticket graph needs interface contracts, so a
bug-only effort has none. Every chain reads it; nothing drafts it during
implementation.
_Avoid_: design doc, technical plan, spec (that is the specification)

**Ready for spec**:
The map's `ready_for_spec` field, which says the planning frontier is empty, the
non-goals are non-empty, and the non-negotiable facts name the success test.
Wayfinder's reconcile pass sets it last, through `tw_finalize_map`, the only
setter; any later plan change clears it. It is the only thing `to-spec` checks.
_Avoid_: planning complete, done planning

**Ticket graph**:
The dependency graph of an effort's implementation tickets, computed per kind
from `blocked_by`. `to-tickets` produces it at the same time as the architecture
document, and `implement-ticket` walks it level by level.
_Avoid_: roadmap, backlog

**Review artifact**:
The whole-effort review at `docs/tasks/<effort>/review.md`, written by
`tw_write_review` during `finalize-effort`: the findings a later reader would
trip over, plus the disposition record for each one. It carries no workflow
state; its `dispositioned` flag says every finding has been dispositioned, and
its `reconcile` record says whether the living architecture was reconciled at
the close. The archive gate reads both.
_Avoid_: audit, report card

**Advisory review**:
The second review artifact, `docs/tasks/<effort>/end-of-effort-review.md`,
written by `tw_write_review` with `pass: "end-of-effort"` when the last ticket
lands. Its findings are an input to the close: the disposition pass records
one for each, in place. It is never a gate, so the archive ignores it.
_Avoid_: pre-review, draft review

**Disposition**:
The recorded fate of one review finding: an implementation ticket in the same
effort, a follow-up effort, or an informational acceptance by the human. Every
finding gets exactly one before the effort may archive.
_Avoid_: resolution, verdict

**Report**:
The completion report every workflow skill ends its run with, in one fixed
five-part order: what is now true, what needs the human, what to run next, what
is broken or blocked, and one pointer to the detail. It is prose discipline, not
a runtime gate, and it produces no per-run artifact.
_Avoid_: summary, output, transcript

**Origin effort**:
The optional `origin_effort` field on a child map, naming the effort whose review
proposed it. It is provenance, a field on the child and never a graph edge: it
enters neither `blocked_by` nor the frontier.
_Avoid_: parent (that implies a tree edge), depends on

**Archive**:
The end state of an effort: its directory moved as a unit to
`docs/tasks/archive/<effort>/` by `tw_archive_effort`, once every review finding
is dispositioned. Archived efforts stay readable, because the tools read
archives.
_Avoid_: delete, close (too vague)

**State pointers**:
The two fields the state module models in `docs/tasks/state.yaml`: `map` (the
effort in flight) and `task` (the artifact in flight). Every other key in that
file is unmodeled and preserved verbatim, so a state write never destroys a key
it does not know about.
_Avoid_: cursor, position (both imply a single value; there are two)

**schema_version**:
The stamp in `docs/tasks/state.yaml` that says which schema a tree is on, and
so lets `setup-workflow` choose onboard, migrate, or no-op. The current value is
`schema_version: 5`, and only the migration writes it.
_Avoid_: version (too generic)

**Migration**:
The one idempotent hop that takes a tree from any older vintage to schema 5: it
renames the architecture artifact, rewrites the map body sections, stamps the
state file, and covers archives as well as live trees. It is a tested unit run by
`setup-workflow`, not a tool in the registered surface. Every rewrite is verified
before it lands, a failure leaves the tree untouched, and a second run is a no-op.
_Avoid_: transform, conversion (too generic)

**Invocation model**:
Which actor may reach a skill. A user-invoked skill sets
`disable-model-invocation: true` and is reachable only when the human types
`/skill:<name>`; a model-invoked skill is reachable by the model or by the
human. The split lives in frontmatter only, and the shipped READMEs group the
promoted set by it.
_Avoid_: trigger, auto-invoke (one direction of it)

**Promoted skill**:
A skill that ships: present in `package.json` `pi.skills` and documented by
exactly one `docs/<bucket>/<name>.md` page. A non-promoted skill stays in its
bucket with no page, and a retired one names its replacement.
_Avoid_: exported, active

**Skill bucket**:
One of the five directories under `skills/`. Engineering and productivity are
promoted; misc, in-progress, and deprecated are kept but not promoted. A retired
skill lives in deprecated.
_Avoid_: folder, category, group

**Artifact type**:
The OKF `type:` field, naming what a file is: map, spec, architecture, review,
task, ticket, findings, changelog, out-of-scope note, deviation report, index.
The workflow category lives in `subtype:`, so type says what a file is and
subtype routes the work on it.
_Avoid_: kind (the field it replaced)

**Workflow state**:
The companion field to OKF `status` on a planning task or an implementation
ticket: todo, ready, in-progress, blocked, done. Done-ness gates on
`workflow_state: done`, and only some pairs are legal (`draft` with `todo`,
`deprecated` with `done`, `stable` with any).
_Avoid_: status (that is the OKF field; this is the workflow half)

**Anomaly**:
A graph defect the tools report instead of dropping: a missing type, a forbidden
status pair, an artifact whose type disagrees with its location, or a
`blocked_by` target nothing provides. An anomaly is reported beside the answer,
never as a tool failure.
_Avoid_: error, warning

**Out-of-scope KB**:
The rejected-requests knowledge base at `docs/tasks/out-of-scope/`: one file per
consciously ruled-out request, with the reason. Wayfinder and the skills that
defer work check it, so the same no is not re-debated.
_Avoid_: blacklist (too negative)

**Vendored tree**:
A self-contained non-OKF subtree kept inside the bundle for reference, such as a
clone of an external repo. It is not part of the bundle: the migration moves it
outside and leaves a pointer file behind.
_Avoid_: submodule (that is a git mechanism; this is a directory of foreign files)

**Workflow feedback**:
A note about how the workflow itself is running (friction in a phase, a step that
fought back, a designed-for escape hatch that fired, something that worked
notably well), as opposed to a finding about the project work. It reaches the
telemetry store through `tw_feedback`, which labels it `workflow` so it stays
separable from every other kind of feedback.
_Avoid_: friction log (that names one signal, not the channel)

**Ladder**:
The fixed escalation order a stuck run walks when the workflow misbehaves, a
tool refuses, or a gate will not open: act on the refusal's own `reason` and
`legal_next`, reorient from the shipped internals reference (or route to the
doctor when the tree is the problem), record the snag as workflow feedback,
then stop and escalate with the completion report. The workflow-failure skill
owns it; the rungs never move, none is skipped, and escalation ends the run
instead of blocking on a question.
_Avoid_: retry loop (the ladder is ordered, not a loop), escalation path (names no order)

**Escalation rung**:
One numbered step of the ladder, four in all. The walk stops at the first rung
that resolves the snag; rung four is the stop-and-escalate rung whose report
ends the run.
_Avoid_: phase (a gated workflow segment, not a ladder step), level (that is a dependency level of the graph)

## Relationships

- An **effort** holds one **map**, zero or one specification, zero or one
  architecture document, zero or one review artifact, many **planning tasks**,
  and many **implementation tickets**.
- A **planning task** and an **implementation ticket** are the two **graph
  kinds**; each carries one **blocked_by** list, scoped to its own kind and to
  its own effort.
- The **front door** is the only creator of an **effort**.
- An effort's **frontier** and **dependency levels** are computed per **graph
  kind**, so planning and implementation never share a queue.
- The **specification** is the handoff from the planning graph to the ticket
  graph: **ready for spec** releases it, and the **ticket graph** consumes it.
- **Architecture** is the living contract the **ticket graph** is built against;
  the specification's architecture content becomes archival once it exists.
- `implement-ticket` marks an **implementation ticket** done;
  `finalize-effort` writes the **review artifact**, gives every finding a
  **disposition**, and moves the effort to the **archive**.
- A **disposition** of follow-up creates a child **effort** carrying an
  **origin effort**; that field is provenance, never an edge.
- `docs/tasks/state.yaml` holds the two **state pointers** and the
  **schema_version**; every other key in it is unmodeled and preserved verbatim.
- The **migration** stamps `schema_version: 5` and reshapes the tree; it is the
  only writer of that key.
- A **vendored tree** is moved out of the bundle by the **migration**, with a
  pointer file left at its old location.
- The **invocation model** splits the **promoted skills**, and a **skill bucket**
  decides what is promoted at all.
- The **ladder** is the workflow-failure skill's behavior contract: each
  **escalation rung** is one fixed step of it, and the last rung ends the run
  with a **report**.

## Flagged ambiguities

- "Ticket" (external systems use it for a tracker artifact, and some skill
  collections use it for a decision unit too). Resolved: **implementation
  ticket** is the build artifact and **planning task** is the decision unit. A
  bare "ticket" is allowed only where the kind is already unambiguous, and never
  for a planning task.
- "Task" (the generic word). Resolved: in this vocabulary it is the short form
  of **planning task** and nothing else. A bare "task" never names an
  implementation ticket.
- "Decision task" (the term older workflow prose uses for the planning
  artifact). Resolved: the canonical long form is **planning task**. Where a
  shipped page still says decision task, read the planning task.
- "Spec" (used loosely for both the specification and the architecture
  document). Resolved: **specification** is `spec.md` and **architecture** is
  `architecture.md`; the shorthand "spec" means the specification only.
- "Issue tracker" (external tooling gives maps, tickets, and specs a
  server-side substrate). We do not: our substrate is the `docs/tasks/` tree,
  read and written through the `tw_*` tools. Resolved: where an external skill
  says "issue tracker", read "the `docs/tasks/` tree" for this repo.
