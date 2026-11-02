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
   active by default. The registry entry's comment, which currently says the
   phase runs the migration CLI through the shell, is updated to say it runs
   the migration through the disclosed tool.
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
   already-current no-op answer. A dry run computes the report and writes
   nothing. Backup-branch handling, the test-suite run, the commit, the
   fast-forward, and the surfacing of needs-human items stay with the skill.
4. **Removals.** The CLI shim, its TypeScript resolve hook, and the argv
   wrapper CLI are deleted. The report rendering moves from the wrapper into
   the tool. The tool becomes the only migration executor the package ships.
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
   test suite, and the commit on the migration branch; (d) fast-forward the
   integration branch to the migration branch's tip, asking for explicit
   user approval first when the integration branch is not `main` or `master`;
   (e) delete the migration branch after the fast-forward, because it is
   dangling and no history is lost; (f) end the run on the integration branch.
   The dry-run prose moves from a CLI flag to the tool parameter, and the
   backup-branch safety prose follows the new choreography.
7. **Skill prose, other branches.** The onboard and no-op branches of the
   skill are untouched.
8. **Glossary.** The Migration entry in the domain glossary loses its "not a
   tool in the registered surface" clause and names `tw_migrate` as the
   executor the setup-workflow phase discloses.
9. **Documentation.** The skill's docs page is re-synced to the new executor
   and branch choreography, per the repo rule that a behavior change re-syncs
   the promoted skill's page. The upgrade resources are checked for stale
   executor references and reworded where they name the CLI.

## Existing abstractions to use

- **The disclosure registry** (`SKILL_REGISTRY` in the disclosure module): the
  single skill-to-toolset table. The setup-workflow entry gains `tw_migrate`.
  No new mechanism: the open-set derivation and the containment guard
  (`assertDerivableOpenSets`, which runs at first derivation and refuses any
  toolset containment that would break the derivation) already cover the new
  entry.
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
- **The report rendering** in the argv wrapper: the exact rendering the parity
  decision freezes. It moves, it is not rewritten.
- **Test prior art**: the public tool factory export of the extension entry
  (the import the structure tests already use) for driving the tool in tests,
  and the fixture-tree builders in the spawn-based shim tests (reusable for
  the tool tests before those shim tests are deleted).

## Do-not-reimplement notes

- One report rendering, moved not rewritten: the tool inherits the wrapper's
  rendering; no second formatter.
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
  the function; the dry-run flag passes through the existing option.
- **Skill prose to tool**: the migrate branch's contract with the tool is
  three things: the open, the call (with or without the dry-run flag), and the
  returned report text. The shape of that text is frozen at parity with the
  CLI's rendering; the skill reads and surfaces it, and parses nothing deeper.
- **Docs to behavior**: the skill's docs page and the two upgrade resources
  name the executor explicitly today; they change in the same ticket that
  reroutes the branch, not later.
- **Tests to tool factory**: executor tests call the tool through the public
  tool factory over fixture trees on disk, never through a spawned process.
  Disclosure tests import the registry directly; that is their seam.

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
  the already-current no-op answer).
- Disclosure contract: opening the setup-workflow phase activates the tool,
  the matching close withdraws it, the idle default set never declares it.
- Test contract: the tool driven through the public factory over an
  old-vintage fixture (migration plus matching report), a dry run leaving a
  byte-identical tree, an already-current tree yielding the no-op answer, and a
  needs-human fixture whose report separates the items from changes;
  disclosure assertions for membership and default-set absence.

`reroute-migrate-branch` writes prose against this call contract only, and
`remove-migration-cli` relies on these tests as the executor coverage that
replaces the deleted shim tests.

### `reroute-migrate-branch` (feature, m; blocked by `tw-migrate-tool`)

**Exports**: the skill's migrate branch prose calling the tool, the six-step
branch choreography, the dry-run-as-parameter prose, the re-synced docs page,
the reworded upgrade resources, and updated structure tests.

- Prose contract: the branch instructs only the open plus the tool call; the
  approval gate before the fast-forward when the integration branch is not
  `main` or `master`; the migration-branch deletion after the fast-forward;
  the run ends on the integration branch.
- Docs contract: no living page instructs the shell command. This is
  `remove-migration-cli`'s precondition.

### `remove-migration-cli` (feature, s; blocked by `reroute-migrate-branch`)

**Exports**: a package shipping exactly one migration executor.

- Removal contract: pure deletion (the shim, the resolve hook, the argv
  wrapper, the spawn-based tests), reference-comment fixes in living files,
  archives untouched, the full suite and typecheck green. No behavior change
  rides in this ticket.
