---
kind: task
type: feature
slug: overhaul-v4-migration
title: One v4 migration from any vintage, plus setup-workflow v4
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-artifact-model
slices: [overhaul-v4-migration]
---

## What to build

One migration, tested as its own unit, that takes any repo from any
current state to the version 4 tree: fresh (no docs/tasks),
unversioned (no schema_version), v1 nested state, v2, v3, flat or
maps-subtree layouts, and archived trees.

It performs, as one transformation: the effort-grouped layout
reorganization (tasks and tickets sorted by their old workflow
category), frontmatter unification (kind to type, category to
subtype, slug and map dropped, the status split applied with
normalization of invalid combinations), spec and aux backfill
(spec.md, findings, deviation reports, changelog, arch specs gain
frontmatter), archive reorganization and backfill, the state-file
rebuild (real nulls, effort pointer seeded from the current map
pointer where derivable, legacy slice key dropped, schema_version
stamped 4), legacy slice-directory reporting (never deletion; v4
dropped slice support), vendored non-OKF tree relocation with a
pointer left behind, the root index.md creation carrying
`okf_version: "0.2"`, and the dead task-overview pointer fix in the
onboarding report.

Non-negotiable properties, each tested: verify the YAML round-trip
of every rewrite before writing; on any failure leave the tree
untouched; idempotent (a second run produces no changes); resumable
(an interrupted run resumes cleanly); a final report of every change
plus every item needing human eyes (normalized combinations, slice
directories found, vendored trees moved, unresolvable references).

setup-workflow moves to version 4: it keys its fresh/migrate/no-op
detection on `schema_version: 4` and carries the upgrade resource
encoded as a fixed ordered step list tracing to the effort spec.

Whether and when to run the migration against this repo's own live
tree is a user call at run time: the migration's tests run against
fixture trees only; flipping the live tree mid-effort affects how the
remaining tickets are executed, so the natural moment is after the
skill-prose tickets land.

## Acceptance criteria

- [ ] Fixture trees for every vintage (fresh, unversioned, v1, v2,
      v3, maps-subtree, archived) arrive at the same v4 end state.
- [ ] Every rewrite is YAML-verified before the write lands.
- [ ] A mid-migration failure leaves the tree untouched (corruption
      safety, tested with an injected failure).
- [ ] Re-running the completed migration produces zero changes
      (idempotence).
- [ ] An interrupted run resumes cleanly (resumability).
- [ ] The report lists every change and every needs-human-eyes item.
- [ ] Legacy slice directories are reported, not deleted.
- [ ] Vendored trees move outside the bundle with a pointer left
      behind.
- [ ] The root index carries okf_version "0.2" and lists the tree.
- [ ] setup-workflow detects schema_version 4 and runs the correct
      branch (fresh/migrate/no-op).
- [ ] The migration is its own tested unit (the seam the spec
      approved).

## Blocked by

- overhaul-artifact-model (the migration targets the v4 model and
  layout this ticket consumes).

## Implementation notes

### Slice - overhaul-v4-migration (landed)

The v4 migration landed on `slice/overhaul-v4-migration` (20 commits,
merged into `task/overhaul-v4-migration`). `src/core/migrate.ts` is the
transformation, pure over a `TreePort` and importing the real v4 model
(`fromFrontmatter`, `validateCombination`, `TYPE_LEAVES`, `TYPE_LEAF` from
`core/art.ts`; `fromObject`, `toObject`, `freshState` from `core/state.ts`),
so the layout and state tables stay single-sourced. `src/migrate-cli.ts` is
the thin argv wrapper holding the real `FsPort`;
`skills/engineering/setup-workflow/scripts/migrate.mjs` spawns it with
`--experimental-strip-types` plus `ts-resolve.mjs`, a resolve hook needed
because the sources use NodeNext `.js` specifiers that type stripping does
not rewrite. `setup-workflow` keys its fresh/migrate/no-op detection on
`schema_version: 4` and carries `resources/upgrade-3-to-4.md`, the 9-step
ordered list tracing each step to the effort spec's Migration section. All
nine changed files are inside the spec's allowed set; the live `docs/tasks`
tree is untouched. Verified independently: 601/601 tests (13 files),
`tsc --noEmit` clean; no lint script is configured. The second coherence pass
below raises this to 616/616 and adds `src/core/fs-port.ts` plus its test
(the module the corruption-safety fix required).

Mutation-verified non-negotiables: removing the YAML round-trip check fails
49 tests, forcing `noop: false` fails 5, removing the resumability marker
guards fails 1, removing `tree.rollback()` fails 1. The pre-commit
`verifyStagedWrite` loop is defense in depth rather than the mechanism, since
`dumpVerified` already verifies every write at generation time.

