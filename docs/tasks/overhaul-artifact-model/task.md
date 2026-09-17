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
the `orphan` type/location table omits `task.md`, so a `task.md` declaring
`type: ticket` is not flagged; `effortDirOf` collapses all archived efforts
into one `archive` bucket and all v3 maps into one `maps` bucket, which
silently accepts cross-effort edges; and on the current v3 tree the stream is
mostly false positives (44 orphans, 10 missing-blocked-by-target over 118
artifacts), expected to settle after `overhaul-v4-migration` reshapes the
layout. `missing-type` is unreachable through real parsing
(`fromFrontmatter` throws first). Four em-dashes remain in added lines
(`src/pi.ts:261`, `tests/plugin.test.ts:617`, plus two inherited), and
`tests/plugin.test.ts` now ends without a trailing newline.
