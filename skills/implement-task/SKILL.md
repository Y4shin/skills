---
name: implement-task
description: Autonomous. Implements all remaining slices of a task via per-slice chains. Routes feature tasks through the full architecture-spec / dependency-level flow and bug tasks through a lean red-first regression chain.
metadata:
  telemetry.capture: "target"
---

# Implement Task

> **Telemetry:** once you know the slice count for this task, call the
> `telemetry_skill_context` tool with `{ skill_name: "implement-task",
> sliceCount, map }` — `sliceCount` = the number of slices in the task (from
> the task doc's `slices:` list or `task_slices`), `map` = the map slug if the
> task belongs to a map (else omit). The `target` (task slug) is already
> captured automatically from your invocation argument, so do NOT pass it
> here. Pass `skill_name` explicitly so the metadata correlates to this
> invocation even when multiple skills run in one turn.

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

When invoked with a map, work the ready frontier from `task_frontier`, routing
each child task by its type. Planning and discovery tasks may add new tasks or
reveal fog; update the graph and return to Wayfinder when a new decision must be
made. Do not invent a separate specification or ticket phase.

The `feature` and `bug` resources are the existing implementation pipelines and
must remain unchanged. New resources are deliberately non-coding pipelines.

If no task type is present, `type` defaults to `feature`.

After the current frontier has been completed, call `/skill:wayfinder <map-slug>` to reassess the map, graduate newly discovered work, update dependencies, and add any newly precise tasks before declaring the initiative complete.
