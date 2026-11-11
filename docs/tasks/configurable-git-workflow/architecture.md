---
type: architecture
title: Configurable git workflow and release pipeline for the task-workflow skills
status: stable
---

## Implementation decisions carried from the specification

### Configuration contract

Git configuration lives in the `taskWorkflow` block of `.pi/settings.json`, with
the global `~/.pi/agent/settings.json` honoured as well. The project file
overrides the global file key by key, and built-in defaults come last. The three
keys:

```json
{
  "taskWorkflow": {
    "git": {
      "profile": "default",
      "trunk": { "develop": false, "main": "main" },
      "trunkMerge": "local"
    }
  }
}
```

`profile` names the profile. `trunk.develop` is `false` when the repository has
no develop branch, and then the trunk is `trunk.main`; a non-empty string names
the develop branch, and then the trunk is that name. `trunkMerge` is `local` or
`handoff`. An unknown value for any key is a diagnostic that falls back to the
default, matching how the repo gate already treats malformed settings. Settings
do not override profile content.

`readGitSettings(cwd, deps)` in `src/core/repo-gate.ts` is the reader, built by
extending the repo gate's own settings read rather than reimplementing it:
`settingsPaths()` is now the single place the project and global paths resolve,
and `readSettingsJson`, `getTaskWorkflow`, and `walkToGitRoot` are reused. It
returns `{ profile, trunk, trunkMerge, diagnostics }` and never throws. It also
exports `GIT_SETTINGS_DEFAULTS`, `TRUNK_MERGE_MODES` with its `TrunkMergeMode`
type, `TrunkSettings`, and `trunkName()`. The first scope that carries a key
decides, so an invalid value in the project file diagnoses and falls to the
built-in default rather than falling through to a valid global value. A consumer
reads the trunk through `trunkName()`, never through either key directly.

### Profile data

Two profiles ship as flat JSON files in the package,
`src/profiles/default.json` and `src/profiles/flat.json`, loaded by the extension
and resolved relative to `import.meta.url`. They ride the package's existing
`files: ["src"]` entry, so no manifest change was needed. The schema:

```json
{
  "name": "default",
  "merge": "--no-ff",
  "push": "always",
  "phases": { "<phase>": { "branch": "", "openInstructions": "", "closeInstructions": "", "closeGate": "" } },
  "agents": { "<agent>": { "branch": "" } }
}
```

Every field except `name` is optional. The placeholder vocabulary is `{effort}`
and `{ticket}`. The trunk is a literal name, so it needs none. These field names
are the contract for any operator-authored custom profile. `merge` carries the
complete git flag, dashes included, because it reaches a shell command verbatim;
`push` is `always` or absent.

`default`: `implement-ticket` and `finalize-effort` require the effort branch
`effort/{effort}` and also carry `closeGate: effort/{effort}`. The five
implementation sub-agents, `implement-preconditions`, `tdd-worker`,
`slice-verifier`, `deviation-reporter`, and `land-worker`, require the ticket
branch `ticket/{ticket}`. The planning phases carry no branch. Both instruction
fields are empty, so the branch step is generated from the templates. The profile
carries `"merge": "--no-ff"` and `"push": "always"`.

`flat`: every phase and agent row is empty and both profile-level fields are
absent, which resolves to nulls. No branch requirement, no instruction, no gate,
no merge step, nothing pushed.

A profile that cannot be read is never partially applied. A missing file, an
unknown name, malformed JSON, or a schema violation (a non-object root, a
non-object block, a non-string field, a name that is not a plain name) discards
the whole file, returns a diagnostic, and resolves from `default`, so a malformed
custom profile cannot gate less than its author intended. When `default` itself
cannot be read, resolution degrades to `EMPTY_PROFILE` (`name: "none"`, every
phase and agent unguarded) with a diagnostic, a third state reachable only in a
broken install.

### Resolution

`src/core/git-profile.ts` holds the loader and the one resolver. Its exports:

