---
name: wayfinder
description: The single planning-phase skill. Each invocation is one bounded pass over a shared map of decision tasks (research, prototype, grilling, manual): work the ready frontier, write results back to the map, and reconcile when the frontier empties. Produces decisions, not deliverables; hands off to to-spec and to-tickets for implementation.
disable-model-invocation: true
---

# Wayfinder

Wayfinder is the single planning-phase skill. It creates the map and the
planning tasks, works the planning frontier (delegating `research` and
`prototype`, running `grilling` and `manual` itself), writes results back, and
runs the reconcile pass. There is no `plan-task`: the planning half of
`implement-task` is folded in here.

Wayfinder stays user-invoked: the human types `/skill:wayfinder` for each
pass. One invocation is one bounded pass, never a background loop.

## Open first

Every pass starts by opening the skill: call `tw_open` with
`{ skill: "wayfinder", effort: "<effort-slug>" }` (the effort slug is the
directory name under `docs/tasks/`). The opener is the gate: it checks the
phase preconditions against the artifact tree, refuses with the legal next
calls when they fail, and activates the planning toolset only when they pass.
Work only through the tools the opener discloses, and close the pass with
`tw_close wayfinder` when it releases.

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
`to-tickets`, aligned with its Boundary; the implementation phase owns
completing tickets. There is no separate specification or ticket-generation
step inside Wayfinder.

## The map

Every map starts with one mandatory grilling session. Start from the user's
idea, inspect the repository, existing `CONTEXT.md`, ADRs, active efforts, and
project profile, then run the grilling loop before creating the map or any
child tasks. That initial grilling is the first pass's one grilling.

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

## Non-goals

- ...

## Non-negotiable facts

**Success test:** <the one line that decides whether the effort succeeded>

- ...
```

Seed `## Non-goals` and `## Non-negotiable facts` as placeholders when the map
is created, so a reconcile refusal names missing content, not a missing
section. `## Non-negotiable facts` opens with the bolded success-test line;
`tw_finalize_map` refuses without it.

Chart the initial graph:

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

## The planning tasks

Decision tasks live at `docs/tasks/<effort>/tasks/<task-slug>/task.md`. The
directory is the registration: writing the file is all there is, there is no
array to update. Each task has one planning subtype. Choose the subtype using
this table, then follow the matching resource under
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

The resource defines the task body, acceptance/evidence criteria, and the
task's write-back and done-marking steps. Use `blocked_by` for ordering. Edges
are kind-scoped and effort-scoped: a task's `blocked_by` names other tasks of
the same effort.

A task is ready when every task in its `blocked_by` list is done. The frontier
is the ready, unfinished task set. Read it with `tw_frontier <effort-slug>`;
layer the whole effort with `tw_dependency_levels <effort-slug>`.

## The bounded pass

A pass is bounded to one frontier snapshot and at most one grilling:

1. Snapshot the frontier once with `tw_frontier <effort-slug>`. The snapshot
   is the pass's work list: a task that becomes ready after the snapshot
   waits for the next pass.
2. Work the snapshot's non-grilling ready tasks. Planning work is serialized
   per kind: never two grillings at once, while research and prototype
   may run concurrently when they do not collide (a shared file, a shared
   question, or a shared human). Delegate a research task to the
   `research` skill and a prototype task to the `prototype` skill; run
   `manual` and `grilling` here, through their resources.
3. Run exactly one grilling, after the non-grilling ready tasks. A second
   ready grilling waits for the next pass.
4. Release: close the pass with `tw_close wayfinder` and return control. The
   pass never rolls into the next frontier.

When the snapshot's ready frontier is empty, the pass runs the reconcile step
(below) and releases. After the last planning task is done, every pass is
exactly that: open, reconcile, release.

## Write back, then mark done

Every planning task writes its own results back to the map through
`tw_write_section` as its final step, before it marks itself done with
`tw_mark_done`. Wayfinder never re-synthesizes decisions from task bodies:
the map's record comes from the task's own write-back, and the reconcile pass
verifies it rather than reconstructing it.

`tw_write_section` is the only writer of the map body, and it is general over
`##` section names. Use it for the short settled-result statement in
`## Decisions so far` and for the two canonical sections. The write-back must
leave the map body referencing the task's slug as a stand-alone token (a short
statement that names the slug does this); `tw_mark_done` refuses the
done-marking while the map does not reference the task. A done-marking clears
a set ready flag, so any plan change after a reconcile forces one more pass.

A task that cannot complete yet is marked blocked with `tw_mark_blocked`,
naming what would unblock it. Work discovered to be out of scope during
planning is recorded with `tw_record_out_of_scope` or folded into the map's
`## Non-goals`.

## The reconcile pass

When the ready frontier is empty, the pass reconciles before it releases:

1. Read each done planning task's recorded results against the map. Verify;
   never re-synthesize from task bodies.
2. Fix what is missing through `tw_write_section`.
3. Set the ready flag to true through `tw_finalize_map`: the only setter of
   the flag, and it sets it last.

`tw_finalize_map` runs every precondition itself and refuses, naming every
missing item, until the planning frontier is empty, `## Non-goals` exists and
is non-empty, and `## Non-negotiable facts` exists, is non-empty, and opens
with the bolded effort-level success-test line. When it refuses, fix what it
names and call it again. Never set the flag any other way: `to-spec` checks
only the ready flag, and a run that finished every planning task but skipped
reconciliation is refused there with a pointer back to Wayfinder.

## Hand off, don't build

When `tw_finalize_map` has set the ready flag, hand off to:

```text
/skill:to-spec <effort-slug>
```

The map's decisions collapse into a spec (`to-spec`), which breaks into
tracer-bullet implementation tickets (`to-tickets`), which the implementation
phase executes. Looping the map straight into implementation skips that
collapse and throws the linked detail away, so go to the implementation phase
directly only when the effort turned out genuinely small.

If implementation exposes uncertainty, stop that task with a clear discovery
and return to Wayfinder for a **new planning task** (not a re-open of the old
one). This is a designed-for escape hatch: record that it fired by calling
`submit_feedback({ kind: "expected", data })` with `data` e.g.
`"wayfinder: task <slug> returned with unresolved uncertainty"`.

Do not improvise a hidden plan. Do not silently expand a task's acceptance
criteria. Add a task instead.

## Resuming

On a later Wayfinder session, or when called back after implementation, run a
normal bounded pass:

1. Open the skill, then load only the map first.
2. Set the state pointers: `tw_state_set map <effort-slug>`, then
   `tw_state_set task <task-slug>` for the task you are focusing on.
3. Inspect the current frontier with `tw_frontier <effort-slug>`: the snapshot
   bounds the pass.
4. Read task details only as needed.
5. Claim or select one planning question at a time when human input is needed.
6. Update the map and dependencies through `tw_write_section`, then release.

Never mark an implementation ticket complete from Wayfinder. Never resolve an
unclear question by pretending it is a feature ticket.

> **Feedback:** if planning hits a snag (a grilling loop that circled, a
> dependency that wouldn't wire, a task type that didn't fit, a frontier that
> stalled, or something that worked notably well), call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the project
> work. Requires the `pi-telemetry` extension (`submit_feedback` tool).
