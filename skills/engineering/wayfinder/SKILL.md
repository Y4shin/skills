---
name: wayfinder
description: Plan a huge chunk of work as a shared map of decision tasks (research, prototype, grilling, manual), resolving them one at a time until the way to the destination is clear. Produces decisions, not deliverables; hands off to to-spec and to-tickets for implementation.
disable-model-invocation: true
---

# Wayfinder

> **Telemetry:** once you have created the map, call the `telemetry_skill_context`
> tool with `{ skill_name: "wayfinder", map }` where `map` is the effort slug
> (the directory name under `docs/tasks/`). When you are focused on a specific
> task, also pass `target` (the task slug). This skill has no static invocation
> capture, so the tool is the only way to record its target. Pass `skill_name`
> explicitly so the metadata correlates to this invocation even when multiple
> skills run in one turn.

Wayfinder is the planning and discovery phase of this workflow. It hands off to
`to-spec` and `to-tickets` (the two-phase model): its output is a living map and
a dependency graph of **decision tasks**; `to-spec` collapses those decisions
into a buildable spec, and `to-tickets` breaks the spec into the implementation
tickets `implement-task` executes.

## Plan, don't do

Wayfinder is **planning by default**: each task resolves a decision, and the
map is done when the way is clear, with nothing left to decide before someone
goes and does the thing. The pull to just do the work is usually the signal
you've reached the edge of the map and it's time to hand off. An effort can
override this in its **Notes**, carrying execution into the map itself, but
absent that, produce **decisions, not deliverables**.

## Boundary

Wayfinder owns:

- the destination and scope;
- the map and its decision-task graph;
- task creation (planning subtypes only: research, prototype, grilling,
  manual), dependencies, and the frontier;
- resolving ambiguity into concrete task bodies;
- adding newly discovered work and recording out-of-scope work.

`to-spec` and `to-tickets` own collapsing the decisions into a buildable plan
(spec + implementation tickets). Feature and bug creation belongs to
`to-tickets`, aligned with its Boundary. `implement-task` owns completing
tickets. There is no separate specification or ticket-generation step inside
Wayfinder.

## Entry

Every map starts with one mandatory grilling session. Start from the user's
idea, inspect the repository, existing `CONTEXT.md`, ADRs, active tasks, and
project profile, then run the grilling loop before creating the map or any
child tasks.

The first grilling establishes the destination, constraints, scope boundary,
and the first set of precise questions or outcomes that can become tasks. Do
not skip it because the idea sounds clear; a small idea may produce one task,
but it still gets the same initial alignment pass.

## The map

Create the map at `docs/tasks/<effort>/map.md` (the effort slug is the
directory name):

```yaml
---
type: map
title: <title>
status: stable
blocked_by: []   # optional; effort-to-effort edges
---
```

The body is the canonical low-resolution map:

```markdown
## Destination

<what done looks like>

## Constraints

- ...

## Decisions so far

- ...

## Fog

- questions that are in scope but not yet sharp enough to become tasks

## Out of scope

- ...
```

Decision tasks live at `docs/tasks/<effort>/tasks/<task-slug>/task.md`. The
directory is the registration: writing the file is all there is, there is no
array to update. Each task has one planning subtype. Choose the subtype using
this table, then follow the matching planning resource in
`skills/engineering/wayfinder/resources/` before writing the task:

- `research`: gather high-trust evidence;
- `prototype`: build a cheap artifact to answer a design question;
- `grilling`: resolve a human decision through conversation;
- `manual`: complete a human or environment prerequisite.

```yaml
---
type: task
subtype: research   # or prototype | grilling | manual
title: <title>
status: stable
workflow_state: ready
blocked_by: [<task-slug>, ...]
mode: human   # optional; omit unless the human must implement it
---
```

Feature and bug work is **not** created by Wayfinder. It is created by
`/skill:to-tickets` after the decisions are clear. Feature and bug creation
belongs to `to-tickets` by its Boundary. Wayfinder produces decisions, not
deliverables.

The planning resource defines the task body, acceptance/evidence criteria,
and required artifacts. Execution is later routed by `implement-task` to its
matching resource.

Use `blocked_by` for ordering. Edges are kind-scoped and effort-scoped: a
task's `blocked_by` names other tasks of the same effort.

## Chart the initial graph

1. Explore the codebase and existing project documents.
2. Run one mandatory grilling session to establish and confirm the destination,
   constraints, scope boundary, and first task frontier.
3. Create the map only after that grilling has produced shared understanding.
4. Set the state pointers: `tw_state_set map <effort-slug>`, and clear a stale
   task pointer with `tw_state_set task null`.
5. Register the effort in the root index: add `<effort-slug>` to the `## Live`
   list of `docs/tasks/index.md`, keeping the list sorted. When the index file
   does not exist yet, create it with frontmatter `type: index`,
   `okf_version: "0.2"`, `title: docs/tasks`, and body sections `# docs/tasks`,
   `## Live` (the sorted live effort list), and `## Archived`.
6. Create only tasks whose question or outcome is precise enough to state now.
7. Put the rest in `## Fog` rather than inventing speculative tasks.
8. Wire dependencies after all initial task slugs exist.
9. Show the user the destination, task graph, dependencies, and fog. Ask for
   confirmation before beginning execution.

A task is ready when every task in its `blocked_by` list is done. The frontier
is the ready, unfinished task set. Read it with `tw_frontier <effort-slug>`;
layer the whole effort with `tw_dependency_levels <effort-slug>`.

## Hand off, don't build

When the current frontier is meaningful, hand off to:

```text
/skill:to-spec <effort-slug>
```

The map's decisions collapse into a spec (`to-spec`), which breaks into
tracer-bullet implementation tickets (`to-tickets`), which `implement-task`
executes. Looping the map straight into `implement-task` skips that collapse
and throws the linked detail away, so go to `implement-task` directly only
when the effort turned out genuinely small.

If implementation exposes uncertainty, stop that task with a clear discovery
and return to Wayfinder for a **new planning task** (not a re-open of the old
one). This is a designed-for escape hatch: record that it fired by calling
`submit_feedback({ kind: "expected", data })` with `data` e.g.
`"wayfinder: task <slug> returned with unresolved uncertainty"`.

Do not improvise a hidden plan. Do not silently expand a task's acceptance
criteria. Add a task instead.

## Resuming

On a later Wayfinder session, or when called back after implementation:

1. Load only the map first.
2. Set the state pointers: `tw_state_set map <effort-slug>`, then
   `tw_state_set task <task-slug>` for the task you are focusing on.
3. Inspect the current frontier with `tw_frontier <effort-slug>`.
4. Read task details only as needed.
5. Claim or select one planning question at a time when human input is needed.
6. Update the map and dependencies, then hand back to `to-spec`.

Never mark an implementation ticket complete from Wayfinder. Never resolve an
unclear question by pretending it is a feature ticket.

> **Feedback:** if planning hits a snag (a grilling loop that circled, a
> dependency that wouldn't wire, a task type that didn't fit, a frontier that
> stalled, or something that worked notably well), call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the project
> work. Requires the `pi-telemetry` extension (`submit_feedback` tool).