- `phaseBrief(cwd, { name, effort, ticket? }, deps)` returns
  `{ profile, kind, branch, step, base, trunk, trunkMerge, openInstructions,
  closeInstructions, closeGate, merge, push, diagnostics }`, where `kind` is
  `phase`, `agent`, or `unknown`.
- `ticketBrief` asks the profile's ticket-scoped rows, the form the spawn guard
  uses when it has a ticket and names no agent.
- `gateDecision(cwd, { ...request, currentBranch }, deps)` returns
  `{ pass, profile, branch, currentBranch, base, step, reason, diagnostics }`,
  and `decideFromBrief(brief, name, currentBranch)` is its pure half.
- `readCheckout(git)` runs `rev-parse --abbrev-ref HEAD` through the git seam and
  answers `HEAD` for a detached checkout.
- `phaseText(cwd, name, deps)` returns a profile row's instruction text for the
  close, which has no effort to resolve a branch with.

`deps` is `BriefDeps`, which extends the repo gate's settings dependencies with
`profilesDir`, so a test injects both settings paths and a fixture profile
directory. `branchBase()` renders the base and the "create and check out ... off
..." step from one value, so the brief and the refusal cannot drift. A phase row
carries a `step`; an agent row's brief carries the step its dispatching phase
performs, and a gate decision on an agent row carries no step, because the spawn
guard composes its own sentence from `base`.

### Phase flow

`implement-ticket`'s first action is the phase brief, asked for itself. When it
names a branch that does not exist, the phase creates it off the trunk, then
opens. The open gates hard on the effort branch, so a phase that skips the step
is refused and told what to create. For each ticket in dependency order the phase
asks the brief again for the worker row, creates and checks out `ticket/<slug>`
off the effort branch, then dispatches `ticket-chain.js` with `branch`,
`effortBranch`, and `merge` in its arguments.

`finalize-effort` opens on the effort branch. Its close-out merges the effort
branch into the trunk with the profile's merge flag and pushes per the policy;
the brief carries `trunk` and `trunkMerge`, so the close-out restates neither. In
`handoff` mode it skips the merge and the branch deletion, pushes when the policy
allows, and prints the pull-request instruction with the branch and trunk names
filled in.

The chain composes both of its host gates from the branch names it was handed,
keeps its step names and step order, and builds its step keys as
`stepKey(step) = step + "." + args.ticket`, so the ticket identity survives into
the per-child launch. The separator has to be legal in a workflow step key, which
the runtime restricts to letters, digits, `.`, `_` and `-`; `KEY_SEPARATOR` is
written in both the extension and the script, which cannot import it, and a test
pins the two characters together and asserts the key's shape. It merges the
ticket branch into the effort branch and deletes it. With no landing branch there
is no phase-owned gate between a merged ticket and the effort branch: the
guarantees are the chain's verify gate and the close-out's CI gate, which runs on
the already-merged effort branch. Under `flat` the land host gate degrades to a
ticket-doc existence check, so a forgotten merge passes.

The planning phases, intake, wayfinder, to-spec, and to-tickets, carry no branch
requirement and no instruction.

Opening instructions are delivered as the open tool's result text and closing
instructions as the close tool's result text, kept under 2000 characters by
convention so compaction does not swallow them; the bound is an authoring
expectation that nothing in `src/` validates. The harness offers no
phase-granular system-prompt hook, and no hook sits between skill expansion and
the run, so nothing is appended to a skill file.

### Guards

One branch gate serves every phase: `branchGate` inside `tw_open`, called after
the tree precondition, for any registry entry whose resolved brief carries a
branch. Under the bundled `default` profile that is exactly `implement-ticket`
and `finalize-effort`; under an operator profile it is whichever phases carry
one, and no phase name appears in a branch of code.

