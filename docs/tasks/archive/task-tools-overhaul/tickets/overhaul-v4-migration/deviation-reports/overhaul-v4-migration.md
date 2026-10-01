---
type: deviation report
title: overhaul-v4-migration
status: stable
---
## Deviation report: overhaul-v4-migration

Branch compared: `task/overhaul-v4-migration..slice/overhaul-v4-migration`
(20 checkpoint commits, `54aaf2b`..`e834ac9`).
Spec: `docs/tasks/overhaul-v4-migration/arch-spec.md` (user-approved).
Slice doc: `docs/tasks/overhaul-v4-migration/slices/1-overhaul-v4-migration.md`.

Independently verified: `npx vitest run` -> **601 passed (13 files)**,
`npm run typecheck` -> clean. The slice's own tests are 52 in
`tests/migrate.test.ts` plus 4 in `tests/setup-workflow-scripts.test.ts`.

### API surface changes

- **Planned:** `TreePort`, `MigrateOptions`, `MigrateReport`, `Change`,
  `HumanItem`, `migrate(tree, opts)`; the CLI shim and the v4 resource.
- **Actual:** exactly that, plus three additive details:
  - `TreePort.commit(opts: { failAfterWrites?: number })` takes the failure
    hook as a parameter rather than `MigrateOptions` reaching into the port.
    A reasonable reading of the spec's `failAfterWrites` option; the
    observable behavior is the same.
  - `TreePort.stageDelete(path)` was added. The spec's port sketch has no
    delete, but the transformation needs one (the legacy `slice` key, the
    `maps/` placeholder files, the progress marker). Additive and required.
  - `HumanItem.kind` gained `dead-pointer` and `unparseable` beyond the
    spec's three named kinds. Both are real report categories the spec's
    own steps demand (step 9's dead pointer; a file whose frontmatter will
    not parse).
  - `OKF_VERSION` is exported. Harmless.
- **Impact:** none on dependents. `MigrateReport` and `TreePort` are present
  as specified, so `setup-workflow` and the future doctor symptom have the
  seam they were promised.

### Abstraction usage

- **The real v4 model is imported, not re-encoded: yes, mostly.** `migrate.ts`
  imports `fromFrontmatter`, `validateCombination`, `TYPE_LEAVES`, `TYPE_LEAF`
  from `core/art.ts` and `fromObject`, `toObject`, `freshState` from
  `core/state.ts`. `TYPE_LEAVES` drives the destination filename for every
  type (line 942) and `TYPE_LEAF` the directory leaf (line 999); the state
  rebuild goes through `freshState` + `toObject`. The spec's central
  anti-duplication requirement is met for the layout and state tables.
- **All I/O goes through `TreePort`: yes.** `src/core/migrate.ts` contains no
  `node:fs` import (the only match for that string is the doc comment
  explaining that it must not have one). `node:fs` appears only in
  `src/migrate-cli.ts`, inside `FsPort`, which is what the port is for.
- **Two tables are still re-encoded, against "no second copy":**
  1. `TASK_CATEGORIES` (line 485) duplicates `art.ts`'s `TASK_SUBTYPES`
     verbatim (`research`, `prototype`, `grilling`, `manual`). `migrate.ts`
     never references `TASK_SUBTYPES`.
  2. `AUX_TYPES` (lines 488-493) re-lists four of `art.ts`'s `KNOWN_TYPES`
     (`findings`, `deviation report`, `changelog`, `out-of-scope note`).
     `migrate.ts` never references `KNOWN_TYPES`.

  These are the same class of drift the `overhaul-artifact-model` review
  flagged and the spec's "Do NOT reimplement" section names explicitly. The
  values agree today (verified by comparison), so nothing is broken; the risk
  is that adding a subtype or an aux type to `art.ts` silently leaves the
  migration behind, and the migration is the one component that must know
  the whole vocabulary. `TASK_CATEGORIES` is the more consequential of the
  two: it decides whether an artifact lands in `tasks/` or `tickets/`, so a
  new planning subtype would be misfiled as a ticket.
