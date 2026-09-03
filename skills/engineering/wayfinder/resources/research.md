# Wayfinder Planning Resource — Research

Use this resource when a decision depends on facts from documentation, APIs,
third-party systems, or the local repository.

Create a direct task with `type: research` and no slices:

```yaml
---
kind: task
type: research
slug: <slug>
title: <question>
map: <map-slug>
status: ready
blocked_by: []
---
```

The task body must state:

- the precise question;
- the decision or task it unblocks;
- trusted source boundaries;
- the evidence required for completion;
- likely dependent tasks.

Do not turn a research task into a vague request to "look into" a topic. If the
question is not precise, leave it in the map's Fog instead.
