---
type: map
title: Configurable git workflow for the task-workflow skills
status: deprecated
ready_for_spec: true
---
# Configurable git workflow for the task-workflow skills

## Destination

Every phase of the task workflow learns its git behaviour from a named profile in
settings instead of from hardcoded prose. A phase that needs a branch is told
which template to use and is refused when the checkout is not on it, and the
implementation sub-agents are blocked from spawning on the wrong branch. Effort
close-out authors the changesets at finalization, and a release skill turns them
into a version bump and a root `CHANGELOG.md`, with a repository's own release
steps from `docs/releasing.md` applied on top.

## Constraints

- No git instruction is hardcoded in skill prose. What to create and which branch
  a phase must be on arrives from the selected profile, through the extension.
- Guards are hard gates. A wrong branch refuses the phase or the sub-agent spawn,
  it does not warn.
- Two profiles ship as flat JSON files in the package and are selected by
  settings. Profile content is not overridable from settings in this effort, and
  a repo cannot author a custom profile yet; the profile shape must still allow
  both later.
- The settings surface is small: `taskWorkflow.git.profile`,
  `taskWorkflow.git.trunk` (`{ develop, main, develop }`, defaulting to false,
  `main`, `develop`), and `taskWorkflow.git.trunkMerge` (`"local"` or
  `"handoff"`, defaulting to `local`). The project file overrides the global file,
  and built-in defaults come last.
- Backward compatibility revised by the operator: a repo that configures nothing
  runs the `default` profile, so it now gets a dedicated effort branch per
  effort. The intake constraint that unconfigured repos see no change is
  deliberately relaxed.
- The release skill requires a `package.json` with a `name` and a `version` and a
  `.changeset/config.json`. A manifest carrying only those two fields is enough;
  no JavaScript project is needed.

## Non-goals

- Worktree isolation and parallel ticket chains. The recorded seed stays open.
- Authoring custom profiles, and overriding profile content from settings.
- Changing this package's own release pipeline: `scripts/release.sh` and the
  tag-triggered workflow keep their shape, and the release skill defers to them.
- Rebase and cherry-pick merge strategies. The merge flag covers fast-forward and
  no-fast-forward only.
- Redesigning the repo gate. The git configuration joins the existing
  `taskWorkflow` block but leaves `disableOnRepo` and `enable` alone.
- Gating the planning phases. intake, wayfinder, to-spec, and to-tickets carry no
  branch restriction, and `flat` gates nothing at all.
- Renaming or migrating a repo's existing branches. The templates govern the
  branches the workflow creates and the configured trunk name; a branch that does
  not match is refused with the reason, not moved.
- A machine-readable release recipe. `docs/releasing.md` stays prose.
- Auto-publishing. The release skill bumps versions and maintains the changelog;
  publishing stays the repo's own step.

## Non-negotiable facts

**Success test:** A repo that selects a profile in `taskWorkflow.git` gets that workflow enforced end to end: every guarded phase opens on the branch the profile requires or is refused, no implementation sub-agent spawns on the wrong branch, and close-out plus the release skill turn the effort's changesets into a version bump and a root `CHANGELOG.md`.

- Three branch levels: the trunk (`develop` when the repo configures one,
  otherwise `main`), one effort branch per effort, one ticket branch per ticket.
  There is no ticket landing branch.
- A profile is data, one entry per phase (intake, wayfinder, to-spec, to-tickets,
  implement-ticket, finalize-effort) with optional branch template, opening
  instructions, closing instructions, and closing branch gate, plus the merge
  flag and push policy. The implementation sub-agents get a branch gate template.
  Both bundled profiles keep the instruction fields empty.
- `default` guards `implement-ticket` and `finalize-effort` on the effort branch,
  guards all five implementation sub-agents on the ticket branch, and leaves the
  planning phases unrestricted. `flat` gates nothing.
- Profiles ship as flat JSON in the package and the extension loads them. The
  settings select a profile and configure the trunk; they do not override profile
  content.
- The extension owns resolution. Skills never read the settings file, and no git
  instruction is written into skill prose. A settings key may parameterise the
  instruction the resolver generates for a profile step.
- A phase learns its branch step before it opens: a read-only `tw_phase_brief`
  returns the step, the phase performs it, `tw_open` then gates hard on the
  resulting branch, and the refusal is the backstop when a model skips the call.
  Both paths read one resolver, so their text cannot drift.
- A guard runs before the action it guards, so a refusal leaves the working tree
  as it found it. Recovery is performing the named step and retrying.
- `tw_open` and `tw_close` run in sequential execution mode. Raw `bash` git
  commands are not guarded.
- `finalize-effort` merges the effort branch into the trunk with the profile's
  merge flag and pushes per the policy.
  `taskWorkflow.git.trunkMerge: "local" | "handoff"` switches that step:
  `handoff` skips the merge and the branch deletion, pushes when the policy
  allows, and prints the pull-request instruction with the branch and trunk names
  filled in. An unknown value is a diagnostic that falls back to `local`.
- Changesets are authored in effort finalization, proposed to the human, and
  written through an extension tool after confirmation. The file contract is
  strict `@changesets/cli` compatibility under `.changeset/`, and changesets
  ships as a dependency of this package so no CLI installation is required.
- Every effort yields at least one changeset entry. An effort with nothing
  user-observable writes a generic performance and stability patch, deduped
  against an identical staged entry. One entry per user-observable change;
  refactors, tests, and internal docs do not earn one.
