---
type: spec
title: Configurable git workflow and release pipeline for the task-workflow skills
status: stable
---

## Problem Statement

A repository that adopts the task workflow inherits a git branch model written
into the skills, the chain scripts, and the worker agents. It assumes a landing
branch per ticket, a working branch per ticket, and a starting branch that
receives merges while the effort runs. A team whose conventions differ, because
its trunk is protected, because it uses a single long-lived branch, because it
merges through pull requests, or simply because its branches are named
differently, cannot use the workflow without editing the package or working
against its own rules.

The same is true of releases. A repository using the workflow has no way to say
how its own releases are made, and nothing connects the work of an effort to a
version bump and a changelog entry.

The guards are the third part of the problem. Today they are prose the model is
asked to honour: a phase opened on the wrong branch, or a worker launched in the
wrong place, is a mistake the model has to avoid rather than something the
package prevents. A workflow that is only advisory is not a workflow.

## Solution

A repository selects a named git profile in its settings. The profile states, for
each phase, which branch the phase must be on, what instructions the phase
receives when it opens and closes, and what gate closes it, and, for each
implementation sub-agent, which branch must be checked out before it may start.
The extension resolves the profile, hands each phase its branch step before the
phase opens, and refuses a phase or a spawn that does not match.

Two profiles ship. `default` gives every effort its own branch on top of one
ticket branch per ticket, and guards the phases and the spawns that act on them.
`flat` carries no branch instructions and no gates, for a repository where the
operator drives git by hand.

A repository that cannot merge into its trunk locally says so in settings and
receives a hand-off instruction instead of a merge.

Effort close-out authors changesets for what a user can observe. A new `release`
skill turns the pending changesets into a version bump and a root changelog, then
follows the repository's own release steps from `docs/releasing.md`.

## User Stories

1. As a repository operator, I want to select a git profile in settings, so that
   the workflow's branching matches my conventions without editing the package.
2. As a repository operator, I want the workflow to refuse a phase opened on the
   wrong branch, so that a mistake is caught before any work happens.
3. As a repository operator, I want each phase to receive its branch step before
   it opens, so that the agent performs the right step instead of guessing.
4. As a repository operator, I want the effort branch created when an effort
   enters implementation, so that every effort is isolated from the trunk.
5. As a repository operator, I want each ticket to get its own branch, so that a
   half-finished ticket never contaminates the effort branch.
6. As a repository operator, I want a finished ticket merged into the effort
   branch and its branch deleted, so that the effort branch stays the single
   integration point.
7. As a repository operator whose trunk is not called `main`, I want to name it,
   so that the workflow does not assume my repository's layout.
8. As a repository operator with both `main` and `develop`, I want to declare
   which one is the trunk, so that merges land where my team expects.
9. As a repository operator whose hosting requires pull requests, I want to
   prevent local merges into the trunk, so that the workflow cannot bypass
   review.
10. As a repository operator in that position, I want the workflow to push the
    effort branch and tell me how to open the pull request, so that I finish the
    merge where my team expects it.
11. As a repository operator with no branching discipline to enforce, I want a
    profile that gates nothing, so that the package imposes no rules at all.
12. As a repository operator, I want the workflow to block an implementation
    agent from starting on the wrong branch, so that no work happens in the wrong
    place.
13. As a repository operator, I want the bundled profiles to work with no
    configuration, so that adopting the package needs no setup.
14. As a downstream user of the package, I want my own branch names to be
    expressible, so that the package fits my repository.
15. As a downstream user, I want to add a custom profile later, so that a
    workflow I cannot change today is still supported eventually.
16. As a downstream user without the changesets command line tool, I want the
    package to write and read changesets itself, so that I need no extra tool.
17. As a downstream user who already uses the changesets command line tool, I
    want the package to write files that tool accepts, so that I can keep
    managing them my way.
18. As a repository operator, I want close-out to propose changeset entries and
    write them only after I confirm, so that the changelog says what I would say.
19. As a repository operator, I want an effort with nothing user-visible to
    record a generic patch, so that every release has an entry, without two
    identical entries piling up.
20. As a release manager, I want one skill that bumps versions and updates the
    root changelog, so that the mechanical part of a release is one step.
21. As a release manager, I want that skill to follow `docs/releasing.md` when my
    repository has one, so that packaging and publishing stay mine.
22. As a release manager, I want the skill to refuse and name what is missing
    when the repository has no manifest, so that I am never left with a silent
    no-op.
23. As a release manager, I want the skill to report when there is nothing to
    release, so that no empty version is cut.
24. As the maintainer, I want the branch model in one configurable place instead
    of six hardcoded files, so that a workflow change is one change.
25. As the maintainer, I want the guards to live in the opener and the spawn
    block, so that enforcement does not depend on the model's discipline.
