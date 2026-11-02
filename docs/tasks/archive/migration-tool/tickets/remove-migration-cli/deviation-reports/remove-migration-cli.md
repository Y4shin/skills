---
type: deviation report
title: Deviation report for remove-migration-cli
status: stable
---

# Deviation report: remove-migration-cli

Verification basis: branch `ticket/remove-migration-cli` at `c08b22a`
(three commits: `3fc3325`, `df35e68`, `c08b22a`), diffed against the landed
blocker `reroute-migrate-branch` at `3d4d8e0`. The `task/remove-migration-cli`
base branch does not exist; the blocker tip is the fork point. The diff is
11 files, 79 insertions, 227 deletions, touching no file under
`docs/tasks/archive/` or `docs/bugs/`.

## API surface changes

- **Planned:** pure deletion with no behavior change. The removal contract in
  `architecture.md` reads: "pure deletion (the shim, the resolve hook, the
  argv wrapper, the spawn-based tests), reference-comment fixes in living
  files, archives untouched, the full suite and typecheck green. No behavior
  change rides in this ticket." The package ends up shipping exactly one
  migration executor, the disclosed `tw_migrate` tool with its frozen call
  contract `{ dryRun?: boolean }`.
- **Actual:** exactly that. The three CLI files are gone
  (`src/migrate-cli.ts`, `skills/engineering/setup-workflow/scripts/migrate.mjs`,
  `ts-resolve.mjs`; the empty `scripts/` directory vanished with them, and git
  tracks no empty directories), the four spawn-based shim tests are deleted
  from `tests/setup-workflow-scripts.test.ts` (its `docs/migration-target.yaml`
  describe remains), and `src/pi.ts`, the `tw_migrate` tool, its registry row,
  and the rendering are byte-untouched (only comment headers elsewhere
  changed).
- **Impact:** none on dependent tickets. This is the terminal ticket of the
  three-ticket chain, nothing is blocked by `remove-migration-cli`, and no
  shipped surface changed.

## Abstraction usage

- Used/was specified: yes. The removal criteria are executably encoded as
  three structure guards in `tests/skills.test.ts` reusing the existing
  corpus-sweep machinery (`corpusFiles` and `CORPUS_SKIP_DIRS`, whose
  `archive` skip covers `docs/tasks/archive/` and `docs/bugs/archive/`),
  not a new mechanism. This follows the repo's dead-surface corpus-check
  prior art and the reroute ticket's structure-test precedent.

## Out-of-scope changes

- **Added three structure-guard tests** in `tests/skills.test.ts` ("the
  three migration CLI files no longer exist", "no living file references the
  removed migration CLI files", "no living skill, docs, or resource prose
  names the migration CLI"). Strictly, "pure deletion" does not cover new
  test code; the implementer judged that the acceptance criteria need a
  permanent guard rather than a one-time manual sweep. Net test count: 1300
  at the blocker tip, minus the four deleted shim tests, plus three guards,
  equals the 1299 that now pass.
- **Omitted the carried failure-path pin.** The reroute ticket's
  implementation notes explicitly instructed: "the removal ticket should add
  the one-test pin when it deletes the spawn-based shim failure test that
  covers it today." No such pin was added: `tests/tw-migrate-tool.test.ts` has
  no failure-path test, so the deleted shim test ("a failure exits non-zero
  with the reason") has no tool-level twin. The implementer reasoned that the
  architecture's frozen `tw-migrate-tool` test contract lists no failure case,
  so none was owed. Mitigations that keep this a gap rather than a regression:
  core-level failure coverage is intact (`tests/migrate.test.ts`: a
  mid-migration failure leaves the tree byte-identical; a malformed staged
  rewrite throws before anything lands), and the tool wraps failures in its
  structured outcome (`migration failed: <reason>`, `src/pi.ts:3146`). That
  wrapper line is now unpinned.
- **Reworded living files beyond the ticket's parenthetical.** "What to
  build" enumerated the remaining references as "the filesystem port's
  header comment, test comments"; the actual sweep also reworded
  `skills/engineering/task-workflow-doctor/SKILL.md`, its
  `resources/failed-migration.md` (both explicitly carried to this ticket by
  the reroute notes), the `src/migrate-report.ts` header, and the
  `tests/tw-migrate-tool.test.ts` header. In scope per acceptance criterion
  3; the ticket prose simply understated the set. The only remaining
  instructional reference to the removed shim lives in
  `docs/bugs/archive/migrate-null-slug-ticket-collapse.md`, an archive the
  ticket exempts, untouched by the diff.
- **Left the historical CHANGELOG mention.** `CHANGELOG.md` line 174 still
  reads "The migration CLI carries any vintage forward in one idempotent hop,
  archives included." Interpreted as a dated historical record, the archive
  class the ticket exempts, consistent with the repo's `CORPUS_EXEMPTIONS`
  prior art for `docs/tasks/CHANGELOG.md`. It instructs and imports nothing;
  a repo-wide grep will still surface this one prose mention.

## Ticket doc update needed?

Yes. Append to `## Implementation notes`:

- Criteria 1-3 are executably encoded as three structure guards in
  `tests/skills.test.ts` (corpus-sweep prior art; the guard file self-exempts,
  as does the `docs/tasks/migration-tool/` effort record, the same class as
  an archived tree).
- The failure-path pin carried from the reroute notes was not added; the
  deleted shim failure test has no tool-level twin and the `outcome` failure
  line (`migration failed: <reason>`) is unpinned. Candidate one-test
  follow-up for the coherence pass.
- The doctor skill and its `failed-migration.md` resource sweep landed as
  carried; they now name the `tw_migrate` tool.
- `CHANGELOG.md` line 174 intentionally keeps its dated mention of the CLI
  (historical record, instructs nothing).
- The empty `skills/engineering/setup-workflow/scripts/` directory vanished
  from disk; git tracks no empty directories, so there is nothing to commit
  for it.
- Validation at the verified tip `c08b22a`: `npm test` 22 files / 1299 tests
  green; `npm run typecheck` and `npm run typecheck:tests` both clean; no
  staged files.

## User attention needed?

No. No API surface differs from the spec and the scope did not change: the
work is pure deletion plus permanent guards, matching the removal contract.
The one residual (the unpinned tool-level failure path) is a test-coverage
gap, not a shipped-surface difference, and is recorded above for the
coherence pass to pick up if wanted.
