---
title: Archiving a done map child empties the map frontier forever
status: open
severity: major
reported: 2026-09-17
confirmed_by: reproduction (task_frontier returns [] while an unblocked child exists)
fix_commit:
promoted_to:
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

`task_frontier` computes readiness through `mapChildInfos` (src/pi.ts), which
resolves each listed child by looking up its `task.md` on disk:

```ts
const p = taskPathForSlug(root, slug);
const info = p ? taskInfoFromPath(p) : null;
if (info) { ... out.push(info); }
```

`taskPathForSlug` searches `docs/tasks/<slug>/task.md` and the live
subdirectories, but **not** `docs/tasks/archive/`. Finalize-task archives a
finished child with `git mv docs/tasks/<slug>/ docs/tasks/archive/<slug>/`,
which deletes the file `taskPathForSlug` looks for. The child is therefore
silently dropped from `out`, even though the map still lists it as
`done: true`.

The drop cascades: `task_frontier` builds its `done` set from the children
`mapChildInfos` returned, so the archived child is not in `done`. Its
dependent's `blocked_by.every((b) => done.has(b))` is then false forever. A
map whose first child is finalized can never report a frontier again, and the
blockage propagates down the whole chain.

Two sibling tools disagree, which is why this hides: `task_map_tasks` reads
the raw map array and shows the child as done, so the map looks healthy.

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
