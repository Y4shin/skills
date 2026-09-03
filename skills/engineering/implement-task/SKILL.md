---
name: implement-task
description: Autonomous. Implements all remaining slices of a task via per-slice chains. Routes feature tasks through the full architecture-spec / dependency-level flow and bug tasks through a lean red-first regression chain.
metadata:
  telemetry.capture: "target"
---

# Implement Task

> **Telemetry:** once you know the slice count for this task, call the
> `telemetry_skill_context` tool with `{ skill_name: "implement-task",
> sliceCount, map }` -- `sliceCount` = the number of slices in the task (from
> the task doc's `slices:` list or `task_slices`), `map` = the map slug if the
> task belongs to a map (else omit). The `target` (task slug) is already
> captured automatically from your invocation argument, so do NOT pass it
> here. Pass `skill_name` explicitly so the metadata correlates to this
> invocation even when multiple skills run in one turn.

> **Async dispatch (hard rule):** every `subagent(...)` call in this skill's
> resources -- feature chains, bug chains, and any fan-out -- MUST be launched
> with `async: true`. Never run a blocking/foreground subagent. After
> dispatching, call `wait({ id })` (or `wait()` / `wait({ all: true })`) to
> receive the result while keeping the turn alive; async runs are tracked,
> interruptible, and steerable.

Reads the task's `type` frontmatter via `task_get` and dispatches to the appropriate resource. If `type:` is absent, default to the existing feature path so older tasks behave unchanged.

```
const taskSlug = "<task-slug>"
const taskPath = `docs/tasks/${taskSlug}/task.md`
const taskType = task_get(taskPath, "type") || "feature"

const resources = {
  research: "resources/research.md",
  prototype: "resources/prototype.md",
  grilling: "resources/grilling.md",
  manual: "resources/manual.md",
  feature: "resources/feature.md",
  bug: "resources/bug.md",
}

follow resource resources[taskType] || resources.feature
```

## Skill delegation for planning types

Under the two-phase model, planning types (research, prototype, grilling,
manual) come from wayfinder; implementation types (feature, bug) come from
`to-tickets`. The per-type resources above remain the inline definition and
fallback for each type. Where a standalone skill of the same name exists,
the orchestrator MAY delegate to it instead of running the resource inline:

- **`type: research`** -- delegate to the `research` skill (a background agent
  that investigates against primary sources and leaves cited Markdown). Use
  this when the question benefits from a dedicated background agent; the
  research resource is the inline fallback for smaller lookups.
- **`type: prototype`** -- delegate to the `prototype` skill (throwaway code
  that answers one design question, either a logic HTML file or toggleable UI
  variants). Use this when the design question needs a concrete artifact; the
  prototype resource is the inline fallback.
- **`type: grilling`** and **`type: manual`** -- no standalone skill; run the
  per-type resource inline as today.

The task type and the skill **coexist**: the task type is the planning
artifact (wayfinder creates it with acceptance criteria, `blocked_by`,
etc.); the skill is the reusable discipline (the background-agent process,
the throwaway-code conventions). Delegating to the skill does not replace the
task document; the skill's output feeds back into the task's findings or
notes, and the task is marked done when its acceptance criteria are met.

When invoked with a map, work the ready frontier from `task_frontier`, routing
each child task by its type. The frontier is the task graph's ready edge:
tasks whose `blocked_by` dependencies are all done. Planning and discovery
tasks may add new tasks or reveal fog; update the graph and return to
Wayfinder when a new decision must be made. Do not invent a separate
specification or ticket phase.

The `feature` and `bug` resources are the existing implementation pipelines.
New resources are deliberately non-coding pipelines.

If no task type is present, `type` defaults to `feature`.

After the current frontier has been completed, call `/skill:wayfinder <map-slug>` to reassess the map, graduate newly discovered work, update dependencies, and add any newly precise tasks before declaring the initiative complete.

> **Feedback:** if execution hits a snag -- a chain that kept failing, a slice
> that wouldn't split, a worker that needed a tool it lacked, a dependency
> level that blocked unnecessarily, or something that worked notably well --
> call `submit_feedback({ kind, data })` autonomously to record it. `kind` is
> a short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the code. The
> tdd-worker, slice-verifier, deviation-reporter, and land-worker agents also
> call this tool themselves; you don't need to relay their friction. Requires
> the `pi-telemetry` extension (`submit_feedback` tool).
