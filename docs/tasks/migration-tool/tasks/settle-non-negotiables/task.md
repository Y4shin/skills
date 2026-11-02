---
type: task
subtype: grilling
title: Settle the non-goals and non-negotiable facts for running the schema migration through a disclosed tool
status: stable
workflow_state: ready
blocked_by: []
---

# Settle the effort's non-goals and non-negotiable facts

The decision to settle: the effort's non-goals, its non-negotiable facts, and the effort-level success test for moving the schema migration executor from a shipped CLI script to a tool disclosed by the `setup-workflow` phase through `tw_open`, so an installed copy of the package can run the migration end to end.

## Raw request, verbatim

```text
I have a session, which had trouble running the /skill:setup-workflow because the CLI that is used for it is not shipped with the npm bundle. I propose that we take that CLI and instead turn it into an tool, which is disclosed via tw_open.
```

The motivating defect, verified during intake: the migration CLI ships in the npm bundle, but it cannot run from there. The shim at `skills/engineering/setup-workflow/scripts/migrate.mjs` spawns `node --experimental-strip-types` on the package's TypeScript sources, and Node refuses to strip types for any file under `node_modules`, throwing `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. The migrate branch of `/skill:setup-workflow` therefore fails on every copy installed through `pi install`, before writing anything. The migration stays possible only inside a checkout of this repo.

## Destination

Run the schema migration through a tool the `setup-workflow` phase discloses via `tw_open`: the skill's migrate branch calls the tool instead of spawning the CLI shim.

## Actor

Downstream repo operators and maintainers who install this package through `pi install` and run `/skill:setup-workflow` to onboard or migrate their repos, and the agents running that skill on their behalf.

## Classification

Feature. The redesign is motivated by the defect above; the defect itself is recorded here, and no bug ticket was created at intake.

## Stories

1. As a downstream repo operator, I want the migrate branch of `/skill:setup-workflow` to execute the migration through a tool the phase discloses, so that migrating an installed copy to the current schema works without a checkout of the workflow package.
2. As a downstream repo operator, I want the tool to return the same migration report the CLI printed, every change and every item needing human attention, so that how a migration run is reported does not change.
3. As a downstream repo operator, I want a dry-run option on the tool, so that the migration can be previewed before anything is written.
4. As the package maintainer, I want the shipped package to carry no migration command that cannot run from an installed copy, so that the skills never instruct an agent to run a command that fails.

## Constraints

Settled with the operator during intake:

- The CLI shim and its resolve hook (`skills/engineering/setup-workflow/scripts/migrate.mjs` and `ts-resolve.mjs`) are removed from the package: the tool becomes the only executor of the migration.
- The tool's scope is the migration execution only: it drives the transformation in `src/core/migrate.ts` and returns its report. Backup-branch creation, the test-suite run, the commit, and surfacing of needs-human items stay with the skill. Dry-run becomes a parameter on the tool, not a CLI flag. The migration semantics (the transformation `migrate()` performs) are not reopened by this effort: it redirects the executor, not the transformation.