The gate reads the checkout through `readCheckout` over the git seam. The refusal
names the current branch, the required branch, the base to create it from, and
the next legal call, in the shape the openers already use. Nothing latches, so
performing the step and retrying passes. A detached checkout answers `HEAD` and
refuses as no branch. A missing seam, or a git that fails, passes the open with a
diagnostic in `details.diagnostics` and a `Diagnostics:` line in the result text,
mirroring the repo gate's treatment of unreadable settings. The open's details
therefore always carry `required_branch` (null when the phase needs none),
`profile`, and `diagnostics`; the close's carry `diagnostics`.

A spawn guard, `spawnVerdict(cwd, toolName, input, deps)` in
`src/core/spawn-guard.ts`, blocks a spawn the profile gates. One `tool_call`
handler carries it: `guardToolCall` composes `guardTaskTreeWrites` first and
`guardSpawn` second, registered where the workflow is enabled, so the write
lockdown keeps priority and no second handler exists. It blocks three shapes: a
`subagent` call naming a profile-gated agent; a workflow launch whose `args` carry
a ticket and name no agent, which is the shape the implementation phase sends; and
the per-child `subagent_launch`, by reading the slug after the last separator in
`input.key`, because arguments passed to a child inside a workflow script do not
reach the handler. The rule is profile-driven: what carries a branch template is
gated, which under `default` is the five agents and under `flat` is nothing.

A blocked spawn returns `{ block: true, reason }` rather than throwing, so that
step fails and the child never starts, and the session continues. The reason
names the current branch, the required branch, and the base to create it from,
using the resolver's own `decideFromBrief`, so a spawn refusal and a phase
refusal cannot disagree. A checkout the seam cannot read passes with a
`ctx.ui.notify`, the same fail-open convention as the phase gate, because a hook
has no result payload to carry a diagnostic. The chain's host gates stay as
defense in depth, not as the enforcement point. The `tasks`, `chain`, and
`parallel` fanout shapes are not guarded.

`result.failed` still reports the bare step name. `closeGate` is carried by both
branch-bearing profile rows, reported by the brief, and enforced by nothing,
because no ticket in this effort names a closing branch gate.

Opening and closing run in sequential execution mode, so a close cannot race a
sibling tool call in the same message. Raw `bash` git commands are not
intercepted: the phase gate and the spawn block are the enforcement points.

The opener needs to read the checkout, so the extension gained a git execution
seam in its tool context, injected the way the existing opener tests inject
dependencies.

### Changesets

Authoring happens in effort finalization. The phase composes one entry per change
a user of the package or product can observe, skipping refactors, tests, and
internal docs. An effort with nothing observable gets a generic performance and
stability patch, unless an identical staged entry already exists, in which case it
is not repeated.

The tool is `tw_write_changesets`, and it takes an optional `dry_run`. A dry run
runs the same workspace read, config read, validation, generic fallback, and
dedupe as a write and stops before the filesystem, answering with the entries it
would write, the entries skipped as already staged, and whether the generic entry
applies. The close's flow is therefore propose, show, confirm, then write, and
the write reports what landed. A dry run and a write refuse in the same cases.

The file contract is strict changesets compatibility: files under `.changeset/`
with the tool's frontmatter and body. The package depends on the changesets
library set and a workspace reader at runtime, not on the command line tool,
because importing that tool runs its command line and exits the process. The
consumption path is: read the workspace packages, read the config, read the
changesets, assemble a release plan, apply it. `format: false` is passed to the
writer, so no formatter can spawn.

The shipped refusal codes are `no-workspace`, `no-config`, `invalid-config`,
`unknown-package`, `invalid-level`, `no-root-package`, and `unreadable-staged`,
each with a printable reason and one legal next. A missing `.changeset/config.json`
is `no-config` and an unreadable or invalid one is `invalid-config`, for the same
reason: falling back to the built-in default would version a repository that has
no changesets setup at all. `unreadable-staged` exists because the changesets
reader parses every staged file at once, so one malformed file would otherwise
empty the staged set and let a duplicate generic entry through.

The generic entry names the workspace's root package, at `patch`, with
`GENERIC_SUMMARY = "Performance and stability improvements."`. That sentence is
changelog prose, so it is operator-facing text. A monorepo whose root package is
private is skipped by the default config, so its generic entry produces an empty
release plan, which the release path reports as a named outcome rather than a
success.

