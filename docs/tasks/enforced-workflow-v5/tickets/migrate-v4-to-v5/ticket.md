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

## Implementation notes

- Landed at merge commit on `task/migrate-v4-to-v5` (6 wip commits
  merged with `--no-ff` from `ticket/migrate-v4-to-v5`, landing point `bf2e3b1`,
  the disclosure-open-close-core land). Diff touches `src/core/migrate.ts`,
  `src/migrate-cli.ts`, `tests/migrate.test.ts`, `tests/fs-port.test.ts`.
- Implementation: `schema_version: 5` stamp in `rebuildState`, `MigrateReport.to`
  is 5, the arch-spec-to-architecture rename (type and filename, live and
  archived; effort root for the single-doc case, in-place leaf rename when an
  effort carries several architecture documents so nothing collapses), the map
  body rename `## Out of scope` to `## Non-goals` with a `## Non-negotiable
  facts` placeholder appended when missing, and the CLI schema-5 no-op message.
  The reshape reuses the existing `reorganize` pass, `TreePort` staging, undo
  journal, and YAML-verify-before-lands rule; it is a branch in the one engine.
- TDD divergences (see the implementation report for the full list): the tests
  pinning the v4 stamp were updated to schema 5 as the ticket spec'd;
  `detectVintage` needed no new branch because the stamp read already returns 5
  for a schema-5 tree; the repo's own `arch-spec.md` rename stays a human
  `setup-workflow` action after v5 lands.
- Validation at merge: `npm test` 848 passed across 17 files;
  `npm run typecheck` clean; real-disk CLI smoke migrated a v4 fixture to 5 and
  reported a byte-stable no-op on the second run with `docs/bugs/` untouched.
- Residual risks carried forward: a map body with both `## Out of scope` and
  `## Non-goals` yields two Non-goals sections (reader resolves
  first-match-wins); `detectVintage` accepts stamps above 5 and reshapes down;
  skill prose and `docs/migration-target.yaml` still describe v4, owned by
  migration-target-and-upgrade-resource, overview-doctor-rescope, and
  docs-resync.
- Landing note: the landing branch did not exist at land time; it was created at
  the TDD report's landing point and the merge run there. Full suite re-run on
  the merge result: 848 passed, 0 failed. The unstaged `docs/tasks/state.yaml`
  task-pointer edit was carried through checkout and left unstaged, as found.