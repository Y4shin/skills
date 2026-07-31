---
name: create-task
description: Compatibility redirect for the retired task-creation workflow; use wayfinder to create and grow task graphs.
disable-model-invocation: true
---

# Retired: Create Task

Task creation is now owned by `/skill:wayfinder`. Do not create a task through
this skill or reintroduce a separate specification/ticket phase.

Run:

```text
/skill:wayfinder
```

Wayfinder creates the map and its dependency-aware tasks directly, then hands
the ready frontier to `/skill:implement-task`. This file remains only so an old
bookmark produces a useful migration message; it is not included in the
package skill manifest.
