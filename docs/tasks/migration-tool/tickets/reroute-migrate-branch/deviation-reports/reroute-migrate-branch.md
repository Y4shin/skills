---
type: deviation report
title: Deviation report for reroute-migrate-branch
status: stable
---

## Deviation report: reroute-migrate-branch

Baseline: `effort/migration-tool` at `1e42b7f` (the landed `tw-migrate-tool` tip).
Ticket branch: `ticket/reroute-migrate-branch` at `72a9a26`, 6 commits, 5 files,
202 insertions, 75 deletions. All seven acceptance criteria verified against
the diff and the full suite (22 files, 1300 tests, green; both typechecks
reported clean by the implementer). The core deliverables match the spec
exactly; the deviations below are four small additions or gap-fills, none of
which alters a specified surface.

### API surface changes

This ticket's "surface" is the prose contract (the skill's migrate branch,
its docs page, the upgrade resources) plus the structure tests. No specified
surface changed. Two prose-contract details gained content the spec did not
specify:

- **Planned (the open call):** the arch spec's skill-prose-to-tool seam says
  the branch's contract with the tool is three things: "the open, the call
  (with or without the dry-run flag), and the returned report text." No
  argument shape for the open was given.
- **Actual:** the prose instructs `tw_open` with
  `{ skill: "setup-workflow", effort: "setup-workflow" }`, with a
  parenthetical stating the phase is not effort-scoped and the label names
  nothing. The label is a chosen convention: the pre-existing, unchanged
  `validateOpenArgs` (`src/disclosure.ts:390`) rejects any open whose `effort`
  is not a non-empty string, so a label was mandatory and the spec named
  none. No opener code changed; any non-empty label behaves identically.
- **Impact:** none on dependent tickets. `remove-migration-cli` deletes the
  CLI and never touches the open prose. Future edits of the migrate branch
  must keep passing a non-empty effort label.

- **Planned (step 6 of the choreography):** the spec's step (f) is "end the
  run on the integration branch"; the six steps mention no phase close.
- **Actual:** step 6 ends with "close the phase with `tw_close setup-workflow`"
  in addition to ending on the integration branch. Additive prose following
  the intake pattern every other phase's prose follows; leaving the phase
  open at run end would be a defect.
- **Impact:** additive; no dependent ticket reads step 6's exact contents.

Everything else specified is present as specified: all six choreography
steps (record the integration branch; create `migrate/schema-${from}-to-5`
from it; tool, test suite, and commit on the migration branch; fast-forward
with explicit user approval first outside `main`/`master`; `git branch -d`
after the fast-forward; end on the integration branch), the dry-run prose as
the tool parameter (`{ dryRun: true }`, `--dry-run` gone from the skill), the
backup-safety prose following the new choreography, the re-synced docs page,
the reworded upgrade resources, the safety-theme pins kept, and the
onboard/no-op branches byte-identical (both SKILL.md hunks start at/after
line 108).

### Abstraction usage
- Used/was specified: yes. The branch consumes the `tw-migrate-tool` export
  exactly per its frozen call contract (parameters `{ dryRun?: boolean }`,
  the returned report text); the dry-run prose passes the tool's existing
  option, no second preview path. The open uses the existing disclosure
  opener. No new abstraction, and the diff touches no `src/` file.

### Out-of-scope changes
- `SURVIVING_TOOLS` in `tests/skills.test.ts` gains `tw_migrate` (with a
  comment naming the tickets). Forced by the pre-existing docs-page sweep
  (`expectOnlySurvivingTools`: every `tw_*` tool named in a docs page must be
  in the surviving set); without it the re-synced docs page, which now names
  `tw_migrate`, fails the sweep. Mechanical table maintenance inside the named
  test file, but beyond the ticket's "executor references follow the rewrite"
  description.
- A new regression pin, "the onboard and no-op branches are untouched by the
  reroute" (green on arrival by design, per `docs/testing.md`'s
  guard-invariant rule). An addition to the structure tests beyond keeping
  the safety-theme pins; it supports the onboard/no-op-unchanged criterion.
- Wording beyond the executor blockquotes in the two resources: the
  "What the CLI prints" heading became "What the tool returns", and both
  After-the-run sections reword "the printed MigrateReport" to "the returned
  MigrateReport". Same criterion as the executor rename (executor wording
  describing the CLI's behavior); the transcript literals are unchanged (the
  frozen text contract holds).
- Not changed, flagged for `remove-migration-cli`:
  `skills/engineering/task-workflow-doctor/SKILL.md:59` and
  `skills/engineering/task-workflow-doctor/resources/failed-migration.md:5`
  still say "the migration CLI errored" as failure-cause descriptions. They
  instruct no shell command, so this ticket's docs contract ("no living page
  instructs the shell command") holds, and the arch spec's decision 9 names
  only the skill's docs page and the two upgrade resources for this ticket;
  leaving them is per-spec. But they are living-file references to the CLI
  that `remove-migration-cli`'s removal contract ("reworded so nothing names
  the removed CLI") must sweep, or the coherence pass.

### Ticket doc update needed?
Yes. The ticket doc has no `## Implementation notes` section; append one
carrying:
- The open call instructs `effort: "setup-workflow"`; the label is a chosen
  convention (`validateOpenArgs` requires a non-empty effort for every open;
  any non-empty label behaves identically; no opener code changed).
- Step 6 additionally closes the phase (`tw_close setup-workflow`),
  following the intake pattern.
- `tests/skills.test.ts`'s `SURVIVING_TOOLS` gained `tw_migrate` (docs-page
  sweep prerequisite) and a green-on-arrival onboard/no-op regression pin.
- The doctor skill's "migration CLI errored" mentions are deferred to
  `remove-migration-cli` or the coherence pass.
- The choreography prose names no recovery step if `git merge --ff-only`
  refuses because the integration branch moved mid-run (safe failure mode:
  loud refusal, both branches survive).

### User attention needed?
No. Scope did not change and no specified surface differs: every named
deliverable matches the spec, and the additions above fill gaps the spec left
open (the open's argument label, the phase close) or were forced by existing
test infrastructure. `remove-migration-cli`'s precondition (no living page
instructs the shell command) is verified to hold; the only remaining
"migration CLI" prose in living files is the doctor's failure-cause mentions
flagged above.
