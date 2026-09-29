# Missing `docs/tasks/` tree

## Symptom

- Tasks are not showing up.
- `docs/tasks/` is missing or empty.
- `/skill:wayfinder`, `/skill:implement-task`, or the tw_* tools cannot find
  task files.

## Missing artifact

The `docs/tasks/` directory tree: one directory per effort holding `map.md`,
an optional `spec.md`, a `tasks/` subdirectory of decision tasks, and a
`tickets/` subdirectory of implementation tickets; plus `archive/`,
`out-of-scope/`, `state.yaml`, `index.md`, and `CHANGELOG.md` at the root.

## Route

Run `/skill:setup-workflow` to create the task directory structure. A fresh
repo takes the onboard branch (it writes the v4 scaffold); an existing pre-v4
tree takes the migrate branch.
