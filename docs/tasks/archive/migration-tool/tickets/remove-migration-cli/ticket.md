---
type: ticket
subtype: feature
title: Remove the migration CLI from the package
status: deprecated
workflow_state: done
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

- Landed on `task/remove-migration-cli` (merge e4fc4a0 from `ticket/remove-migration-cli` at c08b22a via three red-green commits, plus land commit 473bfc7 carrying the deviation report; the ticket branch was deleted after the merge): the package ships no migration CLI. The three CLI files (`src/migrate-cli.ts`, the spawn shim `scripts/migrate.mjs`, and the resolve hook `scripts/ts-resolve.mjs`) are gone; `src/pi.ts`, the `tw_migrate` tool, its registry row, and the report rendering are byte-untouched. The four spawn-based shim tests were deleted from `tests/setup-workflow-scripts.test.ts` (its `docs/migration-target.yaml` describe stays), with the executor coverage living in `tests/tw-migrate-tool.test.ts`. Living references were swept: the filesystem port's header comment, the shared rendering module's header, two test headers, and the doctor skill's SKILL.md plus its `failed-migration.md`, which now name the `tw_migrate` tool; archives and the dated changelog line keep their historical mentions. Validation at the landed tip: `npm test` 22 files, 1299 tests green; both typechecks clean; the merged tree is byte-identical to the verified ticket tip.
