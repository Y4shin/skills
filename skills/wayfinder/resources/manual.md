# Wayfinder Planning Resource — Manual

Use this resource when progress requires a human or environment prerequisite,
such as obtaining access, provisioning a service, or inspecting data that is
not yet available.

Create a direct task with `type: manual` and no slices:

```yaml
---
kind: task
type: manual
slug: <slug>
title: <prerequisite>
map: <map-slug>
status: ready
blocked_by: []
---
```

The task body must state:

- the exact prerequisite;
- the owner or actor;
- the checklist or safe automation boundary;
- evidence required to mark it done;
- dependent tasks that remain blocked.

Never put credentials or secrets in the task document.
