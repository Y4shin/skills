---
type: task
subtype: grilling
title: Shared vocabulary for the workflow
status: stable
workflow_state: done
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

## Settled decisions

### Q1 - `task` and `ticket` are two graph kinds (settled)

- `tasks/<slug>/task.md` (subtype `research`, `prototype`, `grilling`, or
  `manual`) and `tickets/<slug>/ticket.md` (subtype `feature` or `bug`) are
  two distinct artifact kinds, not one kind with a wide subtype enum.
- `blocked_by` is effort-scoped and kind-scoped: a decision task blocks only
  decision tasks, and a ticket blocks only tickets. `spec.md` is the handoff
  that turns decisions into the ticket graph.
- Rejected: one kind with `ticket` as a subtype value (loses the invariant
  that only tickets block tickets); the v4 status quo with the overloaded
  `type:` field and directory-only distinction (keeps the overloading this
  task exists to remove).
- Downstream: schema 5 gets two kind resolvers and a kind-scoped edge check;
  the frontier is computed per kind.

### Q2 - Naming the two kinds (settled)

- Keep the artifact nouns `task` and `ticket`; the glossary defines canonical
  long forms **planning task** and **implementation ticket**. The short forms
  are allowed only where the context already makes the kind unambiguous.
- The qualifier is an obligation, not a suggestion: an agent working in this
  workflow must use the qualified form when it refers to either kind, and must
  echo it back even when the user speaks loosely. If the user says "implement
  ticket B", the agent answers "I will implement implementation ticket B".
- Rejected: renaming the planning kind to `decision` (collides with the map's
  "Decisions so far" and the settled decisions recorded in task bodies, and
  the `manual` subtype produces a prerequisite, not a decision); renaming both
  to fully descriptive nouns such as `discovery` / `deliverable` (self-
  describing, but lands in the resolver, schema 5, all four workflow skills,
  the migration, every task body, and the docs at once).
- Downstream: `CONTEXT.md` carries the glossary and the qualifier rule; the
  effort's final documentation re-sync ticket enforces it across the repo.

### Q3 - Spec and architecture are two artifacts with separated producers (settled)

- **The effort spec (`spec.md`)** is produced by `to-spec` at the effort root
  and is mandatory for every effort. It carries the problem, the solution, the
  user stories, the settled implementation and architecture decisions from the
  planning phase, the testing decisions, and out of scope. It no longer runs
  the seam or architecture interview: that step leaves `to-spec`.
- **The architecture document** is a planning artifact produced by
  `to-tickets`, alongside the ticket graph. `to-tickets` consumes the
  architecture content already recorded in `spec.md` and inlines it in full,
  then adds the implementation-facing context the implementation tickets need:
  per-ticket exports, existing abstractions to use, do-not-reimplement, seams,
  and interface contracts between tickets.
- **The architecture document is the living document; the spec's architecture
  content becomes archival.** Nothing is deleted from `spec.md`. The only
  change is a note, added once `architecture.md` exists, that the architecture
  decisions recorded there have moved to `architecture.md` and are kept for
  archival purposes. When a later implementation ticket shows the architecture
  is not working, the change is decided together with the user and lands in
  `architecture.md`; the architecture document supersedes the spec's
  architecture section rather than being pinned to it.
- **The implementation pipeline reads it.** `implement-task`'s feature
  pipeline no longer drafts or elicits the architecture document; it reads the
  approved artifact, and a missing or unstable one is a precondition refusal.
  The exact gate mechanics belong to the `grill-gate-model-and-write-lockdown`
  planning task.
- **Bug-only efforts have no architecture document.** `spec.md` is always
  present; the architecture document exists exactly when the ticket graph
  needs interface contracts.
- Rejected: merging both into one file (mixes the gate artifact with the
  living technical contract, and forces architecture scaffolding onto a
  bug-only effort); drafting the architecture document inside the
  implementation skill (this is the doubling of the seam interview that the
  split exists to remove); having the architecture document point at the
  spec's decisions instead of inlining them (a living architecture must be
  able to supersede a settled decision; a pointer chain makes that change
  awkward); keeping the architecture document produced after the tickets it
  must serve.
- Downstream: `to-spec` loses its seam step; `to-tickets` gains the
  architecture step and its user approval; `feature/autonomous.md` and
  `feature/human.md` Step 1 become read-and-check; `src/core/art.ts`'s
  `["arch spec", "arch-spec.md"]` mapping changes; `spec-reconciler` keeps
  updating the architecture document after each implementation level.

### Q4 - File names and plain-English names (settled)

- `spec.md` keeps its name; `arch-spec.md` becomes `architecture.md`.
- Plain-English names, which the human uses and which every skill, the
  glossary, and `CONTEXT.md` must use: **the specification** (or the spec) for
  `spec.md`, and **the architecture** for `architecture.md`. The architecture
  is never called a spec.
