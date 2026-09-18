---
title: Archiving a done map child empties the map frontier forever
status: fixed
severity: major
reported: 2026-09-17
confirmed_by: reproduction (task_frontier returns [] while an unblocked child exists)
fix_commit: 4fa98d83957625d4b60f2e2b08af1bff0b41ddf4
promoted_to: overhaul-graph-tools
skill: finalize-task
---

## Observed

Finalizing a map child breaks the map's own graph tools. After
`overhaul-state-module` was archived and its map entry marked `done: true`,
`task_frontier task-tools-overhaul` returned `(empty frontier)` even though
`overhaul-artifact-model` was unblocked and ready to start.

Reproduced on 2026-09-17 immediately after finalizing
`overhaul-state-module` in the `task-tools-overhaul` map:

- `task_map_tasks task-tools-overhaul` correctly lists all 11 children,
  including `overhaul-state-module` with `done: true`.
- `task_frontier task-tools-overhaul` returns `[]`.
- `task_map_finalizable task-tools-overhaul` correctly reports the seven
  unfinished children.

So the map's own "what is ready next" query is dead exactly when the map
needs it most: after the first child lands.

## Root cause

`task_frontier` computed readiness through `mapChildInfos` (src/pi.ts), which
resolved each listed child by looking up its `task.md` on disk.
`taskPathForSlug` searched `docs/tasks/<slug>/task.md` and the live
subdirectories, but **not** `docs/tasks/archive/`, so a finalized (archived)
child was silently dropped from the child list, vanished from the `done` set,
and blocked its dependents forever.

## Fix summary

Fixed by `overhaul-graph-tools` (merged as `4fa98d8`). The graph tools no
longer resolve children through `taskPathForSlug` at all: `task_frontier`,
`task_dependency_levels`, and `task_map_finalizable` compute from a full
directory scan of the tree, archive included, reading each artifact's own
frontmatter. An archived done child is scanned like any other artifact, so it
stays in the `done` set and its dependents unblock. The map's `tasks:` array
is no longer read on the scan path, which also retires the listed-vs-fileless
drift class. The legacy array path remains only as a v3 fallback for maps
whose children have no scanned artifacts, and it is deleted by
`overhaul-dead-surface`.

## Expected

A child marked `done: true` in the map is treated as done regardless of
whether its directory still sits under `docs/tasks/` or has moved to
`docs/tasks/archive/`. The frontier for the map above should list
`overhaul-artifact-model`.

## Reproduction

1. Have a map with at least two chained children (`A` blocks `B`).
2. Finalize `A` (which archives `docs/tasks/A/` to `docs/tasks/archive/A/`)
   and mark it `done: true` in the map.
3. Call `task_frontier <map>`. It returns `[]` instead of `[B]`.
4. Confirm the divergence with `task_map_tasks <map>`, which still lists `A`
   as done.

Observed on 2026-09-17 in the `task-tools-overhaul` map.

## Suspected area

`mapChildInfos` and `taskPathForSlug` in `src/pi.ts`: either make
`taskPathForSlug` also search `docs/tasks/archive/`, or have `mapChildInfos`
trust the map's own `done: true` for a listed child whose file is missing
rather than dropping the child entirely. The v4 overhaul's scan-based graph
tools (`overhaul-graph-tools`) rebuild this path anyway, so the fix may
belong there; until then the map's frontier is unusable after the first
finalize.

Note: this is pre-existing, not introduced by `overhaul-state-module`.
`mapChildInfos` and `taskPathForSlug` are untouched by that ticket.