- Both approved seams are respected: `tests/migrate.test.ts` drives
  `migrate()` against an in-memory port; `tests/setup-workflow-scripts.test.ts`
  spawns the shim with `spawnSync` against a real fixture directory. No test
  imports a private helper from `migrate-cli.ts`.

### Out-of-scope changes

- **None.** `git diff --name-only` lists exactly nine files, all inside the
  spec's allowed set: `src/core/migrate.ts`, `src/migrate-cli.ts`,
  `skills/engineering/setup-workflow/{SKILL.md,resources/upgrade-3-to-4.md,scripts/migrate.mjs,scripts/ts-resolve.mjs}`,
  `tests/{migrate,setup-workflow-scripts,skills}.test.ts`.
- Zero changes under `docs/tasks/` (the live tree is untouched, as the spec
  requires). No change to `src/pi.ts`, `core/art.ts`, `core/state.ts`,
  `core/frontmatter.ts`, the graph tools, the legacy slice machinery, the
  `tw_*` names, or any other skill's prose.
- One file beyond the spec's shape list: `scripts/ts-resolve.mjs`. It is
  required, not gratuitous: the repo's sources use NodeNext `.js` import
  specifiers, and `--experimental-strip-types` strips types without
  rewriting those specifiers, so a direct run of `src/migrate-cli.ts` cannot
  resolve its own imports without the hook. It is loaded only by
  `migrate.mjs` and nothing else depends on it. Worth recording as an
  accepted extra rather than a deviation.

### Divergence from the slice doc's acceptance criteria

| Criterion | Verdict | Evidence |
|---|---|---|
| Every vintage arrives at the same v4 end state | met | `tests/migrate.test.ts` "every vintage reaches the same end state" (v1, v2, v3, unversioned, archived, fresh), plus the cross-vintage equality test |
| Every rewrite is YAML-verified before the write lands | met, genuinely tested | `dumpVerified` at generation plus `verifyStagedWrite` before commit; see the mutation evidence below |
| A mid-migration failure leaves the tree untouched | **met for the test port; not demonstrated for the real port** | see finding 1 |
| Re-running produces zero changes (idempotence) | met, genuinely tested | mutation of the `noop` computation fails 5 tests |
| An interrupted run resumes cleanly | met, genuinely tested | the marker-honored test fails when the `doneSteps` guards are removed |
| The report lists every change and needs-human item | met | "the report lists every change and every needs-human item" |
| Legacy slice directories are reported, not deleted | met | "legacy slice directories are reported, never deleted" |
| Vendored trees move outside the bundle with a pointer | met | "a vendored tree moves outside the bundle with a pointer left behind" |
| The root index carries okf_version "0.2" and lists the tree | met | "carries okf_version 0.2 and lists the tree" |
| setup-workflow detects schema_version 4 and runs the right branch | met | SKILL.md detection keys on 4; `tests/skills.test.ts` asserts the v4 vocabulary and `upgrade-3-to-4` |
| The migration is its own tested unit | met | `tests/migrate.test.ts`, 52 tests at the approved seam |

### Are the non-negotiable properties genuinely tested?

I answered this by mutation, not by reading the test names. Each mutation was
applied to `src/core/migrate.ts`, the suite was run, and the file restored.

| Property | Mutation | Result |
|---|---|---|
| YAML round-trip verified | removed the `dumpVerified` round-trip comparison | **49 of 52 tests fail** (genuinely tested) |
| Idempotence | forced `noop: false` on the real return | **5 tests fail** (genuinely tested) |
| Corruption safety (rollback) | removed `tree.rollback()` from the catch | **1 test fails** (tested, but only by the port-level path) |
| Resumability (marker) | removed all seven `doneSteps` guards | **1 test fails** (genuinely tested) |
| Corruption safety (pre-commit verify loop) | removed the `verifyStagedWrite` loop before `commit` | **0 tests fail** (survives) |

The last row is benign: `dumpVerified` already verifies every write at
generation time, so the pre-commit loop is defense in depth rather than the
mechanism. Removing it cannot corrupt anything, which is why no test fails.
Worth knowing, not worth fixing.

### Findings a reviewer must weigh

