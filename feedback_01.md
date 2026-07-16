# Feedback: Task/Slice tool-calls do not resolve slice artifacts

## Problem

The `task_set`, `task_show`, and related tool-calls in the prd-workflow toolkit
only recognise **tasks** and **epics** as artifacts. They do **not** recognise
**slices**, even when the slice has a `kind: slice` frontmatter field, a `slug`
field, and lives under the expected `docs/tasks/<task-slug>/slices/` directory.

This forces manual file editing (`edit` tool with `oldText`/`newText`) to modify
slice frontmatter, which is error-prone and inconsistent with the toolkit's
design.

## Examples

### 1. `task_set` with full slice path

```
$ task_set analysed true docs/tasks/config-db-migrations/slices/1-config-cli.md
→ "'docs/tasks/config-db-migrations/slices/1-config-cli.md' is not a recognised
   artifact under /home/patric/Projects/junius-core/docs/tasks"
```

### 2. `task_set` with slice slug

```
$ task_set analysed true config-cli
→ "no artifact matches 'config-cli'"
```

Same result for `task_show config-cli`.

### 3. `task_slices` works

```
$ task_slices config-db-migrations
→ 1 — config-cli
   2 — database-connection
   3 — migration-runner
```

The `task_slices` command **does** resolve slice slugs from the task's
`slices:` list, but none of the other task-workflow commands accept them.

## Workaround

Use the `edit` tool to modify slice frontmatter directly:

```
edit path=docs/tasks/<task-slug>/slices/<n>-<slug>.md
     oldText="analysed: false\nstatus: todo\n..."
     newText="analysed: true\nstatus: in-progress\n..."
```

## Impact

| Skill | Step | What should happen | What actually happens |
| --- | --- | --- | --- |
| `start-slice` | Step 4 "Finalise" — update slice frontmatter | `task_set <slice-path> analysed true` | Must fall back to manual edit |
| `design-test-strategy` | Step 4 "Persist the test plan" — append `## Test plan` | `edit` slice doc (no issue) | Works via `edit` |
| `size-slices` | Step 2d — set size | `task_set <slice-path> size m` | Must fall back to manual edit |
| `land-slice` | Archive/status update | `task_set <slice-path> status done` | Must fall back to manual edit |

## Suggested fix

1. Make `task_set`, `task_show`, `task_get`, and `task_resolve` accept slice
   artifacts resolved by any of:
   - The full relative path under `docs/tasks/`
   - The slice slug (disambiguated via the active task's `slices:` list in
     `state.yaml`)
   - A `task:slug/slice:slug` compound selector

2. Slice resolution should respect the active task in `state.yaml` as a context
   hint when the slug alone is ambiguous across tasks.

3. `task_assert_kind` should accept `kind: slice`.

## Additional observation

The `task_set` path-based lookup tries to match the given path against
artifact paths under `docs/tasks/`. Slices live at
`docs/tasks/<task>/slices/<n>-<slug>.md`, which is a valid sub-path of
`docs/tasks/`, but the artifact scanner likely only indexes `task.md` and
`epic.md` files, not `slices/*.md`. Adding `slices/*.md` to the artifact index
would fix the path-based resolution.