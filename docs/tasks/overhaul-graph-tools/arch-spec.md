# Architecture spec: overhaul-graph-tools

Status: awaiting user approval.
Scope: `src/core/graph.ts` (new), `src/pi.ts` (rewire the graph tools and the
schema reference), `tests/graph.test.ts` (new), and the v3 graph-tool tests in
`tests/plugin.test.ts` (mechanically re-pointed at the new fixture shape).
`src/core/art.ts` gains one export (`effortKeyOf`, promoted from private).
No other source or config file changes.

## Scope boundary (what this ticket does NOT do)

- **Not** the `task_*` to `tw_*` rename (`overhaul-tw-rename`). Tool names
  stay `task_*` here; the rename ticket renames them mechanically.
- **Not** deleting tools (`overhaul-dead-surface`). `task_resolve`,
  `task_assert_kind`, `task_map_tasks`, `task_map_tick`, `task_slices`,
  `task_set_slices`, `activeSlices`, and `sliceInfoFrom` stay working so the
  live v3 tree and the suite keep passing.
- **Not** skill prose (`overhaul-planning-skills`, `overhaul-execution-skills`).
  This ticket rewrites only the schema text `task_context` *returns*; the
  finalize-task SKILL.md prose that reads it is a later ticket.
- **Not** the migration. The live tree stays v3; these tools must keep
  serving the v3 tree unchanged while gaining v4 semantics.

## The problem in one paragraph

