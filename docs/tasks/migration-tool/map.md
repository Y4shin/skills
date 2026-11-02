---
type: map
title: Run the schema migration through a disclosed tool
status: stable
ready_for_spec: true
---
# Run the schema migration through a disclosed tool

## Destination

The migrate branch of `/skill:setup-workflow` runs the schema migration by calling the registered tool `tw_migrate`, which the phase discloses through `tw_open` and removes through `tw_close`. The tool executes the transformation in `src/core/migrate.ts` in-process over the target tree and returns the same report the CLI printed, with dry-run as a parameter. An installed copy of the package (through `pi install`) can migrate a repo to schema 5 with no checkout of the workflow repository. The branch choreography (work on the extra branch, fast-forward onto the invocation branch, discard the extra branch) lives in the skill's prose.

## Constraints

- The CLI shim and its resolve hook (`skills/engineering/setup-workflow/scripts/migrate.mjs` and `scripts/ts-resolve.mjs`) and the argv wrapper `src/migrate-cli.ts` are removed: the tool is the only migration executor the package ships.
- The tool's scope is migration execution only: it drives the transformation in `src/core/migrate.ts` over the target tree and returns its report. Backup-branch handling, the test-suite run, the commit, the fast-forward, and the surfacing of needs-human items stay with the skill.
- Dry-run is a parameter on the tool, not a CLI flag; a dry run writes nothing.
- The migration semantics (the transformation `migrate()` performs, its idempotence, resume marker, and atomicity) are not reopened by this effort: it redirects the executor, not the transformation.
- Every registered tool already loads TypeScript in-process through the extension loader on installed copies, so the tool must not spawn a Node child to run the migration.

## Non-goals

- Reopening the migration transformation itself: same steps, same report semantics, idempotence, resume marker, atomicity.
- Moving backup-branch creation, the test-suite run, the commit, the fast-forward, or needs-human surfacing into the tool; those stay with the skill (the skill prose describing them is in scope).
- Touching the onboard and no-op branches of `setup-workflow`.
- Building a general bundled-CLI-to-tool mechanism usable by other scripts.
- Migrating any downstream repo as part of this effort.

## Non-negotiable facts

**Success test:** a repo that installed the package through `pi install` migrates an older-vintage tree to schema 5 through the migrate branch of `/skill:setup-workflow` alone, full report and needs-human items included, with no checkout of the workflow repository.

- The migration runs in-process in the extension host: no spawned Node child, no type stripping, so the `node_modules` type-stripping refusal cannot reoccur.
- `tw_migrate` is disclosed only by the `setup-workflow` toolset through `tw_open` and is removed by the matching `tw_close`; it is never visible or callable by default.
- Report parity: the tool returns every change and every needs-human item, the same report the CLI printed.
- Core guarantees unchanged: the migration is idempotent, verifies every rewrite (YAML round-trip) before anything lands, and a failure leaves the tree untouched.
- The branch choreography: the migration work happens on `migrate/schema-${from}-to-5`; the integration branch (the branch the agent was on when the skill was invoked) is fast-forwarded to it, with explicit user approval first when that branch is not `main` or `master`; the migration branch is deleted after the fast-forward (dangling, no history lost); the run ends on the integration branch.

## Decisions so far

- `settle-non-negotiables` (the seed grilling) settled the whole shape in two rounds: the migrate branch of `/skill:setup-workflow` calls the registered tool `tw_migrate` (rejected: `tw_run_migration`, unprefixed `migrate`); the tool runs the transformation in-process and never spawns a Node child (rejected: fixing Node flags on the child, building a compiled bundle for one caller); all three CLI files are removed and the tool inherits the report rendering (rejected: keeping the CLI for checkouts); the success test is the outcome line (rejected: the mechanism line); the non-goals stand with branch-choreography prose folded into scope; the branch choreography returns to the invocation branch and discards the extra branch after the fast-forward (rejected: folding `main` in and ending the run on `main`).

## Fog


