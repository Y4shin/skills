---
type: ticket
subtype: feature
title: Reroute the migrate branch through the tool, with the branch choreography
status: deprecated
workflow_state: done
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

## Implementation notes

- Architecture lessons from the landing: the open call instructs `tw_open { skill: "setup-workflow", effort: "setup-workflow" }`; the label is a chosen convention (the pre-existing `validateOpenArgs` requires a non-empty effort for every open, the spec named no argument shape, and any non-empty label behaves identically; no opener code changed). Step 6 of the choreography additionally closes the phase with `tw_close setup-workflow`, following the pattern every other phase's prose follows, because the six specified steps name no close and leaving the phase open at run end would be a defect. `tests/skills.test.ts`'s `SURVIVING_TOOLS` gained `tw_migrate` (the pre-existing docs-page sweep requires every `tw_*` tool named on a docs page to be in the surviving set) and a green-on-arrival onboard/no-op regression pin.
- Carried to `remove-migration-cli` and the coherence pass: `skills/engineering/task-workflow-doctor/SKILL.md` (the doctor skill) and its `resources/failed-migration.md` still say "the migration CLI errored" as failure-cause descriptions; they instruct no shell command, so this ticket's docs contract held, but they are living references to the CLI that the removal ticket's no-living-reference criterion must sweep. The choreography prose also names no recovery step if `git merge --ff-only` refuses because the integration branch moved mid-run (safe failure mode: loud refusal, both branches survive). Carried from `tw-migrate-tool`: the tool's failure path (`migration failed: <reason>`) is still unpinned in `tests/tw-migrate-tool.test.ts`; the removal ticket should add the one-test pin when it deletes the spawn-based shim failure test that covers it today.

- Landed on `task/reroute-migrate-branch` (merge 87f9ee7 from `ticket/reroute-migrate-branch` at 72a9a26, which forked from the effort tip carrying the landed `tw-migrate-tool`; the ticket branch was deleted after the merge, and land commit b5664f4 carries the deviation report): the migrate branch of `/skill:setup-workflow` now opens its phase and runs the migration by calling the disclosed `tw_migrate`, never a shell command. The six-step choreography is explicit: record the integration branch, create `migrate/schema-${from}-to-5` from it (the migration branch is the backup; the integration branch stays untouched until the fast-forward), run the tool plus the test suite plus the commit on the migration branch, fast-forward the integration branch with `git merge --ff-only` after explicit user approval when it is not `main` or `master`, delete the migration branch after the fast-forward (dangling, no history lost), and end on the integration branch with the phase closed. The dry-run prose is the tool's parameter. The docs page and both upgrade resources name the tool as the executor ("what the tool returns" replaces "what the CLI prints"), with the frozen transcript literals unchanged. Validation at the merged tip: `npm test` 22 files, 1300 tests green; both typechecks clean; the merged tree is byte-identical to the verified ticket tip.
