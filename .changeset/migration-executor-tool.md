---
"@y4shin/pi-task-workflow": minor
---

Run the schema migration through `tw_migrate`, a tool the setup-workflow phase discloses.

The migrate branch of `/skill:setup-workflow` used to instruct running a CLI
script that ships in the bundle but cannot run there: the shim spawned a Node
child with type stripping on the package's TypeScript sources, and Node
refuses that for any file under `node_modules`. Every installed copy failed
before writing anything, and migrating stayed possible only inside a checkout
of this repository.

- The migration now executes in-process in the extension host through the
  registered `tw_migrate` tool, the same way every `tw_*` tool already runs on
  installed copies. It is disclosed by the `setup-workflow` phase opener and
  withdrawn by the closer, never visible by default. A spawn guard test pins
  that no step in the tool's path spawns a Node child.
- The tool drives the untouched `migrate()` core over the production
  filesystem port and returns the same report the CLI printed (the from and to
  schema versions, every change, every item needing human attention, or the
  already-current no-op answer), plus a details envelope with the counts.
  `dryRun` is a parameter that computes and writes nothing. Failures throw
  `migration failed: <reason>`.
- The CLI is gone: the shim, its resolve hook, and the argv wrapper are
  deleted, together with their spawn-based tests. One executor ships, the
  tool, with the report parity pinned by golden literals captured from the
  CLI before the redirect. Three structure guards keep the removal true, and
  no living file instructs a shell command for the migration.
- The skill's migrate branch now choreographs the run: record the integration
  branch, create `migrate/schema-${from}-to-5` from it, run the tool and the
  test suite and the commit there, fast-forward the integration branch (with
  explicit approval first outside `main`/`master`, recovering by re-creating
  the migration branch from the moved tip if the fast-forward refuses), delete
  the migration branch, close the phase, and end on the integration branch.
- The docs page, the upgrade resources, the doctor skill, and the domain
  glossary name the tool as the executor.

`npm test` (22 files, 1300 tests) and both typechecks pass.