26. As the maintainer, I want the release skill to be promoted and user-invoked,
    so that the model never starts a release on its own.
27. As the maintainer, I want the changeset path to match the command line tool
    byte for byte, so that a repository can use either one.
28. As a reviewer, I want the spec to state which modules change, so that the
    implementation tickets can be scoped without re-reading the map.
29. As an operator adopting the workflow in an existing repository, I want to
    know that my existing branches are not renamed, so that adoption is
    predictable.
30. As a model executing a phase, I want one instruction block per phase from the
    extension, so that I do not have to read repository settings myself.

## Implementation Decisions

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
      "trunk": { "develop": false, "main": "main", "develop": "develop" },
      "trunkMerge": "local"
    }
  }
}
```

`profile` names the profile. `trunk.develop` decides whether the repository has
a `develop` branch, and the two names are configurable for repositories that
rename them. `trunkMerge` is `local` or `handoff`. An unknown value for any key is
a diagnostic that falls back to the default, matching how the repo gate already
treats malformed settings. Settings do not override profile content.

### Profile data

Two profiles ship as flat JSON files in the package, loaded by the extension.
Each profile carries, per phase, an optional branch template, optional opening
instructions, optional closing instructions, and an optional closing branch
gate, plus the merge flag and the push policy. Each implementation sub-agent gets
a branch gate template. The placeholder vocabulary is `{effort}` and `{ticket}`.
The trunk is a literal name, so it needs none.

`default`: `implement-ticket` and `finalize-effort` require the effort branch
`effort/{effort}`. The five implementation sub-agents, `implement-preconditions`,
`tdd-worker`, `slice-verifier`, `deviation-reporter`, and `land-worker`, require
the ticket branch `ticket/{ticket}`. The planning phases carry no branch. Both
instruction fields are empty, and the branch step is generated from the
templates.

`flat`: every field is empty. No branch requirement, no instruction, no gate.

A profile the operator cannot write yet is the reason the instruction fields
exist: a later custom profile is data, not a new code path, and no profile name
appears in a branch of code.

### Resolution

One resolver reads settings, loads the profile, resolves templates for a given
effort and ticket, and produces two things: a phase brief, which is the branch
step plus the phase's instruction text, and a gate decision, which is either pass
or a refusal naming the branch to create. The phase brief and the opener's
refusal both read the resolver, so their text cannot drift. A missing profile
file, an unknown profile name, or malformed JSON is a diagnostic that falls back
to `default` rather than a crash.

### Phase flow

`implement-ticket`'s first action is the phase brief. When it names a branch that
does not exist, the phase creates it off the trunk, then opens. The open gates
hard on the effort branch, so a phase that skips the step is refused and told
what to create. For each ticket in dependency order, the phase creates the ticket
branch off the effort branch, checks it out, and dispatches the chain.

`finalize-effort` opens on the effort branch. Its close-out merges the effort
branch into the trunk with the profile's merge flag and pushes per the policy.
In `handoff` mode it skips the merge and the branch deletion, pushes when the
policy allows, and prints the pull-request instruction with the branch and trunk
names filled in.

The planning phases, intake, wayfinder, to-spec, and to-tickets, carry no branch
requirement and no instruction.

Opening instructions are delivered as the open tool's result text and closing
instructions as the close tool's result text, each under 2000 characters so
compaction does not swallow them. The harness offers no phase-granular
system-prompt hook, and no hook sits between skill expansion and the run, so
nothing is appended to a skill file.

### Guards

A phase with a branch template refuses to open unless the checkout matches it.
The refusal names the current branch, the required branch, and the next legal
call, in the shape the openers already use. Nothing latches, so performing the
step and retrying passes.

A spawn guard blocks the `subagent` call for the five implementation agents
unless the checkout is on the resolved ticket branch. It blocks at the outer call
using the chain's arguments and at the per-child launch using a key that embeds
the ticket slug, because arguments passed to a child inside a workflow script do
not reach the handler. A blocked spawn fails that step with a reason, and the
child never starts. The chain's host gates stay as defense in depth, not as the
enforcement point.

Opening and closing run in sequential execution mode, so a close cannot race a
sibling tool call in the same message.

Raw `bash` git commands are not intercepted. The phase gate and the spawn block
are the enforcement points.

The opener needs to read the checkout, so the extension gains a git execution
seam in its tool context, injected the way the existing opener tests inject
dependencies.

### Changesets

Authoring happens in effort finalization. The phase proposes one entry per
change a user of the package or product can observe, skipping refactors, tests,
and internal docs. An effort with nothing observable gets a generic performance
and stability patch, unless an identical staged entry already exists, in which
case it is not repeated. Proposed entries are printed in the close-out report and
written after the operator confirms, through an extension tool rather than a
built-in writer.

The file contract is strict changesets compatibility: files under `.changeset/`
with the tool's frontmatter and body. The package depends on the changesets
library set and a workspace reader at runtime, not on the command line tool,
because importing that tool runs its command line and exits the process. The
consumption path is: read the workspace packages, read the config, read the
changesets, assemble a release plan, apply it.

Three behaviours are forced rather than inherited. The changelog specifier read
from a repository's config is resolved or remapped to the standalone changelog
package, so resolution never depends on the command line tool being installed.
Formatting is disabled, because the config's default value spawns a formatter
whose failure leaves a half-applied tree. A missing `.changeset/config.json` is a
hard error, because falling back to the built-in default would version a
repository that has no changesets setup at all.

An empty release plan is a named outcome, never a success: a manifest without a
version field, and a private package under the default config, both produce one
silently.

### Release skill

`release` is a promoted, user-invoked skill. It always bumps versions through the
changesets libraries and maintains a root `CHANGELOG.md`. It then follows
`docs/releasing.md` as prose when the repository has one, treating that file as
the authority for the mechanical work of preparing and publishing. It refuses
with the reason when a `package.json` with a name and a version, or a
`.changeset/config.json`, is missing; a manifest carrying only those two fields
is enough. It reports nothing-to-release and stops. It performs no branch
operations.

### Prose and wiring

The skills that carry hardcoded branch instructions lose them and gain the phase
brief and gate sentences: the implementation and effort-close skills lose the
branch model section, and the planning skills lose nothing because they never
had one. The worker agents lose branch creation and gain the expectation that
their branch is already checked out. The chain script's branch assertions move to
the resolved ticket branch and the effort branch, and the landing-branch step
disappears.

The release skill enters the promoted set, which means the package manifest, both
READMEs, the docs page for its bucket, and the structure tests that pin the
promoted set. A new documentation page describes the git profiles, the settings
keys, and the two bundled profiles.

## Testing Decisions

Good tests here assert external behaviour at a seam the package already treats as
a boundary: settings in, decision out; spawn call in, block or pass out; changeset
file in, version bump and changelog out. Tests do not assert internal call order
or private helpers.

The modules under test:

- configuration reading and precedence, project over global over defaults, with
  malformed values producing a diagnostic and the documented fallback;
- the profile loader, including a missing file, unknown name, malformed JSON, and
  the two bundled profiles' resolved matrices;
- the resolver, for each phase and each profile: the branch step, the instruction
  text, and the gate decision, including the refusal text naming the branch;
- the phase gate at the opener, driven with a fake tool context and a fake git
  seam, covering pass, refuse, and the retry after the branch exists;
- the spawn guard, covering the outer call with chain arguments, the per-child
  launch with a slug-bearing key, and the agents it must not touch;
- the changeset writer and reader, including the empty-plan outcome, the missing
  config error, the dedupe of the generic patch, and byte-level agreement with a
  command line tool fixture;
- the release skill's outcomes: bump and changelog, missing manifest, missing
  changeset config, nothing to release, and a repository whose `docs/releasing.md`
  describes steps the skill only reads.

Prior art in the repository: the opener gate tests drive the tool surface with a
fake context and assert refusals and legal next calls; the repo gate tests cover
settings precedence and malformed input; the migration tests use fixture
repositories; the skills tests pin the promoted set across manifest, READMEs, and
docs pages.

## Out of Scope

- Worktree isolation and parallel ticket chains.
- Authoring custom profiles, and overriding profile content from settings.
- Changing this package's own release pipeline, which keeps its script and its
  tag-triggered workflow, and which the release skill defers to.
- Rebase and cherry-pick merge strategies.
- Redesigning the repo gate, whose existing keys keep their meaning.
- Gating the planning phases, and gating anything at all under `flat`.
- Renaming or migrating a repository's existing branches.
- A machine-readable release recipe; `docs/releasing.md` stays prose.
- Auto-publishing; the release skill stops at versions and the changelog.

## Further Notes

Backward compatibility changed on purpose. A repository that configures nothing
now runs `default`, which creates an effort branch per effort, so its behaviour
differs from today's. The operator accepted this. A repository that wants today's
looser behaviour selects `flat`.

Two constraints from the research shaped the design rather than being discovered
during implementation: there is no harness hook between reading a skill file and
running the phase, so instructions can only travel as tool results, and the
changesets command line tool cannot be imported, so the dependency is the library
set behind it.

The prototype surfaced pitfalls the tests must cover: the changelog specifier in a
user's config points at the command line tool and fails to resolve without it; the
default formatting mode spawns a formatter; and a manifest without a version, or a
private package, yields an empty plan with no error. Each of those would ship as a
silent failure if it were inherited rather than decided.

> The architecture content in this specification is archival: the living architecture document is [architecture.md](architecture.md); update it there, not here.
