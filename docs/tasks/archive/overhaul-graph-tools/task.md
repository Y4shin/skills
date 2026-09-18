---
kind: task
type: feature
slug: overhaul-graph-tools
title: Scan-based graph tools and an honest schema reference
map: task-tools-overhaul
status: done
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

Carried forward, one blocker for the very next step, **resolved in
`ffad626` and hardened in the review follow-up**:

1. ~~**The new `task_finalizable` breaks the live v3 finalize gate.**~~
   `itemFinalizable` gained the v3 fallback this note asked for: when
   `workflow_state` is absent (the v3 shape), legacy `status` is the
   done-ness source, so live v3 task docs get status-based answers instead
   of a `workflow_state` error. Verified against the live tree through the
   registered tool (`task_finalizable overhaul-graph-tools` now names
   `status 'ready', not 'done'`; a done v3 task passes). Regression coverage:
   `tests/graph.test.ts` (v3 fallback, both directions) and
   `tests/plugin.test.ts` (the live v3 shape: status-only frontmatter).
   The v3 fixtures keep a schema-valid pair (`status: stable` plus
   `workflow_state: done`) after review flagged the first draft's
   `draft`/`done` combination as a conformance violation.

### Architecture lessons (harvested at finalize)

- **A spec invariant and a spec mechanism can contradict; the invariant
  wins.** "Keep serving the v3 tree unchanged" versus a status-based check
  with no v3 fallback: the land-worker caught it only because it ran the
  tool against the live tree. The suite could not, because the fixture had
  been patched into the new shape. Live-tree smoke checks are now part of
  this workflow's finalize discipline for any tool that reads the tree.
- **Deprecated-as-done needs a visibility channel per tool, not per
  codebase.** The first cut reported the deprecated set only on
  `task_frontier`; review caught that `task_dependency_levels` and
  `task_map_finalizable` silently omitted it. The rule that stuck: every
  graph tool that answers about an effort also reports its deprecated set
  and its anomalies.
- **Grouping keys and scoping keys are different things.** `effortKeyOf`
  buckets every map into one `maps:` scope (right for `blocked_by`
  resolution), so effort grouping needs the directory rule (`effortDirOf`)
  separately. Promoting both to exports beat duplicating the path logic.
