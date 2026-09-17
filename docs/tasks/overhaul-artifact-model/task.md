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