- Rejected: qualifying both (`effort-spec.md` and `architecture-spec.md`),
  which keeps "spec" on both files; renaming `spec.md` to `plan.md`, which
  collides with the planning tasks and under-describes the document.
- Downstream: `src/core/art.ts`'s `["arch spec", "arch-spec.md"]` mapping and
  the frontmatter type become `["architecture", "architecture.md"]`; the
  `to-spec` and `to-tickets` skills, both feature resources, `spec-reconciler`,
  and `CONTEXT.md` use the two plain-English names.

### Q5 - Legacy terms are retired from the language (settled)

- `slice` and `slices/` become implementation tickets (`tickets/`); maps
  under `docs/tasks/maps/` become the effort's map
  (`docs/tasks/<effort>/map.md`); `mode: hitl/afk` becomes `mode: human` (the
  `afk` value disappears, because autonomous is the default); the broad legacy
  `type:` value set collapses so `type:` carries only the artifact kind and
  the workflow category lives in `subtype:`.
- Explicit carve-out: anything whose job is migrating an older version keeps
  the old words. That is the upgrade resources under `setup-workflow`, the
  migration skill's prose, `src/migrate-cli.ts` and `src/core/migrate.ts`
  (including the legacy tables the migration reads), and any script or tool
  call that reads an old shape. It is the compatibility layer, and it is the
  only place a retired word may appear.
- Rejected: dropping live support so a repo must migrate before any workflow
  tool runs (contradicts the map's backward-compatibility constraint);
  keeping legacy terms as first-class synonyms (re-creates the overloading v5
  removes).
- Downstream: `task-workflow-overview`, the bucket READMEs, the docs pages,
  and `CONTEXT.md` use only v5 terms; `task-workflow-doctor` reports a legacy
  shape as deprecated.

### Q6 - `intake` replaces `triage` (settled)

- `intake` is the front door as both the phase name and the skill name: the
  one place where every new idea, bug report, or feature request enters the
  workflow, and it always creates an effort with a map.
- Whether classification or triage-style roles happen inside the skill is an
  implementation detail of `intake`, not a separate vocabulary term.
- `triage` is retired as a skill name and as a phase name. There is no split
  where the phase is called one thing and the skill another.
- Downstream: `skills/engineering/triage/` is renamed to
  `skills/engineering/intake/`; the top-level `README.md`, the bucket
  `README.md`, `package.json`'s `pi.skills` array, the docs page
  (`docs/engineering/triage.md` becomes `intake.md`),
  `task-workflow-overview`, and `CONTEXT.md` follow. The front-door mechanics
  remain the decision of the front-door planning task, which itself carries
  `triage` in its title and must be renamed.

### Q7 - The opener carries the gate (settled)

- The opener tool is not only an activator: it is the gate. The first thing a
  workflow skill's prose tells the agent to do is call its opener.
- The opener takes the phase's target and performs the checks for that
  phase's preconditions, serving as the mechanical function of the gate: it
  blocks execution of the skill when the preconditions are not met, and it
  tells the agent what to do instead.
- The target is defined per phase. For example, in implementation the target is
  the implementation ticket and the effort it belongs to. The checks are that
  phase's preconditions, not a fixed list.
- When the checks pass, the opener activates the toolset for the phase. When
  they fail, it activates nothing.
- Consequence: an illegal action is not prevented by prose alone or by a
  separate preconditions check; the call the agent must make first is the call
  that refuses. `gate` and `precondition` and `opener` name the same
  mechanism seen from three sides: the rule, the check, and the tool.
- Downstream: `grill-disclosure-mechanics` designs the opener signature and
  the per-phase target; `grill-gate-model-and-write-lockdown` owns the state
  table the check reads and the vocabulary of the allowed-actions response;
  the open/close prototype gains the refusal path.

### Human confirmation

- The user confirmed the glossary above, including the Q7 opener-as-gate
  wording translated into general terms, as the shared understanding. The
  planning task is done on that basis.

## Remaining fog

- No open decisions remain for the vocabulary itself; the draft glossary above
  stands as the agreed glossary, amended by Q1-Q7.
- Two consequences stay in the map's fog rather than here: whether a
  living-architecture change that contradicts a settled planning decision is
  recorded as an ADR, and how `task-workflow-overview` answers read queries
  when workflow tools are hidden outside skills.

## Amendments after confirmation

- `simple map` is retired. The user decided, after the glossary was confirmed,
  that no effort starts with nothing to grill: a small request is a regular
  effort whose map carries exactly one planning task, a grilling task that
  determines the effort's non-goals and its non-negotiable facts, and
  `to-spec` gates on those being present. See
  `grill-simple-map-and-spec-gate`.
