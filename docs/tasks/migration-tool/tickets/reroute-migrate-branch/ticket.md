---
type: ticket
subtype: feature
title: Reroute the migrate branch through the tool, with the branch choreography
status: stable
workflow_state: ready
blocked_by:
- tw-migrate-tool
size: m
---

## What to build

The migrate branch of `/skill:setup-workflow` runs the migration by opening its phase and calling `tw_migrate`, never a shell command. The branch choreography is explicit:

1. Record the integration branch: the branch the agent was on when the skill was invoked.
2. Create the migration branch (`migrate/schema-${from}-to-5`) from it.
3. Run the migration tool, the test suite, and the commit on the migration branch.
4. Fast-forward the integration branch to the migration branch's tip, asking for explicit user approval first when the integration branch is not `main` or `master`.
5. Delete the migration branch after the fast-forward, because it is dangling and no history is lost.
6. End the run on the integration branch.

The dry-run prose becomes the tool's parameter, not a CLI flag. The skill's docs page and the upgrade resources' executor wording are re-synced so no living page instructs the shell command. The onboard and no-op branches stay untouched. The structure tests over the skill keep asserting the safety themes (backup, dry-run, idempotence), and their executor references follow the rewrite.

## Acceptance criteria

- [ ] The migrate branch's executor step opens the phase and calls `tw_migrate`; no step instructs a shell command for the migration.
- [ ] All six branch-choreography steps appear in the migrate branch, including the approval gate before the fast-forward outside `main`/`master` and the migration-branch deletion after it.
- [ ] The dry-run section describes the tool parameter.
- [ ] The skill's docs page matches the new migrate branch (executor and choreography).
- [ ] The upgrade resources name the tool as the executor, not the CLI.
- [ ] The structure tests over the skill pass and keep asserting the safety themes.
- [ ] The onboard and no-op branches are unchanged.

## Blocked by

- `tw-migrate-tool` (the tool the branch calls must exist and be disclosed first).
