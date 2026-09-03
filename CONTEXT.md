# task-workflow

A Pi package of agent skills for planning and executing work via a
dependency-aware task graph under `docs/tasks/`. Skills are organized into
buckets and consumed by the per-repo configuration `setup-workflow`
emits.

## Language

**Map**:
The canonical low-resolution index for an effort: a single document at
`docs/tasks/maps/<slug>/map.md` listing the destination, constraints,
decisions so far, fog, and out-of-scope. Its child tasks are the work
graph. Wayfinder creates and grows it; it is an index, not a store.
_Avoid_: epic, initiative, project (too broad)

**Task**:
A single unit of work in the graph: a document at
`docs/tasks/<slug>/task.md` with a `type:` (one of six, see below), a
`blocked_by` list, and a `status`. Created by wayfinder (planning types)
or `to-tickets` (implementation types). Executed by `implement-task`.
_Avoid_: ticket, issue (we use `docs/tasks/` files, not an issue tracker)

**Slice**:
A vertical, end-to-end, independently verifiable unit within a `feature`
or `bug` task. Slices live at `docs/tasks/<task-slug>/slices/<n>-<slug>.md`
with a `size:` (s/m/l/xl), `mode:` (hitl/afk), and `blocked_by`. The
per-slice chain is the tdd-worker to slice-verifier to land-worker
pipeline. Horizontal slices (one layer at a time) are an anti-pattern.
_Avoid_: step (too small), chunk (too vague)

**Frontier**:
The ready edge of the task graph: tasks (or slices) whose `blocked_by`
dependencies are all done. `task_frontier <map>` computes it;
`task_dependency_levels <map>` computes the BFS levels. implement-task
works the frontier; wayfinder reassesses it after a frontier completes.
_Avoid_: queue (implies FIFO only; the frontier is dependency-ordered, not
strictly linear)

**Blocked_by**:
The dependency list on a task or slice: the slugs that must be done before
this one can start. Wiring happens in a second pass (after all slugs
exist). A task with no `blocked_by` is unblocked (on the frontier
immediately).
_Avoid_: depends on (too prose-y; `blocked_by` is the frontmatter field
name)

**Dependency level**:
A BFS level in the task graph: level 0 is the unblocked frontier, level N
is blocked by level N-1, etc. `task_dependency_levels` returns the levels;
slices within a level run sequentially (shared repo cwd), levels are
strict barriers.
_Avoid_: rank, tier

**schema_version**:
The version stamp in `docs/tasks/state.yaml` that the migration skill reads
to detect whether a repo is fresh (onboard), old (migrate), or already
current (no-op). Per-upgrade resource files apply in sequence from the
repo's version to the current version.
_Avoid_: version (too generic)

**Task type**:
One of six, declared in a task's `type:` frontmatter, routing
`implement-task` to the matching resource:
- `research`: gather high-trust evidence (planning type; wayfinder creates
  it; the `research` skill is the reusable discipline).
- `prototype`: build a throwaway artifact to answer one design question
  (planning type; the `prototype` skill is the reusable discipline).
- `grilling`: resolve a human decision through conversation (planning
  type; the `grilling` skill is the reusable primitive).
- `manual`: complete a human or environment prerequisite (planning type).
- `feature`: implement behavior via the per-slice TDD pipeline
  (implementation type; created by `to-tickets`).
- `bug`: reproduce and fix via the lean red-first regression pipeline
  (implementation type; created by `to-tickets`).
Planning types (research/prototype/grilling/manual) come from wayfinder;
implementation types (feature/bug) come from `to-tickets`. A feature/bug
task is not re-typed as research.
_Avoid_: category, kind

**Skill bucket**:
One of five directories under `skills/`: `engineering/` (daily code work,
promoted), `productivity/` (non-code workflow, promoted), `misc/` (kept,
rarely used, not promoted), `in-progress/` (beta, not promoted),
`deprecated/` (retired, not promoted). Only `engineering` + `productivity`
are promoted: shipped in `package.json` `pi.skills` and get a human-facing
docs page at `docs/<bucket>/<name>.md`.
_Avoid_: folder, category

**Decision ticket**:
A `wayfinder` unit: a child task of a map holding a *question* whose
resolution is a decision, not a slice of a build to execute. The *decision*
qualifier keeps it distinct from an implementation task. Wayfinder
produces decisions, not deliverables; the pull to "just do the work" is
the signal to hand off to `to-spec` + `to-tickets`.
_Avoid_: ticket (use only when the distinction from an implementation
task matters)

**Triage role**:
A canonical state-machine label applied to a bug report or feature request
during triage (e.g. `needs-triage`, `ready-for-agent`). Five states:
`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`. Two categories: `bug`, `enhancement`. Each role maps to a real
label string via `docs/agents/triage-labels.md` (when configured).
_Avoid_: status, state (too generic)

**Out-of-scope KB**:
The rejected-requests knowledge base at `docs/tasks/out-of-scope/`: one
file per consciously ruled-out request, with the reason. `triage` checks
it for prior rejection before grilling an incoming request, so the same
"no" is not re-debated. Distinct from the task archive (completed work)
and `docs/bugs/` (active reports).
_Avoid_: blacklist (too negative)

## Relationships

- A **map** holds many **tasks**.
- A **task** has one **task type** and one `blocked_by` list.
- A **feature** or **bug** task holds many **slices**.
- The **frontier** is the set of tasks/slices whose `blocked_by`
  dependencies are all done.
- A **decision ticket** is a **task** (a child of a **map**).
- A bug report or feature request carries one **triage role** at a time.
- The **out-of-scope KB** is checked by `triage` before grilling.

## Flagged ambiguities

- "Issue tracker" (Matt Pocock's skills use an issue tracker as the
  substrate for maps, tickets, specs, and triage). We do **not**: our
  substrate is `docs/tasks/` files managed by the `task_*` tools. Resolved:
  the term is not used as a domain term here; our skills that reference a
  tracker are adapted to read/write `docs/tasks/` + `docs/bugs/` instead.
  Where a skill still says "issue tracker", read it as "the `docs/tasks/`
  tree" for this repo.
- "Ticket" (Matt uses it for both the tracker artifact and the wayfinder
  decision unit). We use **task** for the `docs/tasks/` artifact and
  **decision ticket** only when the distinction from an implementation
  task matters. Resolved: "ticket" is avoided except when quoting external
  systems or for a decision ticket.
