---
type: deviation report
title: overhaul-artifact-model
status: stable
---
## Deviation report: overhaul-artifact-model

Branch compared: `task/overhaul-artifact-model..slice/overhaul-artifact-model`
(2 checkpoint commits, `40f79cb`, `489cfd9`).
Spec: `docs/tasks/overhaul-artifact-model/arch-spec.md` (user-approved).
Slice doc: `docs/tasks/overhaul-artifact-model/slices/1-overhaul-artifact-model.md`.

### API surface changes

- **Planned:** `Artifact { type, subtype, status, workflow_state, slug, title,
  mode, size, blocked_by, shape, data }` with `Artifact.kind` gone;
  `KNOWN_TYPES` / `TASK_SUBTYPES` / `TICKET_SUBTYPES` / `OkfStatus` /
  `WorkflowStateValue`; `fromFrontmatter(data)`; `validateCombination`;
  `validateArtifact`; `findAnomalies`; `Anomaly`; and
  `resolveArt(root, selector, want?: string)` returning a `ScanHit`.
- **Actual:** exactly that, plus two additive fields the worker declared:
  - `ArtifactShape` is a named exported type (`"v3" | "v4"`) rather than an
    inline union. Cosmetic.
  - `Artifact.path?: string` (optional) and `fromFrontmatter(data, dirName?)`
    (optional second parameter). Both are needed to satisfy the spec's own
    requirements: `findAnomalies` is specified to compute *location-based*
    anomalies across a scanned set while the model seam is pure (no I/O), and
    the spec says "the resolver supplies the directory name" for the v4 slug.
    `path` is optional, so no caller is obliged to set it.
- **Impact:** none on dependents beyond what the spec planned. `Artifact.kind`
  is gone and every call site reads `.type`; `resolveArt` keeps its
  `(root, selector, want?)` shape with `want` now an OKF type string, so
  `overhaul-graph-tools` and `overhaul-tw-rename` inherit a stable seam.
  `findAnomalies` is present as the seam the graph tools consume.

### Abstraction usage

- Used/was specified: **yes.** `parse` / `dump` / `Document` /
  `FrontmatterData` from `core/frontmatter.ts`; `FrontmatterError` /
  `ResolutionError` from `core/err.ts`; `taskRoot` / `findRoot` /
  `listSubdirs` / `isDir` / `isFile` in `src/pi.ts`; the `mkTmp` / `ctx` test
  helpers. No new YAML or file-IO helper was introduced; `frontmatter.ts` is
  untouched. `sliceInfoFrom` / `SliceInfo` / `dependencyLevels` /
  `WorkItemInfo` all survive and are still exercised by the live slice
  machinery, as the spec required.
- Both approved seams are respected: `tests/art.test.ts` exercises only the
  pure exports; `tests/plugin.test.ts` exercises `createTools()` against
  scratch fixture directories. No test imports a private helper from
  `src/pi.ts`.

### Out-of-scope changes

- **None.** `git diff --name-only` lists exactly the four in-scope files:
  `src/core/art.ts`, `src/pi.ts`, `tests/art.test.ts`, `tests/plugin.test.ts`.
  No `tw_*` rename, no graph-tool rewire, no legacy-slice deletion, no
  migration, no skill prose. `task_frontier` / `task_map_*` / `task_slices` /
  `task_finalizable` keep their current behavior and their tests are untouched.
- The slice branch carries no staged or uncommitted files.

### Divergence from the slice doc's acceptance criteria

All six criteria are met; verification I ran independently:

| Criterion | Verdict | Evidence |
|---|---|---|
| Both shapes resolve by path or slug, wanted kind honored | met | 7 kind-confusion tests; live-tree smoke test resolves v3 task and map |
| Combination rules enforced, invalid combos surface as anomalies | met | 9 `validateCombination` tests, full truth table |
| get/show read new-shape and old-shape artifacts | met | v4 fixture suite plus the untouched old-shape assertions |
| Spec-only effort dirs and aux files resolve | met | dedicated tests for both |
| No regression on the live old-shape tree | met | full suite 523/523 (was 471); live `task_show` smoke test passes |
| Unit tests at the model seam plus tool-contract tests | met | 37 model tests, 88 tool-contract tests |

### Findings a reviewer must weigh

**1. The `orphan` type/location check is asymmetric: it misses `task.md`.**
`LOCATION_FILENAME` maps `ticket` / `map` / `spec` / `arch spec` but **not**
`task`. The spec says the check catches "a `ticket.md` whose type is `task`, a
`task.md` whose type is `ticket`". I reproduced both directions:

- `tickets/<x>/ticket.md` declaring `type: task` → **reported** (orphan).
- `tasks/<x>/task.md` declaring `type: ticket` → **not reported** (`[]`).

The second is a direct acceptance-criteria gap. Because `task.md` is
type-neutral in the table, a `task.md` declaring `type: ticket` falls through
to the effort-anchor check, which passes when the effort has a `map.md`. The
fix is one line (add `task: "task.md"` to `LOCATION_FILENAME`), but a
`task.md` is also the v3 flat-task filename, so the change needs a shape guard
to avoid flagging every v3 task. Flagging it rather than fixing it: the
choice interacts with the v3 shape, which is a design call.

**2. `effortDirOf` mis-scopes archives and the v3 `maps/` subtree.** The
effort is taken as the path segment right after `docs/tasks`, so:

- Every archived effort collapses into one shared bucket named `archive`.
  Two tasks in *different* archived efforts are treated as siblings, and a
  `blocked_by` edge between them is silently accepted (reproduced).
