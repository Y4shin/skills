---
name: implement-task
description: Autonomous. Implements all remaining slices of a task via per-slice chains. Routes feature tasks through the full architecture-spec / dependency-level flow and bug tasks through a lean red-first regression chain.
---

# Implement Task

Reads the task's `type` frontmatter via `task_get` and dispatches to the appropriate resource. If `type:` is absent, default to the feature path so older tasks behave unchanged.

```
const taskSlug = "<task-slug>"
const taskPath = `docs/tasks/${taskSlug}/task.md`
const taskType = task_get(taskPath, "type") || "feature"

if (taskType === "bug") {
    follow resource "resources/bug.md"
} else {
    follow resource "resources/feature.md"
}
```

If no task type is present, `type` defaults to `feature`.
