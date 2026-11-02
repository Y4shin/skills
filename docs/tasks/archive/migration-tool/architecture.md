---
type: architecture
title: "Architecture: Run the schema migration through a disclosed tool"
status: stable
---

# Architecture: Run the schema migration through a disclosed tool

The living interface contract for the `migration-tool` ticket graph. The
specification's architecture content is inlined below; everything after it is
the implementation-facing material the tickets build against. When this
document and the specification disagree, this document is the living one.

## Implementation Decisions (inlined from the specification)

The decisions below were settled during planning (the seed grilling of this
effort); nothing new is settled here.

1. **Executor redirection.** The migrate branch calls the registered tool
   `tw_migrate`, never a shell command. The tool joins the setup-workflow
   phase's toolset in the disclosure registry: disclosed by the phase opener,
   withdrawn by the closer, never declared in the default idle set, never
   active by default. The registry entry's comment is updated: it says the
   phase runs the migration through the disclosed tool, not the migration
   CLI through the shell.
2. **In-process execution.** The tool calls the existing migration
   transformation (the pure function over the tree port) directly, in-process
   in the extension host, with the production filesystem port over the target
   tree's root, located the same way every workflow tool locates the tree. It
   never spawns a Node child process. The module-loading restriction that
   broke the CLI applies only to spawned processes, so it cannot recur.
3. **Tool contract.** Migration execution only. The tool takes a dry-run flag
   and returns the rendered migration report, the same rendering the CLI
   produced: the from and to schema versions, every change (action, path,
   detail), every item needing human attention (kind, path, detail), and the
   already-current no-op answer. The return is the shared structured
   `outcome` wrapper: the report text plus a details envelope (`from`, `to`,
   `noop`, `dryRun`, and the `changes` and `needsHuman` counts, not the full
   entries); dependents read the text only. A dry run computes the report and
   writes nothing. A failure throws `migration failed: <reason>` (the CLI's
   stderr line, as a thrown error), which the skill surfaces like any tool
   failure. Backup-branch handling, the test-suite run, the commit, the
   fast-forward, and the surfacing of needs-human items stay with the skill.
4. **Removals.** The CLI shim, its TypeScript resolve hook, and the argv
   wrapper CLI are deleted. The report rendering moves from the wrapper into
   a shared module, `src/migrate-report.ts` (exporting
   `renderMigrationReport`), which the tool imports; while the CLI still
   shipped (the expand step) the wrapper imported it too, because the spawned
   wrapper cannot import the tool's file, and the deletion removes that
   transitional import, leaving the shared module as the tool's single
   renderer. The tool becomes the only migration executor the package ships.
5. **Unchanged core.** The transformation, its step semantics, its report
   semantics, its idempotence, its progress marker (an optimization, not the
   source of truth), and its atomicity guarantees (every rewrite verified
   before anything lands; a failure leaves the tree untouched) are not reopened
   by this effort.
6. **Skill prose, migrate branch.** The migrate branch is rewritten: the tool
   call replaces the shell command, and the branch choreography is made
   explicit: (a) record the branch the agent was on when the skill was invoked
   (the integration branch); (b) create the migration branch
   (`migrate/schema-${from}-to-5`) from it; (c) run the migration tool, the
   test suite, and the commit on the migration branch, opening the phase
   first with `tw_open` and a non-empty effort label (the prose uses
   `{ skill: "setup-workflow", effort: "setup-workflow" }`; any non-empty
   label behaves identically); (d) fast-forward the integration branch to
   the migration branch's tip (`git merge --ff-only`), asking for explicit
   user approval first when the integration branch is not `main` or `master`;
   (e) delete the migration branch (`git branch -d`) after the fast-forward,
   because it is dangling and no history is lost; (f) close the phase
   (`tw_close setup-workflow`) and end the run on the integration branch. A
   `--ff-only` that refuses because the integration branch moved mid-run
   fails loudly with both branches surviving; the recovery step (landed by the
   end-of-effort coherence pass) deletes the superseded migration branch,
   creates a fresh one from the moved tip, and repeats from the tool call,
   never forcing the fast-forward. The dry-run prose moves from a CLI flag to
   the tool parameter, and the backup-branch safety prose follows the new
   choreography.
7. **Skill prose, other branches.** The onboard and no-op branches of the
   skill are untouched.
8. **Glossary.** The Migration entry in the domain glossary loses its "not a
   tool in the registered surface" clause and names `tw_migrate` as the
   executor the setup-workflow phase discloses.
