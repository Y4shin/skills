---
type: deviation report
title: Deviation report for release-mechanics
status: stable
---

## Deviation report: release-mechanics

Reviewed at `ticket/release-mechanics` against `task/release-mechanics` (7
checkpoint commits, HEAD `1363e34`), plus the architecture document's Changesets
section, its tool-surface section, its per-ticket contract 6, and the ticket's
eight acceptance criteria. `npx tsc --noEmit` and `npx tsc -p
tsconfig.test.json` are clean; `npx vitest run` is 28 files / 1504 tests passed,
and `npx vitest run tests/release.test.ts` is 22 passed. Two findings below were
confirmed by running the built seam against scratch fixture repositories (one a
git repository, one a two-member monorepo), not by reading alone.

### API surface changes

**1. Both tools take no arguments, and the apply recomputes the plan.**

- **Planned:** contract 6 says apply "writes the manifest and the changelog and
  removes consumed entries", and the tool-surface section says
  `tw_release_apply` "applies a plan" without saying whether a plan is an
  argument.
- **Actual:** `tw_release_plan` and `tw_release_apply` both declare
  `Type.Object({})` and read `ctx.directory`. The apply runs the plan's resolver
  again and hands that plan to `applyReleasePlan`, so a caller cannot apply a
  plan it holds.
- **Impact:** ticket 7 can only do preview, confirm, apply; it cannot pin the
  applied plan to the previewed one, and must report the apply's own answer
  rather than restating the preview. Sound, but the skill prose must not claim
  the preview is what gets applied.

**2. An empty plan is a refusal, not an empty result.**

- **Planned:** the ticket says no manifest, missing config, and nothing pending
  are "three distinct, named outcomes, never one silent no-op"; the architecture
  says "an empty release plan is a named outcome, never a success"; ticket 7 says
  it "reports nothing to release and stops".
- **Actual:** `empty-plan` is one of eight `ReleaseRefusal` codes. The plan
  renders `Refused: <reason>. Legal next: report that there is nothing to
  release and stop; ...` with `versions: []`.
- **Impact:** ticket 7 has to read a refusal as the nothing-to-release path. In
  this package a refusal is otherwise an error to fix, so the skill must separate
  `empty-plan` (report and stop) from `no-workspace`, `no-version`, `no-config`,
  `invalid-config`, `unreadable-staged`, `unknown-package`, and `plan-failed`
  (fix and retry).

**3. Eight refusal codes, and the ticket's "missing manifest" is `no-workspace`.**

- **Planned:** three named outcomes.
- **Actual:** `no-workspace | no-version | no-config | invalid-config |
  unreadable-staged | unknown-package | empty-plan | plan-failed`. A private
  package under the default config is `empty-plan` with a reason naming the
  package and the private-package policy, not a code of its own; `no-version` is
  a manifest defect raised when the assembled plan comes out empty.
- **Impact:** ticket 7 maps codes to prose and cannot use the ticket's wording as
  a code name. `ok`/failure branching by code, not by `versions.length`, is
  required.

**4. The plan reports one section per released package, with the file it lands in.**

- **Planned:** "the changelog section text", singular.
- **Actual:** `changelog: ChangelogSection[]` of `{ package, file, text }`, where
  `text` is the section only (`## <newVersion>` onward, no `# <name>` header) and
  `file` is the absolute `CHANGELOG.md` path. A monorepo reports one per released
  package. On a git fixture with a committed changeset, the section carries the
  `- <sha>: ` prefix the writer adds, which is the reason `@changesets/git` joined
  the seam.
- **Impact:** ticket 7 renders a list and should print the `file` it was given
  rather than recomputing a path.

**5. `config.changelog` is forced, `false` included.**

- **Planned:** "the changelog specifier read from a repository's config is
  resolved or remapped to the standalone changelog package".
