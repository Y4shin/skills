---
kind: task
type: feature
slug: overhaul-v4-migration
title: One v4 migration from any vintage, plus setup-workflow v4
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-artifact-model
slices: [overhaul-v4-migration]
---

## What to build

One migration, tested as its own unit, that takes any repo from any
current state to the version 4 tree: fresh (no docs/tasks),
unversioned (no schema_version), v1 nested state, v2, v3, flat or
maps-subtree layouts, and archived trees.

It performs, as one transformation: the effort-grouped layout
reorganization (tasks and tickets sorted by their old workflow
category), frontmatter unification (kind to type, category to
subtype, slug and map dropped, the status split applied with
normalization of invalid combinations), spec and aux backfill
(spec.md, findings, deviation reports, changelog, arch specs gain
frontmatter), archive reorganization and backfill, the state-file
rebuild (real nulls, effort pointer seeded from the current map
pointer where derivable, legacy slice key dropped, schema_version
stamped 4), legacy slice-directory reporting (never deletion; v4
dropped slice support), vendored non-OKF tree relocation with a
pointer left behind, the root index.md creation carrying
`okf_version: "0.2"`, and the dead task-overview pointer fix in the
onboarding report.

Non-negotiable properties, each tested: verify the YAML round-trip
of every rewrite before writing; on any failure leave the tree
untouched; idempotent (a second run produces no changes); resumable
(an interrupted run resumes cleanly); a final report of every change
plus every item needing human eyes (normalized combinations, slice
directories found, vendored trees moved, unresolvable references).

setup-workflow moves to version 4: it keys its fresh/migrate/no-op
detection on `schema_version: 4` and carries the upgrade resource
encoded as a fixed ordered step list tracing to the effort spec.

Whether and when to run the migration against this repo's own live
tree is a user call at run time: the migration's tests run against
fixture trees only; flipping the live tree mid-effort affects how the
remaining tickets are executed, so the natural moment is after the
skill-prose tickets land.

## Acceptance criteria

- [ ] Fixture trees for every vintage (fresh, unversioned, v1, v2,
      v3, maps-subtree, archived) arrive at the same v4 end state.
- [ ] Every rewrite is YAML-verified before the write lands.
- [ ] A mid-migration failure leaves the tree untouched (corruption
      safety, tested with an injected failure).
- [ ] Re-running the completed migration produces zero changes
      (idempotence).
- [ ] An interrupted run resumes cleanly (resumability).
- [ ] The report lists every change and every needs-human-eyes item.
- [ ] Legacy slice directories are reported, not deleted.
- [ ] Vendored trees move outside the bundle with a pointer left
      behind.
- [ ] The root index carries okf_version "0.2" and lists the tree.
- [ ] setup-workflow detects schema_version 4 and runs the correct
      branch (fresh/migrate/no-op).
- [ ] The migration is its own tested unit (the seam the spec
      approved).

## Blocked by

- overhaul-artifact-model (the migration targets the v4 model and
  layout this ticket consumes).
