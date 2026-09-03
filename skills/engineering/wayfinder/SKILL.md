---
name: wayfinder
description: Plan a huge chunk of work as a shared map of decision tasks (research, prototype, grilling, manual), resolving them one at a time until the way to the destination is clear. Produces decisions, not deliverables; hands off to to-spec and to-tickets for implementation.
disable-model-invocation: true
---

# Wayfinder

> **Telemetry:** once you have created the map, call the `telemetry_skill_context`
> tool with `{ skill_name: "wayfinder", map }` where `map` is the map slug (the
> directory name under `docs/tasks/maps/`). When you are focused on a specific
> task or slice, also pass `target` (the task slug) or `slice` (the slice slug).
> This skill has no static invocation capture, so the tool is the only way to
> record its target. Pass `skill_name` explicitly so the metadata correlates
> to this invocation even when multiple skills run in one turn.

Wayfinder is the planning and discovery phase of this workflow. It replaces
`create-task`, `to-spec`, and `to-tickets`. Its output is a living map and a
dependency graph of **decision tasks** consumed by `to-spec` and `to-tickets`,
which then produce the implementation tasks that `implement-task` executes.

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
- task creation (planning types only), dependencies, and the frontier;
- resolving ambiguity into concrete task bodies;
- adding newly discovered work and recording out-of-scope work.

`to-spec` and `to-tickets` own collapsing the decisions into a buildable plan
(spec + implementation tickets). `implement-task` owns completing tickets.
There is no separate specification or ticket-generation step inside Wayfinder.

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

Create the map at `docs/tasks/maps/<slug>/map.md`:

```yaml
---
kind: map
slug: <slug>
title: <title>
status: active
tasks: []
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

Tasks live at `docs/tasks/<task-slug>/task.md` and are listed in the map's
`tasks` array. Each task has one planning type. Choose the type using this
table, then follow the matching planning resource in
`skills/engineering/wayfinder/resources/` before writing the task:

- `research`: gather high-trust evidence;
- `prototype`: build a cheap artifact to answer a design question;
- `grilling`: resolve a human decision through conversation;
- `manual`: complete a human or environment prerequisite.

Feature and bug tasks are **not** created by Wayfinder. They are created by
`to-tickets` after the decisions are clear. Wayfinder produces decisions, not
deliverables.

The planning resource defines the task body, acceptance/evidence criteria,
and required artifacts. Execution is later routed by `implement-task` to its
matching resource.

Use `blocked_by` for ordering.

## Chart the initial graph

1. Explore the codebase and existing project documents.
2. Run one mandatory grilling session to establish and confirm the destination,
   constraints, scope boundary, and first task frontier.
3. Create the map only after that grilling has produced shared understanding.
4. Create only tasks whose question or outcome is precise enough to state now.
5. Put the rest in `## Fog` rather than inventing speculative tasks.
6. Wire dependencies after all initial task slugs exist.
7. Show the user the destination, task graph, dependencies, and fog. Ask for
   confirmation before beginning execution.

A task is ready when every task in its `blocked_by` list is done. The frontier
is the ready, unfinished task set.

## Hand off, don't build

When the current frontier is meaningful, hand off to:

```text
/skill:to-spec <map-slug>
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
2. Inspect the current frontier with `task_frontier`.
3. Read task details only as needed.
4. Claim or select one planning question at a time when human input is needed.
5. Update the map and dependencies, then hand back to `to-spec`.

Never mark an implementation task complete from Wayfinder. Never resolve an
unclear question by pretending it is a feature task.

> **Feedback:** if planning hits a snag (a grilling loop that circled, a
> dependency that wouldn't wire, a task type that didn't fit, a frontier that
> stalled, or something that worked notably well), call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the project
> work. Requires the `pi-telemetry` extension (`submit_feedback` tool).