9. **Documentation.** The skill's docs page is re-synced to the new executor
   and branch choreography, per the repo rule that a behavior change re-syncs
   the promoted skill's page. The upgrade resources are checked for stale
   executor references and reworded where they name the CLI: their executor
   blockquotes, their "What the CLI prints" heading (now "What the tool
   returns"), and their after-the-run wording (the returned, not printed,
   MigrateReport), with the transcript literals unchanged. The doctor
   skill's failure-cause mentions ("the migration CLI errored") are reworded
   by the removal ticket's reference sweep. A docs page naming `tw_migrate`
   requires the tool in `tests/skills.test.ts`'s `SURVIVING_TOOLS` (the
   docs-page sweep).

## Existing abstractions to use

- **The disclosure registry** (`SKILL_REGISTRY` in the disclosure module): the
  single skill-to-toolset table. The setup-workflow entry gains `tw_migrate`
  (its toolset is `tw_context`, `tw_migrate`, `tw_get`, `tw_list`,
  `tw_feedback`). No new mechanism: the open-set derivation and the
  containment guard (`assertDerivableOpenSets`, which runs at first
  derivation and refuses any toolset containment that would break the
  derivation) already cover the new entry.
- **The tool-definition helpers** in the extension entry: `def` /
  `defStructured` for parameters and handler, and the shared structured
  `outcome` wrapper. The tool follows the shape of the existing tool
  definitions registered there.
- **The shared tree-root finder** (`findRoot` over the session directory):
  how the tool locates the target tree, exactly like every workflow tool.
- **The migration transformation**: the pure `migrate(tree, opts)` function
  and its report types (the pure core over a tree port). The tool is a caller
  of this function, nothing more.
- **The production filesystem port** (`FsPort`, the atomic-commit `TreePort`
  implementation): what the tool instantiates over the found root.
- **The report rendering**: the exact rendering the parity decision freezes,
  moved verbatim (only the rename and the added `export` keyword) out of the
  argv wrapper into the shared module `src/migrate-report.ts`
  (`renderMigrationReport`), which the tool imports. It moves, it is not
  rewritten.
- **Test prior art**: the public tool factory export of the extension entry
  (the import the structure tests already use) for driving the tool in tests,
  and the fixture-tree builders of the spawn-based shim tests (copied into
  the tool tests before those shim tests and their file were deleted; no
  shared builder module remains).

## Do-not-reimplement notes

- One report rendering, moved not rewritten: the tool inherits the wrapper's
  rendering through the shared module `src/migrate-report.ts`; no second
  formatter.
- One dry-run path: the core's existing dry-run option; the tool adds no
  separate preview logic of its own.
- One tree-root discovery: `findRoot`; no new locator.
- The transformation, its report semantics, its idempotence, its progress
  marker, and its atomicity are untouchable: the tool contributes nothing to
  them.
- No general script-wrapping mechanism: the skill-creator script tools (which
  wrap bundled `.mjs` scripts) are a different pattern for a different need,
  and the `runSkillScript` path is unrelated. The migration tool imports the
  core in-process.

## Seams

- **Registry to extension entry**: the toolset entry must name the tool
  exactly as the tool definition registers it. A name mismatch breaks the
  open-set derivation, and the containment guard fails fast on registry
  changes, so the registry row and the tool definition land in the same
  ticket.
- **Tool to migration core**: the only seam is the pure function plus the tree
  port. The tool constructs the production port over the found root and calls
  the function; the dry-run flag passes through the existing option; a core
  failure surfaces as the tool's thrown `migration failed: <reason>`.
- **Skill prose to tool**: the migrate branch's contract with the tool is
  three things: the open, the call (with or without the dry-run flag), and the
  returned report text. The open is `tw_open` with a non-empty effort label
  (the opener's `validateOpenArgs` requires one for every open; the prose uses
  `effort: "setup-workflow"`, and any non-empty label behaves identically).
  The shape of that text is frozen at parity with the CLI's rendering; the
  skill reads and surfaces it, and parses nothing deeper.