Package validation accepts every package the workspace reader knows about,
including a monorepo's root package, and the generic entry is validated like any
other. Dedupe also drops a change named twice inside one call.

### Release mechanics

`tw_release_plan` and `tw_release_apply` both take no arguments and read the
session directory. The plan reports the pending entries, the versions they
produce, and one `{ package, file, text }` changelog section per released package,
where `text` is the section alone and `file` is the absolute `CHANGELOG.md` path,
so a monorepo reports one per package. The apply recomputes the plan from the tree
it writes and hands it to `applyReleasePlan`, which bumps the manifest, writes the
changelog section, and removes the consumed files, so a caller cannot apply a
plan it holds and the apply's own answer is the authority.

Eight refusal codes carry the outcomes: `no-workspace`, `no-version`,
`no-config`, `invalid-config`, `unreadable-staged`, `unknown-package`,
`empty-plan`, and `plan-failed`. An empty plan is a refusal, not an empty result:
it renders with `versions: []` and a legal next telling the caller to report that
there is nothing to release and stop. A private package under the default config
is `empty-plan` with a reason naming the package and the private-package policy,
and `no-version` is raised when the assembled plan comes out empty for a manifest
with no version.

Two behaviours are forced rather than inherited. The changelog specifier read
from a repository's config is replaced unconditionally with an absolute `file://`
specifier for `@changesets/changelog-git`, resolved from the seam's own module
and memoized, with the config's changelog options kept, so resolution never
depends on the command line tool being installed. `changelog: false` becomes that
specifier too, so a repository that asked for no changelog still gets a
`CHANGELOG.md` and a reported section, which is the one place parity with
`changeset version` does not hold. `@changesets/git` supplies
`getCommitsThatAddFiles`, which is why a section carries the writer's `- <sha>: `
prefix.

Prerelease mode is not read (`preState` is undefined), so plan parity covers
non-prerelease repositories.

### Release skill

`release` is a promoted, user-invoked skill: `disable-model-invocation: true`, so
only the human can start it. It previews through `tw_release_plan` and reports the
entries, versions, and changelog sections, asks for confirmation, applies through
`tw_release_apply`, and reports the apply's own answer rather than restating the
preview. It then follows `docs/releasing.md` as prose when the repository has one,
treating that file as the authority for the mechanical work of preparing and
publishing.

It has two stopping outcomes: a missing manifest or changeset config, reported
with the refusal's reason and nothing created, and an empty plan, reported as
nothing to release with no bump, no changelog section, and no entry consumed. It
performs no branch operations and never stages a changeset to force a release. It
separates the outcomes by reading the refusal's wording rather than
`refusal.code`, which the refusal carries; the durable branch was available and
the advisory one was taken, and the tests pin the wording.

The promoted set is eight surfaces, not one: the skill file, its bucket docs page
(`docs/engineering/release.md`), the manifest entry, both READMEs,
`docs/migration-target.yaml`'s promoted list, `skills/engineering/task-workflow-overview/SKILL.md`
with its docs page, the two `pi.skills` count pins (32 to 33), `SKILL_FILES`, and
`SURVIVING_TOOLS`. Each extra is forced by a derived pin that reads the manifest.

Two facts about reachability belong here. `release` is not in `GATED_SKILL_NAMES`,
so in a gated repository the command loads the skill while neither tool it calls
registers. And both tools sit in `ALWAYS_DECLARED` with no registry entry, so
`tw_release_apply` can bump manifests with no phase open, and the tool
description's "once the operator confirms" plus this skill's prose are the only
guard.

### Prose and wiring

