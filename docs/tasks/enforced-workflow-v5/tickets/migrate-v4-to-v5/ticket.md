---
type: ticket
subtype: feature
title: Migration v4 to v5, one idempotent hop
status: stable
workflow_state: ready
blocked_by: [schema5-artifact-model]
size: l
---

## What to build

`src/core/migrate.ts` and `src/migrate-cli.ts` gain schema 5. `detectVintage`
gains a version-5 branch, and `migrate()` gains the v4-to-5 reshape, reusing
the existing `TreePort` staging, the undo journal, and the
YAML-verify-before-lands rule. This is a new branch, not a second migration
engine.

The reshape covers, in live and archived trees alike:

- `type: arch spec` becomes `type: architecture`, and `arch-spec.md` becomes
  `architecture.md` at the effort root.
- `## Out of scope` becomes `## Non-goals`.
- `## Non-negotiable facts` is added when missing.
- `state.yaml` is stamped `schema_version: 5`.

Any vintage (unversioned, v1 to v4) migrates in one idempotent hop. The
reader stays tolerant of the legacy filename and type as a safety net.
`docs/bugs/` stays in place as a static archive and stops being a live
substrate; the migration does not move it.

## Acceptance criteria

- [ ] The four existing non-negotiables hold: every rewrite is YAML-verified
      before it lands, a failure leaves the tree untouched, a second run is a
      no-op, and an interrupted run resumes.
- [ ] New cases cover the body rename, the filename and type rename, and
      archive coverage.
- [ ] A v4 tree, and every older vintage, reaches schema 5 in one hop;
      `state.yaml` carries `schema_version: 5`.
- [ ] A second run of the migration produces byte-stable output.
- [ ] `docs/bugs/` is untouched.
- [ ] `tests/migrate.test.ts` covers all of the above.

## Blocked by

- schema5-artifact-model (the reshape writes the new types, filenames, and
  section names the model defines).