**1. Corruption safety is demonstrated only for the in-memory port, and the
real port is not atomic.** This is the one finding I would act on.

The spec says `commit()` is "the atomicity boundary" and that "on any failure
leave the tree untouched". The test port (`MemPort` in `tests/migrate.test.ts`)
genuinely delivers this: it applies staged changes to a scratch copy and only
swaps the map in when the whole apply succeeded, so an injected failure
leaves the live map untouched. The corruption-safety test passes for that
reason.

The real port (`FsPort` in `src/migrate-cli.ts`) does not do that. It applies
moves with `renameSync`, then writes with `writeFileSync`, then deletes, one
at a time, directly on disk. There is no scratch copy and no backup. If it
throws partway through (disk full, permissions, a rename across devices), the
already-applied moves and writes stay applied, and `rollback()` only clears
the staged maps, so it cannot undo them. I reproduced the shape of this
directly: a rename followed by a throw leaves the tree changed
(`BEFORE: one.md,two.md` -> `AFTER: one-moved.md,two.md`, `UNTOUCHED: false`).

No test covers this. `FsPort` is not exported, and the only CLI failure test
fails at `state.yaml` parsing, which happens before anything is staged, so it
never exercises a mid-apply failure. So the acceptance criterion "a
mid-migration failure leaves the tree untouched (corruption safety, tested
with an injected failure)" is satisfied for the seam the tests drive and
**not** satisfied for the code that will actually run against a user's repo.

Mitigating context, which is why I flag rather than block: `setup-workflow`
still instructs the operator to create a backup branch
(`git checkout -b migrate/schema-${from}-to-4`) before running the migration,
so a corrupted tree is recoverable by checking that branch out. That is a
real safety net, and it is the same one the v2-to-3 precedent relied on. But
it makes corruption *recoverable*, not *impossible*, and the spec's wording
promises the stronger property.

The fix is small and localized: have `FsPort.commit()` stage into a temp
directory (or record an undo journal of `[path, previousContent]` pairs) and
apply only after the whole set is verified, or expose `FsPort` and test it
with an injected mid-apply failure. Either way the property becomes true for
the real path and testable at the CLI seam.

**2. Two vocabulary tables are duplicated from `art.ts`.** `TASK_CATEGORIES`
duplicates `TASK_SUBTYPES` and `AUX_TYPES` re-lists four `KNOWN_TYPES`. The
spec's "Do NOT reimplement" section names this class explicitly, and the
previous ticket's review already fixed an instance of it. The values agree
today; the risk is silent drift in the one component that must know the whole
vocabulary. `TASK_CATEGORIES` decides `tasks/` versus `tickets/`, so a new
planning subtype added to `art.ts` would be misfiled as a ticket with no test
failing. Importing `TASK_SUBTYPES` and deriving `AUX_TYPES` from
`KNOWN_TYPES` would close it.