The skills that carried hardcoded branch instructions lost them and gained the
phase brief and gate sentences: the implementation and effort-close skills lost
the branch model section, and the planning skills lost nothing because they never
had one. The worker agents lost branch creation and gained the expectation that
their branch is already checked out: the TDD worker no longer creates one, the
deviation reporter diffs against the base its task names, and the land worker
checks out the merge target, merges, and deletes the ticket branch. The chain
script's branch assertions moved to the resolved ticket branch and the effort
branch, and the landing-branch step disappeared. `agents/code-reviewer.md` and
`scripts/end-of-effort.js` lost their stale landing-branch references, and
`docs/engineering/implement-ticket.md` and `docs/engineering/finalize-effort.md`
were re-synced.

A prose guard test reads the sixteen phase, resource, and chain files plus the
five worker agents and bans five shapes in each: branch literals, branch
interpolations, the `{effort}` and `{ticket}` templates, the trunk names, and the
merge flags. Nothing is exempted, which is why the merge flag has to reach the
prose as data.

The git-profile documentation page is `docs/git-workflows.md`. It covers the two
profiles, the three settings keys, and the refusal behaviour, ships through
`package.json`'s `files` array, and is linked from the top-level README's "Where
to read next".

## Additional architecture for implementation

### The tool surface this effort adds

Four tools join the registered surface, and none of them registers in a gated
repo, which keeps the gated passive set exactly as it is today.

- `tw_phase_brief` is read-only and needs no open phase, because a phase must
  call it before it opens. It takes a skill name, an effort slug, and an optional
  ticket slug, and answers for the six registry phases and for the five
  implementation agents. It returns the resolved branch, the branch step, the
  base, the trunk and trunk-merge mode, and the profile row's instruction text,
  and its result text grows a `Merge step:` line when the profile carries a flag.
  It refuses a name that is neither a phase nor a gated agent, naming the phases
  and the legal next call; an empty effort throws rather than refusing. It is
  `activeByDefault: true` and lives in `ALWAYS_DECLARED`, and therefore in
  `OPEN_CLOSE_TOOLS`, so it is declared in every state while belonging to no
  toolset. That is the invariant that keeps it from deriving a closed phase as
  open.
- `tw_write_changesets` is the named writer for pending changeset entries. It
  takes an effort slug, optional `entries[]` of `{ package, level, summary }`, and
  an optional `dry_run`. It narrows `level` at runtime, validates each package
  against the workspace, applies the generic fallback and the dedupe, and either
  reports the proposal or writes the files and reports what landed and what was
  already staged. It refuses when the repository's changeset config is absent or
  invalid. It is disclosed by `finalize-effort` and is `activeByDefault: false`.
  Its `effort` argument is not resolved against the live tree, so a typo'd slug
  still writes.
- `tw_release_plan` computes the release plan without writing: the pending
  entries, the versions they produce, and the changelog section text per released
  package with the file it lands in.
- `tw_release_apply` recomputes the plan and applies it: bumps the manifest,
  writes the changelog section, and removes the consumed changeset files.

The two release tools exist because a skill file cannot import a library. The
skill prose decides when to call them and how to report; the mechanics live
behind the tools.

### Seams

- **Git execution seam.** `ToolContext.git: GitRun`, where
  `GitRun = (args: string[]) => Promise<string>`, wired in `src/pi.ts` to
  `pi.exec("git", args, { cwd: ctx.cwd })` and throwing on a non-zero exit so the
  read is a rejection rather than a code to inspect. Tests inject a fake. The
  `tool_call` context is `ExtensionContext`, which carries neither `git` nor
  `profilesDir`, so `guardSpawn` builds its own copy of that closure; the two
  copies should become one exported factory before a third caller appears.
- **Settings and profile read seam.** Git settings come from the same settings
  reading and normalization the repo gate already uses, extended with the `git`
  key. Profile files are read from the package's own directory through
  `ToolContext.profilesDir?: string`, threaded into `tw_open`, `tw_close`, and
  `tw_phase_brief` so a gate and a brief in one session always read the same
  profile. The real context never sets it; tests inject a fixture directory.
- **Resolver seam.** One module answers both "what does this phase need" and "may
  this spawn proceed", so the brief and the refusal cannot disagree.