- Every v3 map collapses into a shared bucket named `maps`, so a
  feature-to-feature `blocked_by` edge between two maps is accepted
  regardless of the effort-scoping rule (reproduced).

This is the flagged ambiguity, and the worker's chosen rule is documented in
its output. The rule is internally consistent and simple, but it does not
match the spec's intent for the archived layout. Consequence for the consumer:
`overhaul-graph-tools` will consume `findAnomalies`, so these
false-negatives become the graph tools' blind spots.

**3. The anomaly stream is unusable on the live tree as it stands.** Over the
real `docs/tasks` tree (118 artifacts) `findAnomalies` emits **44 orphans and
10 missing-blocked-by-target**, of which:

- **32 orphans** are the `archive` bucket artifact from finding 2.
- **12 orphans** are "effort has neither a map nor a spec" for live v3
  directories (`eval-stack-research`, `overhaul-artifact-model`, ...). Under
  the current v3 layout a flat task directory *is* its own effort, so this
  fires for every live v3 task. Expected to resolve once
  `overhaul-v4-migration` reshapes the tree.
- **10 missing-blocked-by-target** are all real v3 sibling dependencies
  (`overhaul-artifact-model` blocked by `overhaul-state-module`, and so on)
  that the rule cannot see, because a v3 flat task is scoped to itself.

None of this is a spec violation: the spec says this ticket only *produces*
the anomaly data and the graph tools consume it next ticket. But it means the
producer currently reports mostly false positives on the live tree, and
`overhaul-graph-tools` cannot treat the stream as actionable without the
scoping fixes above. The worker's own report does not mention this; I found it
by running `findAnomalies` over the real tree.

**4. Four em-dashes in added lines (fixed in the coherence pass).** The repo
bans em-dashes in prose this workflow writes. Two were in *new* lines: a
comment in `src/pi.ts` ("not an artifact" followed by an em-dash and "skip,
never fatal") and a `describe` title in `tests/plugin.test.ts` ("task-workflow
tools" followed by an em-dash and "v4 effort-grouped tree"). Two were carried
over from pre-existing text (`src/core/art.ts`'s module header, and the
reworked ambiguity error string in `src/pi.ts`, which inherited the em-dash
from the line it replaced). All four were removed in the coherence pass, and
the missing trailing newline in `tests/plugin.test.ts` was restored.

**5. `missing-type` is unreachable in practice.** `fromFrontmatter` throws on a
missing or empty type, so an `Artifact` can never carry an empty type and the
`missing-type` branch only fires for a hand-constructed `Artifact`. The worker
disclosed this. It is harmless defensive code, but the anomaly kind is dead
through the real parsing path, so `overhaul-graph-tools` should not rely on it
to catch files with no type; those surface as resolution errors instead.

### Task doc update needed?

**Yes.** Append to `## Implementation notes` in
`docs/tasks/overhaul-artifact-model/task.md`:

> v4 artifact model and dual-shape resolver landed on
> `slice/overhaul-artifact-model` (2 commits). `Artifact` carries `type`,
> `subtype`, `status`, `workflow_state`, `slug`, `title`, `mode`, `size`,
> `blocked_by`, `shape`, and an optional `path`; `Artifact.kind` is gone.
> `fromFrontmatter(data, dirName?)` reads both shapes (v3 `kind`/`type`/`slug`
> map to v4 `type`/`subtype`/directory slug), requires a non-empty type, and
> tolerates unknown type values. `validateCombination` / `validateArtifact` /
> `findAnomalies` produce the anomaly stream. `resolveArt` is scan-based over
> `docs/tasks/**` (live and archived, both shapes) and honors `want` on every
> branch, fixing the audited kind-confusion bug. Verified: 523/523 tests,
> `tsc --noEmit` clean. Carried forward for `overhaul-graph-tools`, which
> consumes `findAnomalies`: the `orphan` type/location table omits `task.md`
> (so a `task.md` declaring `type: ticket` is not flagged); `effortDirOf`
> collapses all archived efforts into one `archive` bucket and all v3 maps
> into one `maps` bucket, which silently accepts cross-effort edges; and on
> the current v3 tree the stream is mostly false positives (44 orphans, 10
> missing-blocked-by-target over 118 artifacts), expected to settle after
> `overhaul-v4-migration` reshapes the layout. `missing-type` is unreachable
> through real parsing (`fromFrontmatter` throws first).

### User attention needed?

**Yes**, but not blocking: the API surface matches the approved spec, so no
dependent slice is broken and the slice can land. The attention is for
finding 1 (a direct acceptance-criteria gap in the `orphan` check, whose fix
needs a v3-shape decision) and findings 2 and 3 (the effort-scoping rule
produces mostly false positives on the live tree, which shapes what
`overhaul-graph-tools` can do with the anomaly stream). Findings 4 and 5 are
small enough to fold into the coherence refactor.

### Commands run for this report

- `git diff task/overhaul-artifact-model..slice/overhaul-artifact-model`
  (full diff, plus `--stat` and `--name-only`)
- `npx vitest run` → 523 passed (11 files)
- `npm run typecheck` → clean
- Targeted runs: `-t "kind confusion"` (7), `-t "validateCombination"` (9),
  `-t "spec-only"` (1), `-t "aux"` (2)
- Throwaway probes (not committed): both `orphan` directions, cross-effort
  archive edge, cross-map edge, and `findAnomalies` over the real
  `docs/tasks` tree
