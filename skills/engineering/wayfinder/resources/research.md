# Wayfinder Planning Resource, Research

Use this resource when a decision depends on facts from documentation, APIs,
third-party systems, or the local repository.

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: research` and no blockers:

```yaml
---
type: task
subtype: research
title: <question>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # optional; omit unless the human must implement it
---
```

The task body must state:

- the precise question;
- the decision or ticket it unblocks;
- trusted source boundaries;
- the evidence required for completion;
- likely dependent tasks.

Do not turn a research task into a vague request to "look into" a topic. If the
question is not precise, leave it in the map's Fog instead.