- **Changesets seam.** `src/core/changesets.ts` wraps the library set:
  `readWorkspace`, `readChangesetConfig`, `readPending`/`readStagedEntries`,
  `proposeEntries`, `writeEntries`, `planRelease`, and `applyRelease`. Release
  authoring and the release tools both go through it.
- **Spawn hook.** The extension already registers a `tool_call` handler, and the
  spawn guard lives in that one registration: `guardToolCall` composes the write
  lockdown and `guardSpawn`. It blocks nothing other than spawns of a
  profile-gated agent, a workflow launch carrying a ticket, and the per-child
  launch whose key carries the slug.
- **Promoted-set seams.** Eight places, not four: the manifest array, both
  READMEs, the bucket docs page, the migration target's promoted list, the
  overview skill and its docs page, the counted pins, the skill-file list, and
  the surviving-tools list.

### Existing abstractions to build on

- The opener registry and its gate vocabulary, including the refusal shape and
  the legal-next-call rendering.
- The repo gate's settings reader, diagnostics list, and malformed-value
  fallbacks.
- The named-writer convention for artifacts under the task tree, and the write
  lockdown that refuses hand edits there.
- The disclosure open and close sets, `ALWAYS_DECLARED` and its derived
  `OPEN_CLOSE_TOOLS`, which decide what an open activates.
- The harness's own `ToolExecutionMode`, carried on the internal `Tool` and on
  `defStructured`'s options and forwarded only when set.
- The workflow-script chain conventions: named steps, host gates, and per-step
  outputs.
- The changesets library set behind the CLI, with `applyReleasePlan` as the
  writer of both the manifest bump and the changelog section.
- The fake-context test pattern for the tool surface, and the temp-fixture
  repository pattern for the changeset and release seams.

### Do not reimplement

- Settings precedence or merge order. Extend the existing reader.
- The refusal text shape. A branch refusal is one more entry in the existing
  vocabulary.
- Frontmatter parsing or artifact writing. Use the named writers.
- Changeset parsing, version arithmetic, or changelog insertion. Call the
  libraries. One exception was forced: `@changesets/apply-release-plan` 8.1.1
  exports only `applyReleasePlan` and keeps `getChangelogEntry` module-private,
  so the plan's section text is mirrored in about 57 lines that call the
  changelog package's own `getReleaseLine` and `getDependencyReleaseLine`. It is a
  second implementation and it diverges from the writer in two configurations, so
  treat the apply's own report as the authority on what was written.
- The promoted-set wiring. Mirror the existing entries rather than inventing a
  second list.
- The chain's failure toolbelt or its step ordering. Change the branch names and
  the step keys, nothing else.

### Per-ticket interface contracts

Each contract names the ticket it shipped as and the surface that exists.

**1. Profile data and phase briefs (`profile-data-and-phase-briefs`).** Exports
`readGitSettings` with `GIT_SETTINGS_DEFAULTS`, `TRUNK_MERGE_MODES`,
`TrunkSettings`, and `trunkName()`, the two profile files, and the resolver's
`phaseBrief`, `ticketBrief`, and `gateDecision` with `decideFromBrief`. Ships
`tw_phase_brief`. The brief for `implement-ticket` under `default` names the
effort branch and the step that creates it; the brief for a planning phase
carries no branch; the brief under `flat` carries nothing for any phase. Later
tickets consume the resolver rather than reading settings themselves.

**2. A refusing gate on the two branch-bearing phases (`branch-gates`).** Exports
the git seam, `readCheckout`, `phaseText`, and the gate wiring. Contract, as
built: one `branchGate` in `tw_open` refuses any phase whose brief carries a
branch when the checkout differs, naming the required branch, the base, and the
step that creates it; a retry after the step passes; the open and close results
carry the profile's instruction text and may carry a diagnostics line; both
openers declare sequential execution; an unreadable checkout passes with a
diagnostic. Depends on 1 for the resolver, not on 3.

