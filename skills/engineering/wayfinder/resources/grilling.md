# Wayfinder Planning Resource, Grilling

Use this resource when the next task is a human decision that cannot be
answered from the repository or external sources.

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: grilling` and no blockers:

```yaml
---
type: task
subtype: grilling
title: <decision>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # optional; omit unless the human must implement it
---
```

The task body must state:

- the decision to settle;
- the parent decisions it depends on;
- the choices already known;
- the recommended starting answer;
- what downstream work the answer may create.

The execution resource will ask one question at a time and must not answer on
the user's behalf.