**3. The dead-pointer step reports rather than rewrites, which I read as
correct but which differs from the spec's wording.** The spec's step 9 says
"Fix the dead pointer in the onboarding report (`/skill:task-overview`
becomes `/skill:task-workflow-overview`)". The implementation reports a
surviving pointer in *any* file as a `dead-pointer` human item and does not
rewrite the file, with the test asserting the file still contains the old
string ("Reported, not rewritten: the artifact's own prose is not the
migration's to edit"). Separately, `setup-workflow/SKILL.md`'s own pointer
*is* fixed (line 93 now says `/skill:task-workflow-overview`), which is the
concrete fix the acceptance criterion is about. So the criterion is met for
the file that matters, and the broader behavior is a defensible reading
(rewriting arbitrary prose is riskier than reporting it). A reviewer should
confirm the reporting-only behavior is intended, since the spec's verb is
"fix".

**4. `VENDORED_NAMES` hardcodes `matt-skills`.** The vendored-tree rule is
stated generally in the spec ("vendored non-OKF trees inside the bundle"), but
the implementation matches one directory name. That is the only instance in
this repo, so it satisfies the acceptance criterion; a general rule (a
directory with no OKF frontmatter anywhere) would be broader. Recording it so
the generality gap is a known choice rather than an oversight.

**5. No em-dashes in added lines, and no staging leftovers.** Verified: zero
em-dashes in the added diff, working tree clean, everything committed.

### Task doc update needed?

**Yes.** Append to `## Implementation notes` in
`docs/tasks/overhaul-v4-migration/task.md`:

> The v4 migration landed on `slice/overhaul-v4-migration` (20 commits).
> `src/core/migrate.ts` is the transformation, pure over a `TreePort`; it
> imports the real v4 model (`fromFrontmatter`, `validateCombination`,
> `TYPE_LEAVES`, `TYPE_LEAF` from `core/art.ts`; `fromObject`, `toObject`,
> `freshState` from `core/state.ts`), so the layout and state tables stay in
> one place. `src/migrate-cli.ts` is the thin argv wrapper holding the real
> `FsPort`; `skills/engineering/setup-workflow/scripts/migrate.mjs` spawns it
> with `--experimental-strip-types` plus `ts-resolve.mjs` (a resolve hook,
> needed because the sources use NodeNext `.js` specifiers that type
> stripping does not rewrite). `setup-workflow` keys on `schema_version: 4`
> and carries `resources/upgrade-3-to-4.md`. Verified: 601/601 tests,
> `tsc --noEmit` clean.
>
> Mutation-verified non-negotiables: YAML round-trip (removing the check
> fails 49 tests), idempotence (5), resumability (1), rollback (1). The
> pre-commit `verifyStagedWrite` loop is defense in depth, not the mechanism,
> since `dumpVerified` already checks at generation.
>
> Carried forward, in priority order: (1) **corruption safety is only
> demonstrated for the in-memory test port.** `FsPort` applies moves and
> writes directly on disk with no scratch copy or undo journal, so a
> mid-apply failure leaves the tree partly migrated; `rollback()` only clears
> staged maps. No test covers it (`FsPort` is not exported, and the CLI
> failure test fails at parsing, before staging). The operator's backup
> branch makes it recoverable, not impossible. Fix by staging into a temp
> dir or an undo journal, or by exporting `FsPort` and testing an injected
> mid-apply failure. (2) `TASK_CATEGORIES` duplicates `art.ts`'s
> `TASK_SUBTYPES` and `AUX_TYPES` re-lists four `KNOWN_TYPES`; import them so
> a new subtype cannot be misfiled as a ticket. (3) The dead-pointer step
> reports rather than rewrites (the setup-workflow pointer itself is fixed);
> confirm reporting-only is intended. (4) `VENDORED_NAMES` hardcodes
> `matt-skills`.

### User attention needed?

**Yes**, for finding 1 only, and it is a judgement call rather than a
blocker.

The API surface matches the approved spec, every acceptance criterion is met
at the seam the tests drive, and nothing outside the allowed file set was
touched, so the slice can land. But the acceptance criterion "a
mid-migration failure leaves the tree untouched" is true of the test port and
not of the code that will run against a real repo, and that gap is invisible
to the current tests. Since the migration is the one component whose failure
mode is "corrupts a user's history", the user should decide whether to fix
`FsPort`'s atomicity now or accept the backup-branch safety net and record
the gap.

Findings 2 through 4 are small enough to fold into the coherence refactor;
finding 2 in particular is a few lines and closes a drift class the spec
names.

### Commands run for this report

- `git diff --stat` / `--name-only` / `--diff-filter` against the task branch,
  plus a per-file in-scope/out-of-scope classification
- `npx vitest run` -> 601 passed (13 files); `npm run typecheck` -> clean
- `npx vitest run tests/migrate.test.ts` -> 52 passed
- Five mutations applied to `src/core/migrate.ts` and reverted, each with the
  suite re-run, to test whether the non-negotiable properties are genuinely
  covered (results in the table above)
- A standalone Node probe reproducing the real port's non-atomic apply
  (rename then throw leaves the tree changed)
- Table comparison of `TASK_CATEGORIES` vs `TASK_SUBTYPES` and `AUX_TYPES` vs
  `KNOWN_TYPES`
- Em-dash scan over the added diff; staging check