**3. A spawn block on the implementation agents (`spawn-block`).** Exports
`spawnVerdict` and its wiring in the composed `tool_call` handler, plus
`KEY_SEPARATOR`, `ticketFromKey`, `spawnIdentity`, `isSpawnCall`, and the resolver
additions `ticketBrief`, `PhaseBrief.base`, and `GateDecision.base`. Contract: a
spawn the profile gates is blocked when the checkout is not the resolved ticket
branch, with a reason naming the current branch, the required branch, and the
base; both outer shapes and the per-child key are covered; anything else passes
untouched. Depends on 1 for the resolver.

**4. Branch behaviour in the workflow's prose (`workflow-prose`).** Rewrites the
phase prose and the worker procedures, gives the chain `branch`, `effortBranch`,
and `merge`, moves its host gates and step keys, and adds `docs/git-workflows.md`.
Contract: no phase file, worker agent, or chain script states a branch name or a
merge flag as a fixed rule, pinned by a prose guard; each branch-bearing phase
states its brief-and-gate sentence; the workers expect their branch; the chain
merges a ticket into the effort branch and no longer creates a landing branch;
the close-out merges into the trunk or hands off per settings, with the trunk and
merge mode read from the brief. Depends on 2 and 3.

**5. Changeset authoring at effort close (`changeset-authoring`).** Exports
`src/core/changesets.ts` with `proposeEntries`, `writeEntries`, `readWorkspace`,
`readChangesetConfig`, `readStagedEntries`/`readPending`, `CHANGE_LEVELS`,
`GENERIC_SUMMARY`, and its refusal codes, and ships `tw_write_changesets`.
Contract: an entry names the package and a level, its body is the summary, it
lands under `.changeset/` in the tool's own format, an identical entry is not
repeated, and a missing or invalid changeset config is a refusal. The write and
the skip report arrive in one call; the pre-write proposal came in the follow-up
below. Ticket 6 consumes the file contract.

**5b. Propose before writing, and an honest dedupe
(`changeset-proposal-and-dedupe`).** Adds `dry_run` to the writer, so the close
proposes, shows, confirms, then writes, with the same resolution behind both
paths. Makes an unreadable staged entry a refusal (`unreadable-staged`) instead
of an empty staged set, so one malformed file can no longer admit a duplicate
generic entry. Extends package validation to the workspace root package, the
generic entry included, and updates the close's prose and report resource to the
propose, confirm, write flow.

**6. Release mechanics behind a tool (`release-mechanics`).** Extends the
changesets seam with `planRelease`, `applyRelease`, `PendingEntry`,
`PackageVersion`, `ChangelogSection`, `ReleaseRefusal`, and `ReleaseRead`, and
ships `tw_release_plan` and `tw_release_apply`. Contract: the plan names pending
entries, the versions they produce, and one changelog section per released
package with the file it lands in; apply recomputes and writes the manifest, the
changelog, and the removal of consumed entries; the changelog renders through the
standalone changelog package regardless of what the repository's config names,
including `false`; formatting is disabled; a missing workspace, a missing
version, a missing or invalid config, an unreadable staged set, an unknown
package, and an empty plan are distinct, named refusals. Depends on 5 for the
file contract.

**7. The release skill (`release-skill`).** Adds the skill file, its bucket docs
page, the manifest entry, both README lines, and the five further promoted-set
surfaces a derived pin enforces. Contract: user-invoked only, calls the plan tool,
reports the plan, calls apply on confirmation, reports the apply's answer, then
follows the repository's release document as prose. Depends on 6.

### Testing seam summary

Every ticket is testable without a real repository, and none of them drives a
real git process: the gates, the spawn guard, and the brief are driven through a
fake tool context with an injected git seam that returns a branch name, and the
resolver through fixture profile directories. The changeset and release tickets
run against temporary fixture repositories, one of them a two-member monorepo,
with the command line tool present in the dev tree as the comparison oracle. The
prose ticket is covered by a text-pinning guard over the phase, resource, chain,
and worker files. The promoted-set ticket is covered by the existing structure
tests, which check the manifest, both READMEs, the docs page, the migration
target, the overview router, the count pins, and the file lists together.

