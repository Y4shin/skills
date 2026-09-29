# Wayfinder Planning Resource, Manual

Use this resource when progress requires a human or environment prerequisite,
such as obtaining access, provisioning a service, or inspecting data that is
not yet available.

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: manual`:

```yaml
---
type: task
subtype: manual
title: <prerequisite>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # omit unless the human must implement it; manual work usually does
---
```

The task body must state:

- the exact prerequisite;
- the owner or actor;
- the checklist or safe automation boundary;
- evidence required to mark it done;
- dependent tasks that remain blocked.

Never put credentials or secrets in the task document.
