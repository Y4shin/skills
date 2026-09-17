---
kind: task
type: feature
slug: overhaul-artifact-model
title: v4 artifact model - dual-shape frontmatter parsing and resolution
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-state-module
slices: [overhaul-artifact-model]
---

## What to build

The one data layer every surviving tool stands on: the version 4
artifact model, plus a resolver that reads both tree shapes.

Frontmatter v4: OKF `type` as the artifact kind (task, ticket, map,
spec, findings, changelog, out-of-scope note, deviation report, arch
spec), the workflow category as `subtype` (tasks: research,
prototype, grilling, manual; tickets: feature, bug), OKF `status`
(draft, stable, deprecated) with the companion `workflow_state`
(todo, ready, in-progress, blocked, done) and the enforced
combinations (draft only with todo, deprecated only with done,
stable with any), optional `mode: human`, optional ticket `size`
(default m), kind-scoped and effort-scoped `blocked_by`. Map
frontmatter: type, title, status, blocked_by (effort-to-effort
edges). Spec frontmatter: type, title, status. The old `kind`, `slug`,
and `map` fields are recognized and mapped (dual shape), not written
by new producers.

The resolver finds artifacts in the current tree (flat task
directories, the maps/ subtree, v3 fields) and in the version 4 layout
(one effort directory holding map.md, spec.md, arch-spec.md, a tasks/
subtree of decision tasks, a tickets/ subtree of implementation
tickets), including spec-only directories and aux files (findings,
deviation reports). The kind-confusion the audit found, a wanted kind
ignored on the slug branch, is fixed here: resolution honors the
wanted kind on every branch. Parsing surfaces anomalies (invalid
combinations, orphaned artifacts, missing blocked_by targets) as
reportable data the graph tools consume in the next ticket.

## Acceptance criteria

- [ ] Fixture trees in both shapes resolve every artifact by path or
      slug with the wanted kind honored on every branch.
- [ ] Combination rules are enforced: allowed combos parse clean,
      invalid combos surface as anomalies.
- [ ] The get and show tools read new-shape artifacts (ticket.md,
      spec.md, map.md) and old-shape artifacts unchanged.
- [ ] Spec-only effort directories resolve; aux files resolve.
- [ ] No regression on the live old-shape tree (full tool suite).
- [ ] Unit tests at the model seam plus tool-contract tests.

## Blocked by

- overhaul-state-module (the core modules land in sequence; the state
  module is first).

## Implementation notes

### Slice - overhaul-artifact-model (landed)

v4 artifact model and dual-shape resolver landed on
`slice/overhaul-artifact-model` (2 commits, merged into
`task/overhaul-artifact-model`). `Artifact` carries `type`, `subtype`,
`status`, `workflow_state`, `slug`, `title`, `mode`, `size`, `blocked_by`,
`shape`, and an optional `path`; `Artifact.kind` is gone.
`fromFrontmatter(data, dirName?)` reads both shapes (v3 `kind`/`type`/`slug`
map to v4 `type`/`subtype`/directory slug), requires a non-empty type, and
tolerates unknown type values. `validateCombination` / `validateArtifact` /
`findAnomalies` produce the anomaly stream. `resolveArt` is scan-based over
`docs/tasks/**` (live and archived, both shapes) and honors `want` on every
branch, fixing the audited kind-confusion bug. Verified: 523/523 tests,
`tsc --noEmit` clean; no lint script is configured.

Two additive deviations from the approved spec, both needed to satisfy it:
the optional `Artifact.path` field (the model seam is pure, but
`findAnomalies` computes location-based anomalies) and the optional
`fromFrontmatter(data, dirName?)` second parameter (the resolver supplies the
directory name for the v4 slug). Neither obliges a caller.

Carried forward for `overhaul-graph-tools`, which consumes `findAnomalies`:
the anomaly stream is clean on the live tree (0 anomalies over 118
artifacts), so it is actionable as-is. `missing-type` is unreachable through
real parsing (`fromFrontmatter` throws first), so graph tools should not rely
on it to catch files with no type; those surface as resolution errors.

### Coherence pass (post-review)

The whole-task review and the deviation report surfaced four issues, all fixed
here. The chain's own numbers were 523/523; the suite is now 529/529 with six
new regression tests.

- **The `orphan` check missed one direction.** `task.md` was absent from the
  type/location table, so a `task.md` declaring `type: ticket` was not flagged
  while the reverse was. `typeForFilename` is now path-aware: `task.md`
  implies `task` only under the v4 `tasks/` subtree, so both directions are
  caught without flagging every v3 flat task.
- **Effort scoping is now shape-aware.** The old rule took the path segment
  after `docs/tasks`, which collapsed every archived effort into one `archive`
  bucket and every v3 map into one `maps` bucket, silently accepting
  cross-effort edges. `effortKeyOf` scopes v3 artifacts by their frontmatter
  `map:` field (v3 flat tasks carry it) and v4 artifacts by their effort
  directory, with the two namespaces prefixed so they cannot collide.
- **The anchor check is v4-only.** A v3 flat task directory is its own effort
  and carries no map or spec by design, so requiring an anchor there flagged
  every live v3 task. It now applies to `shape: "v4"` artifacts only.
- **Four em-dashes removed** from added lines in `src/core/art.ts`,
  `src/pi.ts` (two), and `tests/plugin.test.ts`, and the missing trailing
  newline restored.

Effect on the live tree: the anomaly stream went from 54 findings (44 orphans,
10 missing-blocked-by-target) to **zero**, so `overhaul-graph-tools` inherits a
signal it can act on rather than a false-positive pile.
