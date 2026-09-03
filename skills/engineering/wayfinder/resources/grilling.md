# Wayfinder Planning Resource, Grilling

Use this resource when the next task is a human decision that cannot be
answered from the repository or external sources.

Create a direct task with `type: grilling` and no slices:

```yaml
---
kind: task
type: grilling
slug: <slug>
title: <decision>
map: <map-slug>
status: ready
blocked_by: []
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
