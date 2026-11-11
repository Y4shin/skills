---
type: deviation report
title: Deviation report for changeset-authoring
status: stable
---

## Deviation report: changeset-authoring

Reviewed at `ticket/changeset-authoring` against `task/changeset-authoring`
(10 commits, one per acceptance criterion), plus the architecture document's
Changesets section, its tool-surface section, and the ticket's acceptance
criteria. `npm run typecheck` and `npm run typecheck:tests` are clean;
`npx vitest run` is 25 files / 1428 tests passed, and
`npx vitest run tests/changesets.test.ts` is 18 passed. Two findings below were
confirmed by running the built code against a scratch fixture rather than by
reading it.

### API surface changes

**1. The entry proposal has no surface: the close writes, then reports.**

- **Planned:** the architecture says ticket 5 "exports the entry proposal used by
  `finalize-effort`", and that "proposed entries are printed in the close-out
  report and written after the operator confirms, through an extension tool".
  The tool surface section names four tools, none of them a proposer.
- **Actual:** `proposeEntries(cwd, { changes })` in `src/core/changesets.ts`
  returns `{ refusal, entries, skipped, generic, diagnostics }` and writes
  nothing, but **no production code calls it**; its only consumers are the tests
  and `writeEntries`'s internal resolution. The single tool, `tw_write_changesets`,
  does the generic fallback, the workspace validation, the dedupe, and the write
  in one call, so the operator confirms entries the model composed without
  knowing which ones will be skipped.
- **Impact:** ticket 4 (`workflow-prose`) must write the `finalize-effort` prose
  as "compose entries, write, report what landed and what was already staged",
  not as "propose, confirm, write". A pre-write proposal needs a `dry_run` flag
  on the tool or a fifth tool, neither of which the architecture has; adding it
  now is cheap, after ticket 4 writes the prose it is a rewrite. Ticket 6 does
  not need it, because its `tw_release_plan` already reports pending entries.

**2. `tw_write_changesets` is disclosed to `finalize-effort`.**

- **Planned:** the architecture says the four new tools register outside gated
  repos and says nothing about which phase toolset discloses this one.
- **Actual:** added to the `finalize-effort` toolset in `src/disclosure.ts` with
  its explanatory comment. A tool no toolset discloses fails the repo's existing
  "discloses every registered workflow tool through some phase toolset"
  invariant, and the effort close is the only phase that authors changesets.
  Parameters are `effort` plus optional `entries[]` of
  `{ package, level, summary }`; `level` is a plain string narrowed by the
  description and enforced at runtime, per `docs/testing.md`. Refusals render
  through `refusedOuttext` as `Refused: <reason>. Legal next: <call>.`, one legal
  next per refusal code. `activeByDefault` is false and the gated registered
  surface is untouched, because the gated branch registers from an allowlist.
- **Impact:** ticket 4's `finalize-effort` prose should name the tool, which the
  same invariant checks in the other direction. The toolset entry is otherwise
  inert: no phase prose mentions the tool yet, so it is disclosed in a phase
  whose prose does not use it.

**3. The refusal vocabulary grew from one code to six.**

- **Planned:** the ticket names one refusal (no changeset config) and the
  architecture names a missing config as a hard error. A package-name mismatch is
  a refusal in the ticket's criteria.
- **Actual:** `no-workspace | no-config | invalid-config | unknown-package |
  invalid-level | no-root-package`, each with a printable reason and one legal
  next. `invalid-config` covers unreadable JSON and a config the library's
  `validateConfig` rejects, for the same reason the architecture gives for a
  missing config (never fall back to the built-in default).
- **Impact:** none on the other tickets; ticket 6 will want the same posture and
  can reuse `readChangesetConfig`, which already returns these two codes.

**4. The validated package set is the workspace's member packages.**

- **Planned:** "each entry's package name is validated against the workspace
  before writing; a mismatch is a refusal".
- **Actual:** validation is against `workspace.names`, built from
  `packages.packages` of `@manypkg/get-packages`. In a single-package repository
  that list includes the root package, so the common case validates correctly. In
  a monorepo the reader's `packages` **excludes** the root package, so an
  explicit entry naming the monorepo's root package is refused `unknown-package`
  even though the root package exists. The generic entry is created after
  validation and is therefore never validated at all.
