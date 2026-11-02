---
type: ticket
subtype: feature
title: Remove the migration CLI from the package
status: stable
workflow_state: ready
blocked_by:
- reroute-migrate-branch
size: s
---

## What to build

The package ships no migration CLI. The shim script, its TypeScript resolve hook, and the argv wrapper are deleted, together with the spawn-based tests that covered them: their coverage lives in the tool tests landed with `tw-migrate-tool`. Remaining references in living files (the filesystem port's header comment, test comments) are reworded so nothing names the removed CLI; archives stay as historical record and are untouched. The tool is the only migration executor the package ships.

## Acceptance criteria

- [ ] The three CLI files no longer exist in the package.
- [ ] The spawn-based shim tests are deleted; their coverage lives in the tool tests.
- [ ] No living file (source, skill, docs, resources, tests) instructs or imports the removed CLI; the archive is untouched.
- [ ] The full test suite and the typecheck pass with the CLI removed.

## Blocked by

- `reroute-migrate-branch` (no living prose references the CLI before it is deleted).

## Implementation notes

- Architecture lessons from the landing: criteria 1-3 are executably encoded as three structure guards in `tests/skills.test.ts` (the repo's corpus-sweep prior art; the guard file self-exempts, as does the effort record under `docs/tasks/migration-tool/`, the same class as an archived tree). The failure-path pin carried from the reroute ticket's notes was not added: the deleted shim failure test has no tool-level twin and the tool's `outcome` failure line (`migration failed: <reason>`) is unpinned, a candidate one-test follow-up for the coherence pass; core-level failure coverage (`tests/migrate.test.ts`: a mid-migration failure leaves the tree byte-identical) still holds. The doctor skill and its `failed-migration.md` resource sweep landed as carried; they now name the `tw_migrate` tool. `CHANGELOG.md` line 174 intentionally keeps its dated mention of the CLI (historical record, instructs nothing), the same class the repo's corpus exemptions name for dated changelog entries. The empty `skills/engineering/setup-workflow/scripts/` directory vanished from disk with the deletions; git tracks no empty directories, so nothing was left to commit.
