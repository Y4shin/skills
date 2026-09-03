# Missing `docs/tasks/state.yaml`

## Symptom

- The current task or slice is lost between sessions.
- Workflow state is not tracked.
- `docs/tasks/state.yaml` is missing or empty.

## Missing artifact

`docs/tasks/state.yaml` with the standard task workflow state.

## Route

Run `/skill:setup-workflow` to write `docs/tasks/state.yaml`.
