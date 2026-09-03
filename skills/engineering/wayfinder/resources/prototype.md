# Wayfinder Planning Resource, Prototype

Use this resource when the key uncertainty is best answered by reacting to a
concrete artifact, such as a UI variation, state model, or interaction flow.

Create a direct task with `type: prototype` and no slices:

```yaml
---
kind: task
type: prototype
slug: <slug>
title: <question>
map: <map-slug>
status: ready
blocked_by: []
---
```

The task body must state:

- the single design or behavior question;
- the alternatives worth comparing;
- the smallest artifact that can answer it;
- who must react to the result;
- the decision or implementation tasks it should unblock.

Keep the prototype throwaway. Production implementation belongs in a separate
feature task created after the decision.