- **Docs to behavior**: the skill's docs page and the two upgrade resources
  changed in the same ticket that rerouted the branch, not later; they now
  name `tw_migrate` (the doctor skill's failure-cause mentions followed in
  the removal ticket's sweep).
- **Tests to tool factory**: executor tests call the tool through the public
  tool factory over fixture trees on disk, never through a spawned process.
  Disclosure tests import the registry directly and also drive the open and
  close (`tw_open`, `tw_close`) through the factory, exercising the real
  derivation; that is their seam.

## Per-ticket exports and interface contracts

The chain is `tw-migrate-tool` to `reroute-migrate-branch` to
`remove-migration-cli`: expand (the tool exists beside the CLI), then migrate
(the skill and the docs point at the tool), then contract (the CLI is deleted
once nothing references it). Each ticket lands green on its own.

### `tw-migrate-tool` (feature, m; no blockers)

**Exports** to its dependents: a registered tool `tw_migrate` with a frozen
call contract, plus its tests.

- Call contract: parameters `{ dryRun?: boolean }`; return the rendered
  report text (from and to versions, every change, every needs-human item, or
  the already-current no-op answer) in the shared structured `outcome`
  wrapper, with a details envelope (`from`, `to`, `noop`, `dryRun`, and the
  `changes` and `needsHuman` counts, not the full entries). A failure throws
  `migration failed: <reason>`.
- Disclosure contract: opening the setup-workflow phase activates the tool,
  the matching close withdraws it, the idle default set never declares it.
- Test contract: the tool driven through the public factory over an
  old-vintage fixture (migration plus matching report), a dry run leaving a
  byte-identical tree, an already-current tree yielding the no-op answer, and a
  needs-human fixture whose report separates the items from changes;
  disclosure assertions for membership and default-set absence (driven
  through the factory's open and close as well as the registry import). The
  registered-surface change also adds `tw_migrate` to four foreign
  surface-pinning tables (`tests/plugin.test.ts`,
  `tests/gate-factory.test.ts`, `tests/integration/disclosure.test.ts`,
  `tests/opener-gate.test.ts`) and re-scenarios the `tw_request_tool`
  refusal test in `tests/opener-gate.test.ts` (wayfinder plus the nested
  skill-creator open, `tw_context` granted, `tw_migrate` refused; the guard's
  semantics are unchanged, the reachable path moved). The tool's failure
  path is pinned at the tool level (added by the end-of-effort coherence
  pass: a failure throws the wrapped `migration failed: <reason>` line and
  leaves the tree untouched), on top of the core-level failure coverage (a
  mid-migration failure leaves the tree byte-identical, a malformed staged
  rewrite throws before anything lands).

`reroute-migrate-branch` writes prose against this call contract only, and
`remove-migration-cli` relies on these tests as the executor coverage that
replaces the deleted shim tests, with the shim failure test's twin added by
the end-of-effort coherence pass.

### `reroute-migrate-branch` (feature, m; blocked by `tw-migrate-tool`)

**Exports**: the skill's migrate branch prose calling the tool, the six-step
branch choreography, the dry-run-as-parameter prose, the re-synced docs page,
the reworded upgrade resources, and updated structure tests:
`SURVIVING_TOOLS` in `tests/skills.test.ts` gains `tw_migrate` (the docs-page
sweep requires it), and a green-on-arrival regression pin holds the onboard
and no-op branches untouched.

- Prose contract: the branch instructs only the open (with a non-empty
  effort label) plus the tool call; the approval gate before the fast-forward
  when the integration branch is not `main` or `master`; the fast-forward is
  `git merge --ff-only`, which refuses loudly if the integration branch moved
  mid-run (both branches survive; the recovery step landed by the
  end-of-effort coherence pass deletes the superseded migration branch,
  re-creates it from the moved tip, and repeats from the tool call, never
  forcing the fast-forward); the migration-branch deletion (`git branch -d`)
  after the fast-forward; the phase is closed (`tw_close setup-workflow`) and
  the run ends on the integration branch.
- Docs contract: no living page instructs the shell command. This is
  `remove-migration-cli`'s precondition.

### `remove-migration-cli` (feature, s; blocked by `reroute-migrate-branch`)

**Exports**: a package shipping exactly one migration executor.

- Removal contract: pure deletion (the shim
  `skills/engineering/setup-workflow/scripts/migrate.mjs`, the resolve hook
  `scripts/ts-resolve.mjs`, the argv wrapper `src/migrate-cli.ts`, the four
  spawn-based shim tests out of `tests/setup-workflow-scripts.test.ts` (the
  file stays, minus them), and the wrapper's transitional import of the
  shared rendering; the emptied `scripts/` directories vanish with them), the
  reference sweep in living files (the filesystem port's header comment and
  the test comments as planned, plus the doctor skill and its
  `failed-migration.md` resource, which now name the `tw_migrate` tool, and
  the `src/migrate-report.ts` and tool-test headers), three structure guards
  in `tests/skills.test.ts` encoding the removal (the three CLI files no
  longer exist; no living file references them; no living skill, docs, or
  resource prose names the CLI, with archives, the guard file, and this
  effort record exempt), the dated historical `CHANGELOG.md` mention kept,
  archives untouched, the full suite and typecheck green. No behavior change
  rides in this ticket.