- **Actual:** `releaseConfig` replaces the specifier unconditionally with an
  absolute `file://` specifier for `@changesets/changelog-git` (resolved from the
  seam's own module, memoized), keeping the config's changelog options.
  `changelog: false` becomes `[<changelog-git>, null]`, so a repository that asked
  for no changelog still gets a `CHANGELOG.md` and a reported section.
- **Impact:** this is the one place the ticket's "identical to the command line
  tool" claim cannot hold, since `changeset version` writes no changelog under
  `changelog: false`. It is consistent with the architecture's "always maintains
  a root `CHANGELOG.md`", so it is a prose obligation for ticket 7, not a defect.

### Abstraction usage

- Used/was specified: **yes** for the libraries, the refusal shape, and the shared
  reads; **no** for one thing the architecture says not to reimplement.
- Reused rather than rebuilt: `readWorkspace`, `readChangesetConfig`, and the new
  `readPending` (authoring's dedupe and the release plan share one read of the
  staged set), `refusedOuttext` and `outcome` for both renderings, the
  `Refused: <reason>. Legal next: <call>.` shape with one legal next per code,
  `defStructured` with `activeByDefault`, and the existing registration pins
  instead of new ones. Gated repos are untouched, because they register from
  `GATED_REGISTERED_TOOLS`.
- The write and the arithmetic are still the libraries': `assembleReleasePlan` for
  the versions, `applyReleasePlan` for the manifest bump, the changelog insertion,
  and the changeset removal, `readChangesets` for parsing, `validateConfig` for
  the config. Nothing hand-rolls semver.
- One reimplementation: the plan's section **text**. `@changesets/apply-release-plan`
  exports only `applyReleasePlan` (`getChangelogEntry` is module-private in
  8.1.1, checked in `dist/index.mjs`), so `changelogEntry`, `versionSection`, and
  `dependentReleases` mirror the renderer in about 57 code lines while calling the
  changelog package's own `getReleaseLine` and `getDependencyReleaseLine`. It was
  confirmed to diverge from the writer in two configurations (see user attention
  item 1), so it is a genuine second implementation and not a formality, and the
  architecture's "do not reimplement changelog insertion" now has exactly one
  exception to record.
- Two couplings worth knowing, both currently harmless: `applyReleasePlan`'s
  fifth argument (`contextDir`) is left `undefined`, which defaults to the
  library's own directory, and that is only safe because `releaseConfig` always
  supplies an absolute `file://` specifier; and `asReleaseRefusal` narrows
  `ChangesetsRefusalCode` to `ReleaseRefusalCode` by cast, which is unreachable
  today because only `readWorkspace` and `readChangesetConfig` feed it, but would
  make `releaseLegalNext` answer `undefined` if a shared read ever grew
  `invalid-level` or `no-root-package`.

### Out-of-scope changes

- `src/core/changesets.ts`: `readStagedEntries` was refactored onto a new exported
  `readPending`, and its refusal reason was generalised from "the staged
  changesets ... so no entry can be checked against what is already staged" to
  "the changesets in `<dir>` could not be read (`files`): `<detail>`". Landed code
  from `changeset-authoring`, behaviour unchanged, its tests untouched and green.
- `src/disclosure.ts`: the release pair joins `ALWAYS_DECLARED`, which also feeds
  `OPEN_CLOSE_TOOLS`, so `tw_request_tool` now answers "declared in every state
  already" for both names.
- `tests/gate-factory.test.ts` (`FULL_TOOL_SURFACE`) and `tests/plugin.test.ts`
  (the sorted name list) were updated for the two registrations. Both are pins
  widened by exactly the added names, not loosenings.
- `package.json` / `package-lock.json`: `@changesets/apply-release-plan`,
  `@changesets/assemble-release-plan`, `@changesets/changelog-git`, and
  `@changesets/git` became runtime dependencies; `@changesets/cli` stays a dev
  dependency and is the only CLI-shaped entry; the `dev: true` flags drop from the
  hoisted transitive entries the promote reaches.
- Not done, and each looks deliberate: no skill prose, docs page, README line, or
  manifest skill entry (ticket 7 owns the promoted-set wiring); no
  `docs/tasks/CHANGELOG.md` entry, which every finished sibling got through the
  parent's `docs(ticket): note <slug>` commit; no architecture amendment, though
  the "do not reimplement changelog insertion" exception, the forced
  `changelog: false` override, the `@changesets/git` addition, and the
  `ALWAYS_DECLARED` placement all belong in the "Corrections recorded during
  implementation" section, which still carries its pre-existing duplicated H2.
- Nothing removed. The working tree has one unrelated modification,
  `docs/tasks/state.yaml`, the live task pointer.

### Ticket doc update needed?

**Yes.** `docs/tasks/configurable-git-workflow/tickets/release-mechanics/ticket.md`
still reads `workflow_state: ready` and has no `## Implementation notes`, while
the five finished siblings carry both. Append:

- `## Implementation notes` in the siblings' shape (`### What landed`,
  `### Lessons`): the seam's new surface (`planRelease`, `applyRelease`,
  `PendingEntry`, `PackageVersion`, `ChangelogSection`, `ReleaseRefusal`,
  `ReleaseRead`, `ReleaseWrite`, `readPending`); the two tools and that they take
  no arguments; the eight refusal codes and their legal-next texts; the forced
  config (absolute `file://` changelog specifier, options preserved, `format:
  false`, `changelog: false` overridden); `@changesets/git` and why
  (`getCommitsThatAddFiles` so the plan can carry the writer's `- <sha>: `
  prefix); the mirrored renderer, its line count, and why the library forced it
  (`getChangelogEntry` is not exported); that the apply classifies `written`
  versus `removed` from what still exists after the call; the `readPending`
  extraction and the generalised `unreadable-staged` reason; the observed
  verification numbers (28 files / 1504 tests, `tests/release.test.ts` at 22,
  both typechecks clean); and `workflow_state: done`.