## Corrections recorded during implementation

### The trunk setting shape

The specification's configuration snippet showed `trunk` with a duplicate JSON
key (`develop` twice), which no parser can represent. The settled shape, taken
with the operator during implementation, is
`{ "develop": false | string, "main": string }`, defaults
`{ "develop": false, "main": "main" }`, and the resolved trunk is
`trunk.develop === false ? trunk.main : trunk.develop`. Validation accepts
`false` or a non-empty string and rejects `true`, `""`, and non-strings with a
diagnostic that falls back to the default. The configuration contract above
carries the corrected snippet.

### The phase brief answers for an implementation agent too

The phase creates each ticket's branch before it dispatches the chain, so the
phase must learn that branch's name. The only skill-reachable resolver is the
brief tool, and its first shape refused any name that was not a workflow phase.
It now also accepts an implementation agent's name and resolves that agent's
profile row, returning the ticket branch and the step that creates it off the
effort branch. A branch-bearing phase therefore makes one call for its own brief
and one call per ticket for the agent row, and a brief never carries a second
branch, because that would conflate two profile rows. A name that is neither a
phase nor a gated agent keeps the refusal. This is a tool-surface addition the
specification did not name.

### The release tools take no plan argument, and an empty plan is a refusal

Contract 6 said apply "applies a plan" without saying whether a plan is an
argument, and it named three outcomes. As built, both tools take no arguments and
the apply recomputes the plan, and eight refusal codes carry the outcomes, with
`empty-plan` rendering as a refusal whose legal next is to report that there is
nothing to release. The release skill therefore has to read one refusal as the
stop path and separate it from the codes that mean fix and retry.

### The changelog section text is a second implementation

The specification said not to reimplement changelog insertion, and one exception
was forced: `getChangelogEntry` is module-private in
`@changesets/apply-release-plan` 8.1.1, so the plan mirrors the renderer. The two
known divergences are a raised `updateInternalDependencies` with an out-of-range
dependency, where the writer adds a line the plan omits, and a dependency range
that is not valid semver, such as `file:../beta`, where the plan adds a line the
writer does not write.

### The promoted set is eight surfaces, not four

Contract 7 named the skill file, the docs page, the manifest entry, and both
READMEs. The suite enforces eight, because the count pins, the overview router,
the migration target, the skill-file list, and the surviving-tools list all read
the manifest. The next promoted skill should expect eight.

### The step-key separator must be legal for the workflow runtime

The spawn block first embedded the ticket slug in the chain's step keys with `@`.
The workflow runtime accepts only letters, digits, `.`, `_` and `-` in a run key,
so every chain failed at launch before any child started, and the ticket's own
test could not see it because it compared the two copies of the separator rather
than the runtime's rule. The separator is now `.`, and a test asserts that the
built key matches the runtime's shape.

### The bundled merge flag has to carry its dashes

The `default` profile first stored `merge: "no-ff"`, which reached the rendered
step as `git merge no-ff <branch>` and fails. The value is now `--no-ff`, a
complete flag, and a test asserts that any bundled profile's merge value is a
flag rather than a bare name.

## What is not built yet

Recorded so the archived document does not claim more than shipped:

- No profile row's `closeGate` is enforced.
- Both enforcement points fail open when the git seam cannot read the checkout.
- The per-child `subagent_launch` surface is unit-tested against the documented
  input shape only, because the pinned `pi-subagents` 0.84 registers no such
  tool.
- `release` is reachable in a gated repository where neither of its tools
  registers.
- The `no-config` legal next tells the caller to run `npx changeset init`, which
  the release skill forbids.
- The plan's section text can differ from the file the apply writes, in the two
  configurations named above.
- `tw_write_changesets` leaves its `effort` argument unresolved.
- The 2000-character bound on instruction text is a convention, not a check.