Carried forward, in priority order:

1. **Corruption safety is demonstrated only for the in-memory test port.**
   `MemPort` in the tests applies to a scratch copy and swaps it in only on
   full success, so the injected-failure test passes. `FsPort` applies moves,
   writes, and deletes directly on disk one at a time with no scratch copy or
   undo journal, and `rollback()` only clears the staged maps, so it cannot
   undo what already landed. Reproduced against the real CLI: a rename that
   fails with EACCES leaves the first move applied while `state.yaml` still
   says `schema_version: 3`, a half-migrated tree the progress marker does not
   describe. No test covers it (`FsPort` is not exported, and the CLI failure
   test fails at `state.yaml` parsing, before anything is staged). The
   operator's backup branch makes corruption recoverable, not impossible, so
   the spec's stronger wording does not hold for the code that runs against a
   user's repo. Fix by staging into a temp dir or an undo journal, plus a test
   that drives the real port through an injected mid-apply failure, or by
   scoping the guarantee honestly in the arch-spec, the acceptance criterion,
   and the SKILL.md prose.
2. **Two vocabulary tables are duplicated from `art.ts`.** `TASK_CATEGORIES`
   copies `TASK_SUBTYPES` verbatim and `AUX_TYPES` re-lists four
   `KNOWN_TYPES`. The values agree today, but `TASK_CATEGORIES` decides
   `tasks/` versus `tickets/`, so a new planning subtype in `art.ts` would be
   misfiled as a ticket with no test failing. Importing `TASK_SUBTYPES` and
   deriving `AUX_TYPES` from `KNOWN_TYPES` closes it.
3. **The dead-pointer step reports rather than rewrites.** A surviving
   `/skill:task-overview` in any file becomes a `dead-pointer` needs-human
   item and the file is left byte-identical; the setup-workflow pointer
   itself is fixed, so the acceptance criterion is met where it matters.
   Confirm reporting-only is intended, since the spec's verb is "fix".
4. **`VENDORED_NAMES` hardcoded `matt-skills`** rather than a general rule.
   Fixed in the second coherence pass: the rule is now structural (a subtree
   with zero valid OKF artifacts, at least two non-OKF markdown files, and
   either a nested directory or a real corpus, never an effort root or an
   artifact container).

### Second coherence pass (post-review)

The whole-task review found correctness bugs, all fixed. Final numbers:
**616/616 tests**, `tsc --noEmit` clean.

- **Idempotence was broken whenever the tree held a vendored clone.** The
  index was computed from the pre-migration path set, so the first run missed
  the pointer file the plan itself adds and the second run saw it, staging an
  index rewrite (`noop: false`, "migrated from 4 to 4"). The index now
  describes the final tree (surviving originals at their destinations, plus
  every planned add). Regression tests cover the vendored case and every
  vintage fixture.
- **One source could be staged to two destinations.** `reorganize` claimed a
  vendored clone's files and `reportRest` staged the same sources for the
  relocation, so the first move won and the vendored relocation silently
  no-opped while the report claimed it moved. Vendored roots are now computed
  once, `reorganize` excludes them, and `reportRest` refuses to plan an
  ambiguous double-claim instead of failing silently.
- **`docs/vendored/<basename>` was not namespaced**, so two efforts with a
  same-named clone collided and the second overwrote the first. The
  destination is now `docs/vendored/<effort>/<basename>`.
- **The vendored heuristic misfired** on `maps/<effort>/notes/` (two loose
  notes were relocated out of the bundle). The rule now requires the shape of
  a tree, biasing against destructive false positives.
- **`FsPort`'s journal restored files but not directories**, leaving empty
  scaffolding after a failure. Created directories are now removed on
  restore, and the tests compare directory listings as well as file contents.
- **`AUX_TYPES` was not truly derived** (it still enumerated four literals).
  It is now every known type that is not a primary artifact.
- **`resources/upgrade-3-to-4.md` misdescribed its own executor**: it said
  step 9 rewrites the dead pointer and stamps `schema_version` there. Step 9
  is report-only and the stamp happens in step 5; the resource now says so,
  and carries the resource-to-executor step mapping.
- **The fresh-repo scaffold split is documented**: `migrate()` owns the bundle
  (`state.yaml`, `index.md`, `CHANGELOG.md`); the repo-root scaffold belongs
  to `setup-workflow`'s onboard branch.

One live file, `docs/tasks/archive/gate-skills-prompt-and-help/task.md`, has
frontmatter YAML that does not parse (an unquoted `: ` in its title). The
migration reports it and leaves it byte-identical; it needs a hand fix before
that subtree can migrate. Whether and when to run the migration against this
repo's own live tree remains a user call at run time.
