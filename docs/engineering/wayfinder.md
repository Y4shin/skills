# wayfinder

## What it does

`wayfinder` plans a huge or foggy chunk of work as a shared map of **decision
tasks**, then resolves them one at a time until the way to the destination is
clear. It produces **decisions, not deliverables**: when the pull to "just do
the work" shows up, that is the signal the map is done and it is time to hand
off.

The map lives at `docs/tasks/<effort>/map.md` and carries five sections:
Destination, Constraints, Decisions so far, Fog, and Out of scope. Its
decision tasks live at `docs/tasks/<effort>/tasks/<task-slug>/task.md`; the
directory is the registration, there is no list to update. Each task carries
one planning subtype: `research` (gather high-trust evidence), `prototype`
(throwaway code answering one design question), `grilling` (resolve a human
decision through conversation), or `manual` (a human or environment
prerequisite).

Every map starts with one mandatory grilling session, even for ideas that
sound clear. After the map is created the skill sets the state pointers
(`tw_state_set map <effort-slug>`), registers the effort in the `## Live`
list of `docs/tasks/index.md`, and reads the frontier with
`tw_frontier <effort-slug>` and `tw_dependency_levels <effort-slug>`.

When the frontier is meaningful it hands off: `/skill:to-spec` collapses the
decisions into a spec, `/skill:to-tickets` breaks the spec into
implementation tickets, and `/skill:implement-task` executes them. Feature
and bug work is never created by wayfinder; that belongs to `to-tickets`.

## When to reach for it

Type `/skill:wayfinder` when the way from here to the destination is not
visible yet: a huge, foggy effort where the questions outnumber the answers.
It is the on-ramp for work too uncertain to spec directly. It is
user-invoked: the model does not reach for it on its own.

Skip it for work whose shape you already know (go to `/skill:to-spec`
directly), for single-session fixes (`/skill:implement-task`), and for
implementation work already ticketed.

## Common questions

**Why does every map start with a grilling session?**
The first grilling establishes destination, constraints, scope boundary, and
the first precise questions before anything is written. A small idea may
produce one task, but it still gets the alignment pass.

**Where are the feature and bug tasks?**
Wayfinder creates planning subtypes only. Feature and bug creation belongs
to `/skill:to-tickets`, which runs after the decisions are clear. Looping a
map straight into implementation throws the linked detail away.

**What is "fog"?**
Questions that are in scope but not yet sharp enough to become tasks. They
sit in the map's Fog section instead of being invented into speculative
tasks, and graduate as they sharpen.

**What happens if implementation exposes a new uncertainty?**
The affected task stops with a clear discovery and wayfinder is called back
to create a **new** planning task (never a re-open of the old one). That is
a designed-for escape hatch, and it is recorded when it fires.

## It's working if

- The map exists at `docs/tasks/<effort>/map.md` with destination,
  constraints, decisions so far, fog, and out-of-scope sections.
- Decision tasks appear as files under `docs/tasks/<effort>/tasks/`, each
  with a planning subtype, `blocked_by` edges, and a `workflow_state`.
- `tw_frontier <effort-slug>` returns the ready tasks, and nothing is
  silently assumed: imprecise questions sit in Fog, not in fake tasks.
- The handoff goes to `/skill:to-spec` while the map is still fresh, and no
  deliverable was built inside the planning phase.
- A resumed session loads the map first, re-reads the frontier, and never
  marks an implementation ticket complete from wayfinder.