`task_frontier`, `task_dependency_levels`, and `task_map_finalizable` read
the map's `tasks:` array and resolve children through `taskPathForSlug`,
which never searches `docs/tasks/archive/`. A finalized child moves to the
archive, vanishes from the `done` set, and its dependents can never become
ready: the frontier empties while work remains (the live
`task-tools-overhaul` map is in exactly this state;
`docs/bugs/archived-done-child-empties-frontier.md`). `task_finalizable`
counts slice files instead of reading `workflow_state`. `task_context`'s
schema reference still describes v2/v3 (kind field, slice block, "there is
no separate ticket-generation phase"). All of this is rebuilt on directory
scans of each artifact's own frontmatter, per the effort spec's Graph
semantics and Tool surface sections.

## New module: `src/core/graph.ts`

Pure computation over scanned artifacts, no file I/O (same rule as
`art.ts`; all file I/O stays in `pi.ts`).

```ts
import type { Artifact, Anomaly } from "./art.js";

export interface EffortGraph {
  /** The effort's anchor slug: map slug, else the effort directory name. */
  slug: string;
  map: Artifact | null;
  spec: Artifact | null;
  tasks: Artifact[];    // type "task", excluding deprecated
  tickets: Artifact[];  // type "ticket", excluding deprecated
  deprecated: Artifact[]; // tasks/tickets with status "deprecated"
  anomalies: Anomaly[]; // anomalies touching this effort's artifacts
}

/** Loose coupling: the scan layer hands over this view of its index. */
export interface ScanIndexLike {
  hits: ReadonlyArray<{ path: string; art: Artifact }>;
  anomalies: Anomaly[];
}

/** Group scanned hits into effort graphs, keyed by effort scope. */
export function effortGraphs(index: ScanIndexLike): Map<string, EffortGraph>;

/** Unfinished tasks or tickets whose kind-scoped blockers are all done. */
export function effortFrontier(graph: EffortGraph): Artifact[];

/** BFS levels over unfinished items, tasks and tickets leveled independently. */
export function effortLevels(graph: EffortGraph): {
  tasks: string[][];
  tickets: string[][];
  remaining_count: number;
  done_count: number;
};

/** Null when finalizable, else a human-readable reason. */
export function effortFinalizable(graph: EffortGraph): string | null;

/** Live efforts whose map-level blockers are all done. */
export function liveFrontier(index: ScanIndexLike): EffortGraph[];

/** Null when finalizable, else a human-readable reason. Status-based. */
export function itemFinalizable(art: Artifact): string | null;
```

### Semantics

- **Done-ness** gates on `workflow_state: done` only. Deprecated tasks and
  tickets count as done and sit out of the graph (they are collected into
  `deprecated` and reported, never silently dropped).
- **An effort** is finalizable when every task and ticket is done **and**,
  if a spec exists, at least one ticket exists (the spec-plus-zero-tickets
  rule that kills the false-finalizable class). An effort with no spec and
  no tickets is finalizable (a tasks-only effort, e.g. a grilling effort).
- **Frontier and levels are per kind** within an effort: task chains and
  ticket chains level independently; `blocked_by` edges are kind-scoped and
  effort-scoped, per the spec's Graph semantics.
- **Effort readiness at the feature level** derives from blocking efforts'
  statuses plus the scan of the effort's own tasks and tickets: a live
  effort is in the map-level frontier when every effort in its map's
  `blocked_by` is done (all its tasks and tickets done, or its map
  deprecated) and the effort itself has unfinished work.
- **Per-item finalizability is status-based**: `workflow_state: done` means
  ready to finalize; anything else is a reason ("workflow_state is
  'in-progress', not 'done'"). No slice-file reads anywhere in the new code.
- **Cycles** in a `blocked_by` graph: `dependencyLevels`' existing
  no-progress fallback assigns the remaining cycle members to one level
  instead of deadlocking; that behavior carries over per kind.
- **Anomalies are reported, not silently dropped.** The existing
  `findAnomalies` seam in `art.ts` produces them; the scan index collects
  them once per scan; every graph tool appends a formatted `## Anomalies`
  block (or an `anomalies` array under `--json`) when the effort's set is
  non-empty. `effortKeyOf` is promoted from private to exported in `art.ts`
  so the scan layer can group by effort without duplicating the scoping
  rules.

## The scan layer (`src/pi.ts`)

`scanArtifacts` already walks the whole tree and tolerates both shapes.
This ticket adds a caching wrapper:

```ts
interface ScanIndex { hits: ScanHit[]; anomalies: Anomaly[] }

/** One scan per tool invocation: cached per (root, mtime-of-scan) call. */
function scanIndex(root: string): ScanIndex
```

The cache is a per-call memo (a fresh `scanIndex` per `execute`), so no
invalidation machinery: each tool invocation scans once, computes
`findAnomalies` once, and every graph tool it serves reads the same index.
`findAnomalies` is called with `path` set on every artifact (the resolver
already sets it), so orphan and missing-target checks run.

## Tool rewiring (`src/pi.ts`)

### `task_frontier`

- Selector resolving to a **map**: the v4 answer for that one effort:
  unfinished tasks and tickets whose blockers are done, per kind, plus the
  effort's anomalies.
- Selector resolving to the **maps scope** (the v3 `maps/` directory or, in
  v4, the tasks root): the cross-effort frontier: every live effort whose
  blocking efforts are done, with its per-kind frontier nested.
- v3 behavior is preserved by delegation: when the resolved map's effort
  yields no scan children (a v3 map whose tasks live in flat task dirs),
  fall back to the legacy `mapChildInfos` path unchanged. This keeps the
  live v3 tree working until the migration runs.

### `task_dependency_levels`

- Map selector: `{ tasks: string[][], tickets: string[][],
  remaining_count, done_count, anomalies }` from `effortLevels`, per kind.
- Task selector: the legacy slice-level path stays (v3 tasks still have
  slices until `overhaul-dead-surface`).

### `task_map_finalizable`

- Map selector: `effortFinalizable` on the scan; the map `tasks:` array is
  never read. A spec-only effort is not finalizable. All-done effort with a
  spec and at least one ticket is finalizable. The spec-only-child fixture
  reads as unfinished. Anomalies ride along.
- v3 fallback as in `task_frontier` (array-based check) when the effort
  has no scan children.

### `task_finalizable`

- Status-based: `itemFinalizable(art)`. `workflow_state: done` returns
  "ready to finalize"; anything else throws naming the current state.
- The v3 slice-count check is **kept as a secondary gate** for v3-shape
  tasks only (a v3 task with `workflow_state: done` and open slice files is
  a contradiction worth surfacing), but the primary check is the status.
  v4 tasks have no slice files, so the secondary gate is a no-op there.

### `task_context`: the schema reference rewritten in full

`artifactSchemaRef()` is replaced. The new text describes, in the same
compact reference style:

- **The two-phase flow**: wayfinder decision tasks, then to-spec, then
  to-tickets generating implementation tickets. The sentence "there is no
  separate ticket-generation phase" is deleted.
- **Every artifact type with its fields**, per the spec's Frontmatter
  section:
  - Task (`tasks/<task>/task.md`): `type: task`, `subtype: research |
    prototype | grilling | manual`, `title`, `status`, `workflow_state`,
    `blocked_by`, optional `mode: human`.
  - Ticket (`tickets/<ticket>/ticket.md`): `type: ticket`, `subtype:
    feature | bug`, `title`, `status`, `workflow_state`, `blocked_by`,
    optional `mode: human`, optional `size: s | m | l | xl` (absent means
    `m`).
  - Map (`map.md`): `type: map`, `title`, `status`, `blocked_by` holding
    feature-to-feature edges. No `workflow_state`; effort done-ness is
    derived by scan.
  - Spec (`spec.md`): `type: spec`, `title`, `status` (draft while
    writing, stable when published). No `workflow_state`.
  - Aux: `arch spec`, `findings`, `deviation report`, `changelog`,
    `out-of-scope note`: `type`, `title`, `status`; no `workflow_state`.
- **The lifecycle vocabularies**: `status: draft | stable | deprecated`;
  `workflow_state: todo | ready | in-progress | blocked | done`; done-ness
  gates on `workflow_state`.
- **The conformance rules**: parseable YAML frontmatter with a non-empty
  `type` on every non-reserved `.md`; unknown values and keys tolerated;
  combination rules (draft pairs only with todo, deprecated only with
  done, stable with anything).
- **No slice block, no killed fields**: no `kind`, no `slices:`, no
  `started_at` / `completed_at`, no `map:` on tasks or tickets, no slice
  schema section.
- **The profile appendix stays**: `profile.md` is still appended when
  present, unchanged.

## Existing abstractions to use

- `findAnomalies`, `validateArtifact`, `Artifact`, `Anomaly`, `TYPE_LEAVES`
  from `core/art.ts`.
- `dependencyLevels` from `core/art.ts` for the per-kind BFS (it already
  handles cycles and missing blockers the way the spec wants).
- `scanArtifacts`, `ScanHit`, `resolveArt`, `parseArtifactFile`,
  `taskRoot`, `findRoot` in `src/pi.ts`.
- Test helpers `mkTmp` / `ctx` / `writeMd` and the `seedV4Tree` pattern in
  `tests/plugin.test.ts`.

## Do NOT reimplement

- No new YAML or file-IO helper; the scan layer reuses `scanArtifacts`.
- Do not change `frontmatter.ts`, `state.ts`, or the migration modules.
- Do not delete `mapChildInfos`, `taskPathForSlug`, `activeSlices`,
  `dependencyLevels`, or any tool; `overhaul-dead-surface` owns deletions.
- Do not touch skill prose, `package.json`, or the docs pages.
- Do not run the migration against the live tree; the v3 fallback paths
  exist precisely because the live tree is still v3.

## Seams (need approval)

1. **Model seam:** the pure exports of `src/core/graph.ts`
   (`effortGraphs`, `effortFrontier`, `effortLevels`, `effortFinalizable`,
   `liveFrontier`, `itemFinalizable`), tested directly over hand-built
   `Artifact` lists. No file I/O.
2. **Tool-contract seam:** `createTools()` then `task_frontier`,
   `task_dependency_levels`, `task_map_finalizable`, `task_finalizable`,
   and `task_context` executed against scratch fixture trees in the v4
   shape, the way skills invoke them. No test imports a private helper
   from `src/pi.ts`.

## Interface contract for dependents

- `effortGraphs(index)` is the seam `overhaul-tw-rename` and the skill
  tasks consume indirectly through the tools; its shape is stable from
  this ticket on.
- The `## Anomalies` output block format is stable: one line per anomaly,
  `- [<kind>] <detail>`.
- `task_context`'s new schema text is the contract the planning-skills
  ticket's prose must match; the skill tasks re-read it rather than
  restating the schema.

## Test plan

`tests/graph.test.ts` (model seam, new file):

- `effortGraphs` groups a mixed scan into efforts; deprecated artifacts
  land in `deprecated`, not in `tasks`/`tickets`.
- `effortFrontier`: mixed readiness (one done task, one ready task, one
  blocked ticket); kind scoping (a ticket blocked by a task slug is not
  affected by the task's state).
- `effortLevels`: a task chain and a ticket chain in one effort level
  independently; a cycle in one kind does not deadlock the other.
- `effortFinalizable`: empty effort (map only) is finalizable; all-done
  with spec and one ticket is finalizable; all-done with spec and zero
  tickets is not; one unfinished ticket is not.
- `liveFrontier`: an effort-to-effort edge on the maps delays readiness
  until the blocking effort is done.
- `itemFinalizable`: done passes; every other state names the state in
  the error.

`tests/plugin.test.ts` (tool-contract seam, extended):

- New `seedGraphTree` fixture: one effort with a spec, a task chain, a
  ticket chain, a deprecated ticket, and an anomaly (a missing
  `blocked_by` target); a second effort blocked on the first; a spec-only
  effort.
- `task_frontier` on the effort map: per-kind frontier, deprecated ticket
  absent, anomalies block present.
- `task_frontier` on the tasks root: the blocked second effort absent
  until the first is done.
- `task_dependency_levels` on the effort map: independent task and ticket
  levels.
- `task_map_finalizable`: spec-plus-zero-tickets effort refused; all-done
  effort with spec and one ticket ready; the reason strings name the rule
  that fired.
- `task_finalizable`: status-based pass and fail; the v3 slice
  contradiction still surfaces on a v3 fixture.
- `task_context`: the text names `subtype`, `workflow_state`, `mode`,
  `size`, the ticket type, and the two-phase flow; it does not contain
  `kind:`, `slices:`, the slice schema block, or "no separate
  ticket-generation phase".
- Every anomaly class (orphan, missing target, invalid combination,
  deprecated-as-done) appears in tool output, never silently dropped.
- The existing v3 graph-tool tests keep passing unchanged except where a
  fixture must grow the field the new code reads (`workflow_state`); those
  edits are mechanical.

`tests/art.test.ts`, `tests/state.test.ts`, and the migration tests are
untouched and must stay green (the no-regression criterion).

## Constraints and dependencies

- Size `l`: chain budgets 60 turns / 600s.
- Design context: `docs/tasks/task-tools-overhaul/spec.md` sections Graph
  semantics and Tool surface; decision record
  `docs/tasks/overhaul-synthesis-grilling/task.md` rounds 2 (spec
  visibility), 5 (scan-based tools), 6 (per-kind scoping).
- The `findAnomalies` seam in `src/core/art.ts` is the input; it is clean
  on the live tree (0 anomalies over 118 artifacts).
- No em-dashes in any prose this workflow writes.