- `## Divergence from plan`, which the architecture's corrections section names as
  the place a divergence is recorded, with the implementation result's eight
  items, plus three corrections to those items:
  - divergence 3 states the mismatch in one direction, "could report a dependency
    line the writer omits"; with a raised `updateInternalDependencies` the usual
    direction is the reverse (the report omits a line the writer writes), and a
    non-semver range makes the report add a line the writer does not write under
    the default config too;
  - divergence 6 says the private-package reason names "the config key that would
    change it"; the reason says "this config does not version private packages"
    and never spells `privatePackages.version`;
  - the criteria table should note that the CLI comparison holds only for configs
    that render a changelog, because of the `changelog: false` override.

### User attention needed?

**Yes**, because one behaviour differs from what the ticket's comparison criterion
implies, though scope itself did not change: all eight criteria are met as
written, and the refusal, formatting, specifier, CLI-comparison, and
prototype-path criteria each have tests that compare bytes.

1. **The plan's section text is not always the section the apply writes.** Two
   scratch-fixture repros, both outside the ticket's own fixtures:
   - `updateInternalDependencies: "minor"`, alpha and beta both released, alpha
     depends on beta `~1.0.0`, beta patch-bumps to `1.5.1` (out of range): the
     writer puts `- Updated dependencies\n  - @scope/beta@1.5.1` in alpha's
     changelog, and both the plan and the apply's own report omit it.
   - alpha depends on beta `file:../beta`, any config: the plan reports an
     `Updated dependencies` line the writer does not write, because the mirror
     does not check that the range is a valid semver range.
   The consequence is that `tw_release_apply`'s "Changelog section in `<file>`"
   can differ from the file it just wrote, and the same text is what ticket 7
   shows the operator. The library's rule is a few lines away (the
   `validRange(range) != null` guard, the out-of-range short cut, and
   `onlyUpdatePeerDependentsWhenOutOfRange`); until it is mirrored, ticket 7
   should not promise the reported section is the file's content.
2. **`changelog: false` is overridden.** A repository that disabled changelogs
   gets a `CHANGELOG.md` written. That matches the architecture's "always
   maintains a root `CHANGELOG.md`", but it is the one place the CLI-parity claim
   does not hold, and ticket 7's docs page is the only place an operator would
   learn it.
3. **The apply is always declared and writes outside any phase.** Because
   `release` is user-invoked with no registry entry, divergence 5's
   `ALWAYS_DECLARED` placement means a session with nothing open can call
   `tw_release_apply` and bump manifests, with the tool description's "once the
   operator confirms" as the only guard. That is the intended shape for a
   user-invoked skill and the gated branch is unaffected, but it makes ticket 7's
   prose the enforcement for the confirmation step rather than the disclosure
   machine.
4. **Two residual risks for the effort close.** Prerelease mode is not read
   (`preState` is `undefined`), so the CLI-parity claim covers non-prerelease
   repositories only; and the mirror is pinned to
   `@changesets/apply-release-plan` 8.1.1, so an upgrade that changes section
   rendering is caught by the two fixture comparisons rather than silently
   drifting.
