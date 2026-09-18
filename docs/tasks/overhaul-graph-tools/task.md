---
kind: task
type: feature
slug: overhaul-graph-tools
title: Scan-based graph tools and an honest schema reference
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-v4-migration
slices: [overhaul-graph-tools]
---

## What to build

The graph tools and the schema reference rebuilt on scans of the
effort-grouped tree, reading each artifact's own frontmatter (the
map array and its override semantics are gone with the v4 layout).

The frontier, dependency levels, and effort finalizability compute
from directory scans: levels are computed per kind within an effort
(task chains and ticket chains leveled independently); an effort is
finalizable only when every task and ticket is done and, if a spec
exists, at least one ticket exists (the spec-plus-zero-tickets rule
that kills the false-finalizable class); effort readiness at the
feature level derives from blocking efforts' statuses plus the scan
of the effort's own tasks and tickets. The per-task finalizable
check is status-based (workflow_state done), never slice-file-based.
The graph tools report anomalies instead of silently dropping them:
orphaned artifacts, missing blocked_by targets, invalid
status/workflow_state combinations, and deprecated artifacts treated
as done (out of the graph).

The context tool's schema reference is rewritten in full: every
current artifact type with its fields, the two-phase flow including
ticket generation, the conformance rules, mode and size documented,
no slice block, no killed fields; the optional profile appendix
stays. The finalize prose's finalizable gate reads from real
sources.

## Acceptance criteria

- [ ] Frontiers, levels, and finalizability compute from scans of
      fixture trees; no map-array reads.
- [ ] Levels are per kind: task chains and ticket chains level
      independently.
- [ ] An effort with a spec and zero tickets is not finalizable.
- [ ] Each anomaly class (orphan, missing target, invalid combo,
      deprecated-as-done) is reported, never silent.
- [ ] The per-task finalizable check is status-based.
- [ ] The context tool's schema reference describes the v4 flow,
      types, and rules with no slice block and no killed fields.
- [ ] The false-finalizable fixture (a spec-only child) reads as
      unfinished, and the effort reads as not finalizable.
- [ ] Tests through the registered-tool interface against fixture
      trees.

## Blocked by

- overhaul-v4-migration (the graph tools scan the v4 tree this
  ticket's blocker produces).

## Implementation notes

### Slice - overhaul-graph-tools (landed)

Scan-based graph tools and the rewritten schema reference landed on
`slice/overhaul-graph-tools` (3 commits, merged into
`task/overhaul-graph-tools` as `4ebec23`). `src/core/graph.ts` is the new
pure module (`effortGraphs`, `effortFrontier`, `effortLevels`,
`effortFinalizable`, `liveFrontier`, `itemFinalizable`), no file I/O, over
the `ScanIndexLike` view. `src/pi.ts` gains the scan layer (`scanIndex` plus
a per-invocation `scanMemo`), the effort lookup (`graphForPath`,
`hasScanChildren`, `isMapsScope`), the anomaly and deprecated report blocks
(`withAnomalies`, `withDeprecated`), and rewires `task_frontier`,
`task_dependency_levels`, `task_map_finalizable`, and `task_finalizable` onto
the scan, each keeping its v3 array/slice fallback for the live tree.
`artifactSchemaRef` is rewritten in full: the two-phase flow, every v4 type
with its fields, the lifecycle vocabularies, and the conformance rules, with
no slice block and no killed fields. `src/core/art.ts` promotes
`effortKeyOf` and `effortDirOf` to exports so the scan layer groups by effort
without duplicating the scoping rules.

Verified independently: 658/658 tests (15 files), `tsc --noEmit` clean; no
lint script is configured. `tests/graph.test.ts` is new (19 tests at the
model seam); `tests/plugin.test.ts` gains 19 tool-contract tests through the
registered-tool interface against fixture trees, covering the per-kind
frontier, the spec-plus-zero-tickets refusal, the spec-only
false-finalizable fixture, and all four anomaly classes (orphan, missing
target, invalid combination, deprecated-as-done).

Two minor deviations from the approved arch-spec: `art.ts` gained two
exports rather than the one named (`effortDirOf` was also needed to group a
map by its effort directory), and `tests/integration/harness.ts` grew
`workflow_state: done` on its v3 task fixture, the mechanical fixture update
the status-based `itemFinalizable` requires (that file sat outside the
arch-spec's enumerated set). No deviation report was written for this slice.

The live `docs/tasks` tree is untouched and still v3; the v3 fallbacks are
what keep it served until the migration runs. `state.yaml` is unchanged.

Carried forward, one blocker for the very next step:

1. **The new `task_finalizable` breaks the live v3 finalize gate.** The
   arch-spec promised the tools "keep serving the v3 tree unchanged while
   gaining v4 semantics", and gave `task_finalizable` a status-based primary
   check with the v3 slice-count check kept as a secondary gate. The primary
   check has no v3 fallback: `itemFinalizable` reads `workflow_state` alone,
   and no live v3 task doc carries that field (all ten live task docs have
   `status` only). Verified against the live tree through the registered
   tool: `task_finalizable overhaul-graph-tools` now throws "has no
   workflow_state; finalizable requires workflow_state 'done'", where the
   pre-slice code returned "ready to finalize". The same holds for every live
   task, and for the map selector (`task-tools-overhaul`). This lands
   directly on `/skill:finalize-task` Step 0, which calls
   `task_finalizable <slug>` and requires "ready to finalize", so the
   finalize step for this task cannot pass until either the live tree is
   migrated (a user call, and the migration's natural moment is later) or
   `itemFinalizable` gains a v3 fallback that reads `status: done` when
   `workflow_state` is absent. The suite does not catch it: the v3 fixture in
   `tests/plugin.test.ts` was patched to carry `workflow_state: done`, which
   is exactly the mechanical edit that hides the gap, and no test drives the
   tool against the live v3 shape. The other three rewired tools
   (`task_frontier`, `task_dependency_levels`, `task_map_finalizable`) keep
   their v3 fallbacks and are unaffected.
