# Missing `docs/tasks/state.yaml`

## Symptom

- The current map or task pointer is lost between sessions.
- Workflow state is not tracked.
- `docs/tasks/state.yaml` is missing or empty.

## Missing artifact

`docs/tasks/state.yaml`, carrying the schema version and the two real-null
pointers.

## Route

Run `/skill:setup-workflow` to write `docs/tasks/state.yaml` in the current
schema shape.