- **Impact:** an operator on a monorepo cannot version the root package through
  this tool, and the generic entry is the one entry exempt from the invariant the
  ticket states. If the intent is "any package the workspace reader knows about",
  `workspace.names` should union in `workspace.root`. Ticket 6 consumes the file
  contract, not the validation, so the fix is local to this module.

**5. The generic entry's package and summary text are decided here.**

- **Planned:** "a generic performance and stability patch"; the package and the
  exact summary text were not specified.
- **Actual:** package is the workspace root package, summary is
  `GENERIC_SUMMARY = "Performance and stability improvements."`, level `patch`.
- **Impact:** that sentence becomes changelog prose the moment ticket 6 inserts
  it into `CHANGELOG.md` and ticket 7 reports it, so it is operator-facing text
  chosen by this ticket. The root-package choice also carries a residual risk
  that ticket 6 owns: a monorepo whose root package is private is skipped by the
  default config (`privatePackages.version: false`), so its generic entry
  produces an empty release plan, which ticket 6 must report as a named outcome
  rather than as success.

**6. The dedupe is silently disabled by one unparseable staged file.**

- **Planned:** "an identical generic entry is not repeated", and separately "an
  empty release plan is a named outcome, never a success".
- **Actual:** `readStagedEntries` catches any throw from `readChangesets` and
  returns `{ entries: [], diagnostics: ["the staged changesets could not be
  read: ..."] }`. `@changesets/read` parses every file through `Promise.all`, so
  **one** malformed `.md` in `.changeset/` empties the whole dedupe set.
  Confirmed by running `tw_write_changesets` against a fixture holding one
  staged generic entry plus one malformed file: the tool wrote a second,
  identical generic entry (`staged.md` and a new file both bumping
  `@scope/pkg` patch with the same summary) and only mentioned the parse failure
  in its `Diagnostics:` line. A second write of the same generic patch therefore
  double-versions the package.