- `release` is a user-invoked, promoted skill. Its defaults run every time: bump
  versions through the changesets libraries and maintain a root `CHANGELOG.md`.
  `docs/releasing.md` is prose and runs after them. Publishing stays the repo's
  own step, and the skill owns nothing about branches.
- The release skill needs a `package.json` with a name and a version and a
  `.changeset/config.json`. It refuses with the reason when they are missing, and
  treats an empty release plan as a named outcome.
- Guards block. They do not warn.

## Decisions so far

- `non-negotiables`: profiles are the mechanism. A profile carries, per phase, an
  optional branch name template, optional opening instructions, optional closing
  instructions, and an optional closing branch gate; the implementation
  sub-agents carry a branch gate template only. `implement-ticket` creates the
  effort's feature branch as its first action, before `tw_open`, so the open gate
  can enforce it. Changesets are authored at effort finalization, with loose
  granularity and human verification. The release skill always bumps versions and
  maintains a root `CHANGELOG.md`, with `docs/releasing.md` layered on top. One
  effort covers both strands.
- `instruction-channel`: the channel is the tool result. `tw_open` returns the
  phase's opening instructions and `tw_close` the closing ones, kept under 2000
  characters so compaction does not swallow them. No phase-granular
  system-prompt hook exists, and no hook sits between skill expansion and the
  run, so nothing can be appended to a `SKILL.md`. A refused `tw_open` names the
  branch step and latches nothing, so the model can perform the step and retry.
  A hard branch check needs a git seam inside the tool, which is testable and
  precedented.
- `spawn-block-feasibility`: a `tool_call` handler can block a spawn before any
  child exists, both at the outer `subagent` call and per child through
  `subagent_launch`, which `runs.run` and `runs.all` also pass through. The
  ticket identity reaches the handler through the outer `args`, a `key` that
  embeds the slug, or the output path; extra fields passed to `runs.run` do not
  reach it. Host gates run after the child, so they are defense in depth, not
  the enforcement point. Launches outside the model's tool path (slash, RPC,
  schedule, prompt templates) bypass both layers.
- `profile-schema`: three branch levels, the trunk (`develop` when configured,
  otherwise `main`), one effort branch per effort, one ticket branch per ticket,
  and no landing branch. `implement-ticket` and `finalize-effort` gate on the
  effort branch, all five implementation sub-agents gate on the ticket branch,
  and the planning phases carry no restriction. `flat` gates nothing. Profiles
  ship as flat JSON selected by a settings key, with the instruction fields kept
  for later custom profiles and empty in both bundled profiles.
- `branch-step-channel`: a phase learns its branch step from the read-only
  `tw_phase_brief` before it opens, performs the step, and `tw_open` then gates
  hard on the resulting branch. The refusal naming the branch is the backstop for
  a model that skips the query. The two paths share one resolver. No `bash` git
  commands are guarded, and `tw_open` and `tw_close` run in sequential execution
  mode.
- `changeset-contract`: the file contract is strict `@changesets/cli`
  compatibility, written under `.changeset/`. Changesets come into this package
  as a dependency so the extension can drive them through its own tools, and a
  user may still manage them with the CLI; the package must work with no CLI
  installed. Writes go through an extension tool after the operator confirms the
  proposed entries. Every effort yields at least one entry, with a generic
  performance and stability patch for an effort with nothing observable, deduped
  against an identical staged entry.
- `changesets-api`: the dependency is the library set, not the CLI, because
  importing `@changesets/cli` runs its CLI and exits the process. The extension
  authors with `writeChangeset` and consumes with `getPackages`, `readConfig`,
  `readChangesets`, `assembleReleasePlan`, then `applyReleasePlan`. All are ESM
  with a Node floor the harness satisfies, and driving them reproduces
  `changeset version` because the CLI is a thin wrapper over the same functions.
  A missing manifest or `.changeset` config throws; a manifest without a version,
  or a private package, silently yields an empty release plan, so an empty plan is
  a refusal. `format: false` avoids formatter subprocesses.
- `changesets-wiring-prototype`: the library composition produced byte-identical
  repository state to a real `changeset version` run on six fixtures, including
  `package.json` formatting and key order, four `CHANGELOG.md` shapes, the commit
  prefix, and changeset-file removal, with the CLI's own failure messages. Three
  details become design requirements: the changelog specifier must be resolved or
  remapped to `@changesets/changelog-git` rather than passed unchanged from a
  user's config; `format: false` must be forced, since `"auto"` spawns a
  formatter and a formatter failure leaves a half-applied tree; and a missing
  `.changeset/config.json` is a hard error, not a reason to fall back to
  `defaultConfig`. An empty release plan is a named outcome, never a success.
- `feature-branch-rejoin`: `finalize-effort`'s close-out merges the effort branch
  into the trunk after the archive commit and the review triage, and pushes per
  policy. A repo that forbids a local trunk merge sets
  `taskWorkflow.git.trunkMerge: "handoff"`, which skips the merge and the branch
  deletion, pushes when the policy allows, and prints the pull-request
  instruction. The setting parameterises the profile's merge step; no merge
  instruction lives in a skill. The release skill owns nothing about branches.
- `release-skill-surface`: `release` is a promoted, user-invoked skill that always
  bumps versions through the changesets libraries and maintains a root
  `CHANGELOG.md`, then follows `docs/releasing.md` as prose when a repo has one.
  It requires a `package.json` with a name and a version and a
  `.changeset/config.json`, and refuses with the reason when they are missing; a
  manifest carrying only those two fields is enough. It reports an empty release
  plan as a named outcome and owns nothing about branches.

## Fog
