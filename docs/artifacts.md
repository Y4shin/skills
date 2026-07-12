# Task + work-artifact reference

Shared by all task-workflow skills.

## Project-level conventions (`docs/testing.md`)

In addition to `docs/tasks/`, every project using the task-workflow SHOULD
maintain a `docs/testing.md` file at the project root (not inside
`docs/tasks/`). This file describes the project's testing infrastructure and
conventions. It is read by `design-test-strategy` before generating a test
plan for a slice, and it is updated during `finalize-task` as new patterns
or tooling are discovered.

See the template in `onboard-workflow` for the recommended contents.

---

Three tiers

- **epic** (`kind: epic`) — a coordinated outcome that spans several tasks. Has no slices of its own. *Optional* — a lone task needs no epic.
- **task** (`kind: task`) — one feature or one foundational capability. Broken into slices. May belong to an epic (`epic:` field).
- **slice** (`kind: slice`) — one independently-grabbable vertical tracer-bullet.

No GitHub/Forgejo issues. State lives entirely in `docs/tasks/` directory tree and frontmatter. Slice ordering uses `blocked_by` slugs, not issue numbers.

## Directory structure

```
docs/tasks/
├── state.yaml                          # session resumption
├── CHANGELOG.md                        # completed task summaries
├── <task-slug>/                        # active task
│   ├── task.md
│   └── slices/
│       ├── <n>-<slug>.md               # todo / in-progress
│       └── archive/                    # done slices
│           └── <n>-<slug>.md
├── archive/                            # completed tasks
│   └── <task-slug>/
│       ├── task.md
│       └── slices/
│           ├── <n>-<slug>.md
│           └── archive/
│               └── <n>-<slug>.md
├── epics/
│   ├── <epic-slug>/
│   │   └── epic.md                     # active epic
│   └── archive/                        # completed epics
│       └── <epic-slug>/
│           └── epic.md
```

## State distribution

| Data | Location |
| --- | --- |
| Active task / slice / epic | `docs/tasks/state.yaml` `active` block |
| Next action | `docs/tasks/state.yaml` `next_action` |
| Last completed action | `docs/tasks/state.yaml` `last_action` |
| Slice status, size, timestamps | Slice doc frontmatter |
| Task status, timestamps | Task doc frontmatter |
| Epic status, timestamps | Epic doc frontmatter |
| Completed task log | `docs/tasks/CHANGELOG.md` |

## Frontmatter

### Task (`task.md`)

```yaml
---
kind: task
title: <short human title>
slug: <kebab-slug>
epic: <epic-slug>              # OPTIONAL
slices: [<slug-a>, <slug-b>]   # slice slugs in dependency order
status: draft | slices-planned | in-progress | done
started_at: <ISO 8601>
completed_at: <ISO 8601>
---
```

### Slice (`slices/<n>-<slug>.md`)

```yaml
---
kind: slice
title: <short human title>
slug: <kebab-slug>
task: ../task.md
mode: hitl | afk
analysed: false
status: todo | in-progress | done
size: s | m | l | xl
blocked_by: [<slug>, ...]     # slice slugs, not issue numbers
started_at: <ISO 8601>
completed_at: <ISO 8601>
---
```

### Epic (`epic.md`)

```yaml
---
kind: epic
title: <short human title>
slug: <kebab-slug>
tasks:                          # ordered child task decomposition
  - slug: <task-slug>
    blocked_by: [<task-slug>, ...]
    done: false
status: draft | tasks-planned | in-progress | done
started_at: <ISO 8601>
completed_at: <ISO 8601>
---
```

## Branching model

- Each task has one integration branch: `task/<task-slug>`, branched from `main`.
- Slices branch off `task/<task-slug>` as `slice/<slug>`, merge back in.
- **No per-slice PR.** Only `finalize-task` merges into main.

## Lifecycle

1. `create-task` → writes `task.md` with `started_at` (status `draft`) or `epic.md` (status `draft`)
2. `slice-task` → writes slice docs (status `slices-planned`)
3. `size-slices` → sets `size` per slice
4. `start-slice <slug>` → sets `analysed: true`, writes test plan (status `in-progress`, `started_at`)
5. `implement-slice <slug>` → TDD, merges into task branch, archives slice doc to `slices/archive/`
6. `finalize-task <slug>` → harvests knowledge, archives task to `docs/tasks/archive/`, merges into main
7. *(if epic and last child)* `finalize-task` also finalizes the epic

An unarchived slice doc ⇒ unfinished work. An unarchived `docs/tasks/<slug>/` ⇒ unfinished task.