- **Impact:** the ticket's third acceptance criterion holds only while every
  staged file parses. Ticket 6 needs a malformed staged entry to be a named
  outcome (its own criteria say so, and its failure-path list includes "a
  malformed entry"), so the read seam should distinguish "nothing staged" from
  "the staged set could not be read" instead of collapsing both into
  `entries: []`. Making that a refusal here would close both holes.

**7. Dedupe extended to within a single call.**

- **Planned:** "an identical entry is not repeated" was written for the generic
  patch.
- **Actual:** the same rule also drops a change named twice in one call, since
  both would version the package twice. One extra branch, one extra test.
- **Impact:** none; a caller that legitimately means two entries for the same
  package and level must vary the summary.

### Abstraction usage

- Used/was specified: **yes**.
- The changesets library set is used rather than the command line tool, exactly
  as the architecture requires: `writeChangeset(..., { format: false })` writes
  the file, `@changesets/read` reads the staged set, `@changesets/config`'s
  `validateConfig` validates the config against the workspace view, and
  `@manypkg/get-packages` supplies the workspace. No parsing, formatting, or
  frontmatter is hand-rolled, and no formatter can spawn (`format: false` is
  asserted by a fixture that plants a `node_modules/.bin/prettier` shim and
  checks no marker appears).
- Not reimplemented: the refusal shape (`refusedOuttext` is reused verbatim), the
  tool definition helpers (`defStructured`, `outcome`), the disclosure registry
  (`SKILL_REGISTRY` gained one toolset entry), the temp-fixture test pattern, and
  the dev tree's `@changesets/cli` as the comparison oracle.
- One existing convention is **not** used: the named-writer pattern every other
  writer follows resolves its selector through `liveEffortDir(root, effort)` and
  refuses when the effort is not live. `tw_write_changesets` accepts `effort` and
  never resolves it; the slug appears only in the result text, so a typo'd or
  unknown effort still writes changesets. Changesets live outside the effort
  tree, so there is nothing to resolve against, but the parameter is currently
  decorative and the tool is the only writer on this surface whose scope
  argument is unvalidated.

### Out-of-scope changes

- `package.json`: five runtime dependencies (`@changesets/config`,
  `@changesets/read`, `@changesets/types`, `@changesets/write`,
  `@manypkg/get-packages`) and one dev dependency (`@changesets/parse`, the test
  oracle). The command line tool stays a dev dependency, which means ticket 6's
  first acceptance criterion is already satisfied by this ticket.
  `package-lock.json` follows: transitive entries that were `dev: true` become
  production entries, since three of them are now reachable from a runtime
  dependency.
- `src/disclosure.ts`: one toolset entry plus comment (item 2).
- Three foreign test pins updated deliberately, not to force green:
  `FULL_TOOL_SURFACE` in `tests/gate-factory.test.ts`, the registration list in
  `tests/plugin.test.ts`, and the `finalize-effort` toolset map in
  `tests/opener-gate.test.ts`. The gated registered surface is unchanged and its
  own pin is untouched.
- `src/core/changesets.ts` exports four functions no production code calls yet
  (`proposeEntries`, `readWorkspace`, `readChangesetConfig`, `readStagedEntries`)
  plus `CHANGE_LEVELS`, `GENERIC_SUMMARY`, and six refusal types. Three of the
  four are ticket 6's read path, which the architecture's seam describes. Only
  `proposeEntries` has no named consumer outside the tests and item 1's gap.
- Two refusal branches are untested: `no-workspace` (no manifest at all, which
  `getPackages` throws on) and `no-root-package` (unreachable through any bundled
  workspace reader). The implementation notes claim only the second is untested;
  `no-workspace` is reachable with a fixture carrying `.changeset/config.json`
  and no `package.json`, and the fixture helper already has the unused
  `manifest: null` hook for it.
- The tool does not reject an entry with an empty `summary` or an empty `package`
  string; `""` reaches validation as `unknown-package` (package) or writes an
  empty body (summary). Not a criterion, but it is the one input class the
  runtime validation does not name.
- `writeEntries` writes entries sequentially with no rollback: a validation
  refusal writes nothing, as promised, but a library throw mid-loop leaves the
  entries already written. No test exercises it.
- Uncommitted in the working tree: `docs/tasks/state.yaml` (`task:
  changeset-authoring`), the workflow's live-task pointer, not authored by this
  ticket and not part of its branch.
- Pre-existing and still present: `docs/tasks/configurable-git-workflow/architecture.md`
  carries the `## Corrections recorded during implementation` H2 twice (now
  committed rather than a working-tree edit). Not this ticket's change, and the
  duplicate carries no trunk content this ticket touches, but reconcile should
  dedupe it.

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

- the shipped seam: `src/core/changesets.ts` with the four read/write functions,
  `CHANGE_LEVELS`, `GENERIC_SUMMARY`, and the six refusal codes, and which of
  them ticket 6 consumes (`readWorkspace`, `readChangesetConfig`,
  `readStagedEntries`; ticket 6 will not use `proposeEntries`);
- that `tw_write_changesets` writes and reports in one call, so the close's prose
  is compose-then-write, and the skip report arrives with the write (item 1);
- that `tw_write_changesets` is disclosed by `finalize-effort`, is registered
  only outside gated repos, and is `activeByDefault: false`;
- the `GENERIC_SUMMARY` wording and the workspace-root package choice, flagged as
  the operator-facing changelog text ticket 6 renders;
- that the validated package set is the member packages, with the monorepo root
  package refused, and that the generic entry bypasses that validation (item 4);
- the malformed-staged-entry behaviour: dedupe silently disabled, diagnostic
  only, duplicate written (item 6), cross-referenced to ticket 6's malformed-entry
  outcome;
- the two untested refusal branches, correcting the notes' claim that only
  `no-root-package` is untested;
- the frontmatter still reads `workflow_state: ready` while the implementation is
  complete; set it to `done` as ticket 1's did.

### User attention needed?

**Yes.** The scope is what the ticket described, but three API-surface decisions
land in other tickets' prose and are cheaper to settle now than after ticket 4 is
written:

1. **No pre-write proposal.** The architecture's "printed in the close-out
   report, written after the operator confirms" cannot be honoured as built: the
   operator confirms entries the model composed, and the dedupe verdict only
   arrives with the write. Either accept that shape for ticket 4's prose, or add
   a `dry_run` flag / a fifth tool while it is still local to this module.
2. **The malformed-entry hole in the dedupe.** One unparseable staged file makes
   the writer repeat an identical generic entry, which double-versions the
   package. Fixing it as a refusal in `readStagedEntries` also gives ticket 6 the
   named malformed-entry outcome its criteria require.
3. **The generic entry's text and package.** "Performance and stability
   improvements." against the workspace root package is now changelog prose, and
   on a monorepo with a private root it yields an empty plan that ticket 6 must
   report rather than treat as success.
