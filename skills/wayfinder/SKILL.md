---
name: wayfinder
description: Build and evolve a dependency-aware work graph from an uncertain idea, creating research, prototype, grilling, bug, and implementation tasks that implement-task can execute directly.
disable-model-invocation: true
---

# Wayfinder

Wayfinder is the planning and discovery phase of this workflow. It replaces
`create-task`, `to-spec`, and `to-tickets`. Its output is a living map and a
dependency graph of tasks consumed directly by `/skill:implement-task`.

## Boundary

Wayfinder owns:

- the destination and scope;
- the map/map and its task graph;
- task creation, dependencies, and the frontier;
- resolving ambiguity into concrete task bodies;
- adding newly discovered work and recording out-of-scope work.

`implement-task` owns completing tasks. There is no intermediate specification
or ticket-generation step.

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
`tasks` array. Each task has one execution type. `feature` and `bug` tasks keep
the existing task pipeline: Wayfinder must create their task doc, slice list,
and slice docs as part of planning. Research, prototype, grilling, and manual
tasks are direct task resources and do not need slices.

- `research` — gather high-trust evidence;
- `prototype` — build a cheap artifact to answer a design question;
- `grilling` — resolve a human decision through conversation;
- `feature` — implement behavior using the existing feature pipeline;
- `bug` — reproduce and fix using the existing bug pipeline;
- `manual` — complete a human or environment prerequisite.

Use `blocked_by` for ordering. A task body must state its question or outcome,
acceptance/evidence criteria, and what result it should leave for dependents.

## Chart the initial graph

1. Explore the codebase and existing project documents.
2. Run one mandatory grilling session to establish and confirm the destination,
   constraints, scope boundary, and first task frontier.
3. Create the map only after that grilling has produced shared
   understanding.
4. Create only tasks whose question or outcome is precise enough to state now.
5. Put the rest in `## Fog` rather than inventing speculative tasks.
6. Wire dependencies after all initial task slugs exist.
7. Show the user the destination, task graph, dependencies, and fog. Ask for
   confirmation before beginning execution.

A task is ready when every task in its `blocked_by` list is done. The frontier
is the ready, unfinished task set.

## Dynamic growth

The graph is deliberately allowed to grow. When a research, prototype,
grilling, manual, feature, or bug task discovers new work:

1. Record the discovery in the task's result or notes.
2. Create a new task if the work is required and can now be stated precisely.
3. Add it to the map's `tasks` list and wire `blocked_by` in a second pass.
4. Graduate newly sharp items from `## Fog` into tasks.
5. Put ruled-out work in `## Out of scope`.
6. Recompute the frontier.

Do not silently expand a task's acceptance criteria. Add a task instead.

## Handoff to execution

When the current frontier is meaningful, hand directly to:

```text
/skill:implement-task <map-slug>
```

There is no `to-spec` or `to-tickets` step. The map and task documents
are the specification. If implementation exposes uncertainty, stop that task
with a clear discovery and return to Wayfinder; do not improvise a hidden plan.

## Resuming

On a later Wayfinder session, or when called back after implementation:

1. Load only the map first.
2. Inspect the current frontier with `task_frontier`.
3. Read task details only as needed.
4. Claim or select one planning question at a time when human input is needed.
5. Update the map and dependencies, then hand back to execution.

Never mark an implementation task complete from Wayfinder. Never resolve an
unclear question by pretending it is a feature task.
