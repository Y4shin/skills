---
type: task
subtype: grilling
title: Settle the non-goals and non-negotiable facts for running the schema migration through a disclosed tool
status: deprecated
workflow_state: done
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

## Notes

## Settled in the grilling (the user's terms)

- The CLI is removed entirely, not just unfitted: the shim scripts (`skills/engineering/setup-workflow/scripts/migrate.mjs`, `scripts/ts-resolve.mjs`) and the argv wrapper `src/migrate-cli.ts` all go. The tool inherits the wrapper's report rendering and becomes the only migration executor. Rejected: keeping the CLI for checkout use, because two executors drift and the npm bundle would still ship a command that fails under `node_modules`.
- The tool is named `tw_migrate`. User clarification on disclosure: registered, but never visible or callable by default; enabled only while `/skill:setup-workflow` has the phase open through `tw_open`, removed after the matching `tw_close`.
- Success test (outcome line chosen over the mechanism line): a repo that installed the package through `pi install` migrates an older-vintage tree to schema 5 through the migrate branch of `/skill:setup-workflow` alone, full report and needs-human items included, with no checkout of the workflow repository.
- Non-goals confirmed with one rewording the user folded in: the branch choreography prose is in scope (too small for its own effort), while moving backup-branch creation, the test-suite run, the commit, the fast-forward, or needs-human surfacing into the tool stays out of scope.
- Branch choreography, settled in round 2 (user picked "return to invocation branch"): the migration happens on the extra branch `migrate/schema-${from}-to-5`; the changes are fast-forwarded onto the integration branch (whatever branch the agent was on when the skill was invoked), with explicit user approval first when that branch is not `main` or `master`; the extra branch is deleted after the fast-forward (dangling, no history lost); the run ends on the integration branch. Rejected: also fast-forwarding `main` and discarding the integration branch, which would delete the branch the user works on.

## Verified facts grounding the decision

- The defect only ever hit the spawned child: the shim ran `node --experimental-strip-types` on TypeScript under `node_modules`, which Node refuses (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). Every registered `tw_*` tool already loads TypeScript in-process through the extension loader on installed copies (the extension itself is `src/pi.ts`), so a tool importing `migrate()` in-process cannot hit the refusal.
- The migration core (`src/core/migrate.ts`) is a pure transformation over the filesystem port (`src/core/fs-port.ts`); the wrapper only parsed argv and rendered the report. The `.migration-progress` resume marker exists in the core and is described there as an optimization, not the source of truth.

## Constraints and rationale

- The tool's scope is migration execution only: it drives the transformation and returns the report (every change, every needs-human item, dry-run as a parameter that writes nothing). Backup-branch handling, the test-suite run, the commit, the fast-forward, and needs-human surfacing stay with the skill, per the intake constraints the user reaffirmed.
- Migration semantics are not reopened: same steps, same report semantics, idempotence, resume marker, atomicity.

## Consequences for dependent work

- The spec phase collapses this into: the registry entry for `setup-workflow` in `src/disclosure.ts` gains `tw_migrate` and its comment drops "runs the migration CLI through the shell"; the tool definition lands in `src/pi.ts`; the skill's migrate branch is rewritten (tool call, branch choreography, dry-run as parameter); `docs/engineering/setup-workflow.md` is re-synced; `CONTEXT.md`'s Migration entry drops "not a tool in the registered surface" and names `tw_migrate`; the upgrade resources' CLI wording is checked; `tests/setup-workflow-scripts.test.ts` is replaced by tool tests and the disclosure tests are updated.

## Remaining fog

None.
