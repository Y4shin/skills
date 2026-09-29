# Wayfinder Planning Resource, Prototype

Use this resource when the key uncertainty is best answered by reacting to a
concrete artifact, such as a UI variation, state model, or interaction flow.

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: prototype` and no blockers:

```yaml
---
type: task
subtype: prototype
title: <question>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # optional; omit unless the human must implement it
---
```

The task body must state:

- the single design or behavior question;
- the alternatives worth comparing;
- the smallest artifact that can answer it;
- who must react to the result;
- the decision or implementation tickets it should unblock.

Keep the prototype throwaway. Production implementation belongs in a separate
feature ticket created after the decision, by `to-tickets`.
