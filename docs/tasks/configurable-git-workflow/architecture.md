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
READMEs, the docs page for its bucket, the structure pins that read the manifest,
and the eight derived surfaces those pins force (per-ticket contract 7 names
them). A new documentation page describes the git profiles, the settings
keys, and the two bundled profiles.

## Additional architecture for implementation

### The tool surface this effort adds

Four tools join the registered surface, and none of them registers in a gated
repo, which keeps the gated passive set exactly as it is today.

- `tw_phase_brief` is read-only and needs no open phase, because a phase must
  call it before it opens. It takes a skill name and an effort slug, plus a
  ticket slug when the phase is ticket-shaped, and returns the resolved required
  branch, the branch step, and the phase's instruction text. For a phase with no
  branch requirement it says so plainly.
- `tw_write_changesets` is the named writer for pending changeset entries. It
  takes an effort slug and the proposed entries, validates each entry's package
  name against the workspace, and writes the files. It refuses when the
  repository's changeset config is absent.
- `tw_release_plan` computes the release plan without writing: the pending
  entries, the versions they produce, and the changelog section text.
- `tw_release_apply` applies a plan: bumps the manifest, writes the changelog
  section, and removes the consumed changeset files.

The two release tools exist because a skill file cannot import a library. The
skill prose decides when to call them and how to report; the mechanics live
behind the tools.

### Seams

- **Git execution seam.** The tool context gains a way to run a git command
  against the session's directory and return its output, so the phase gate and
  the spawn guard can read the checkout. It is injected the way the existing
  opener tests inject their fakes, so every gate test runs without a repository.
- **Settings and profile read seam.** Git settings come from the same settings
  reading and normalization the repo gate already uses, extended with the `git`
  key. Profile files are read from the package's own directory through a seam the
  tests replace with fixtures.
- **Resolver seam.** One module answers both "what does this phase need" and
  "may this spawn proceed", so the brief and the refusal cannot disagree.
- **Changesets seam.** One module wraps the library set: reading the workspace,
  reading the config, writing an entry, computing a plan, applying a plan. The
  release tools and the finalization proposal both go through it.
- **Spawn hook.** The extension already registers a `tool_call` handler; the
  spawn guard lives there. It must not block anything other than the `subagent`
  and `subagent_launch` calls for the five implementation agents.
- **Promoted-set seams.** The manifest array, both READMEs, the bucket docs page,
  and the structure tests that pin counts and file lists are the four places a
  new promoted skill must appear. Because those pins read the manifest, they pull
  eight derived surfaces with them: the migration target's `promoted_skills`
  list, the overview skill and its docs page, the two count assertions, the
  skill-file list, and the surviving-tools allowlist (per-ticket contract 7 names
  them all).

### Existing abstractions to build on

- The opener registry and its gate vocabulary, including the refusal shape and
  the legal-next-call rendering.
- The repo gate's settings reader, diagnostics list, and malformed-value
  fallbacks.
- The named-writer convention for artifacts under the task tree, and the write
  lockdown that refuses hand edits there.
- The disclosure open and close sets, which decide what an open activates.
- The workflow-script chain conventions: named steps, host gates, and per-step
  outputs.
- The changesets library set behind the CLI, with `applyReleasePlan` as the
  writer of both the manifest bump and the changelog section.
- The fake-context test pattern for the tool surface, and the fixture-repository
  pattern for migrations.

### Do not reimplement

- Settings precedence or merge order. Extend the existing reader.
- The refusal text shape. A branch refusal is one more entry in the existing
  vocabulary.
- Frontmatter parsing or artifact writing. Use the named writers.
- Changeset parsing, version arithmetic, or changelog insertion. Call the
  libraries; the prototype proved they match the command line tool byte for byte.
- The promoted-set wiring. Mirror the existing entries rather than inventing a
  second list.
- The chain's failure toolbelt or its step ordering. Change the branch names and
  the step keys, nothing else.

### Per-ticket interface contracts

**1. Profile data and phase briefs.** Exports a settings reader for the `git`
key, a profile loader for the two bundled files, and a resolver with two
functions: one returning a phase brief and one returning a gate decision. Ships
`tw_phase_brief`. The brief for `implement-ticket` under `default` names the
effort branch and the step that creates it; the brief for a planning phase
carries no branch; the brief under `flat` carries nothing for any phase. The
tool answers for an implementation agent as well as for a phase: naming one of
the five returns that agent's profile row, the ticket branch it requires, and
the step that creates that branch off the effort branch, because the phase
creates each ticket's branch before the chain starts. A name that is neither a
phase nor a gated agent keeps the refusal. Later tickets consume the resolver
rather than reading settings themselves.

**5. Changeset authoring at effort close.** Exports the entry proposal used by
`finalize-effort` and ships `tw_write_changesets`. Contract: an entry names the
package and a level, its body is the summary, it lands under `.changeset/` in the
tool's own format, an identical generic entry is not repeated, and a missing
changeset config is a refusal. Ticket 6 consumes the same files.

**2. A refusing gate on the two branch-bearing phases.** Exports the git seam and
the gate decision wiring for `implement-ticket` and `finalize-effort`. Contract:
the open refuses on a mismatched checkout with the required branch and the step
that creates it; a retry after the step passes; the open and close results carry
the profile's instruction text; both openers declare sequential execution.
Depends on 1 for the resolver, not on 3.

**3. A spawn block on the implementation agents.** Exports the guard predicate and
its wiring in the `tool_call` handler. Contract: a `subagent` call naming one of
the five agents is blocked when the checkout is not the resolved ticket branch,
with a reason naming both; a `subagent_launch` call for the same agents is
blocked on the same predicate; the ticket identity comes from the outer
arguments and from a key that embeds the slug; anything else passes untouched.
Depends on 1 for the resolver.

**6. Release mechanics behind a tool.** Exports the changesets wrapper and ships
`tw_release_plan` and `tw_release_apply`. Contract: the plan names pending
entries and the versions they produce; apply writes the manifest and the
changelog and removes consumed entries; the changelog renders through the
standalone changelog package regardless of what the repository's config names;
formatting is disabled; a missing manifest, a missing changeset config, and an
empty plan are distinct, named outcomes. Depends on 5 for the file contract.

**4. Branch behaviour in the workflow's prose.** Rewrites the phase prose and the
worker procedures, updates the chain's branch names and step keys, and adds the
profiles docs page. Contract: no phase file states a branch name; each states its
brief-and-gate sentence; the workers expect their branch; the chain merges a
ticket into the effort branch and no longer creates a landing branch; the
close-out merges into the trunk or hands off per settings. Depends on 2 and 3,
because it documents behaviour that must exist first.

**7. The release skill.** Adds the skill file, its bucket docs page, the manifest
entry, and both README lines. Contract: user-invoked only, calls the plan tool,
reports the plan, calls apply on confirmation, then follows the repository's
release document as prose. Those four surfaces are not the whole set: eight
derived pins fire alongside them, each one reading the manifest rather than a
list of its own, so a new promoted skill also needs a `promoted_skills` entry in
`docs/migration-target.yaml`, a route in
`skills/engineering/task-workflow-overview/SKILL.md`, a mention on
`docs/engineering/task-workflow-overview.md`, a new count in each of the two
`pi.skills.length` assertions, an entry in the `SKILL_FILES` list, an allowlist
entry in `SURVIVING_TOOLS` for any `tw_*` tool its prose names, and the
promoted-set docs-page tests to pass, which read the manifest for the page they
require. Depends on 6.

### Testing seam summary

Every ticket above is testable without a real repository except the two that
touch git, and those run against a temporary git repository through the injected
seam. The changeset tickets run against fixture repositories copied from this
one, with the command line tool available in the dev tree as the comparison
oracle. The promoted-set ticket is covered by the existing structure tests, which
check the manifest, the READMEs, the docs page, and the count pins together.

## Corrections recorded during implementation

### Trunk setting shape

The specification's configuration snippet shows `trunk` with a duplicate JSON
key (`develop` twice), which no parser can represent. The settled intent was three
values: a switch for whether the repository has a develop branch, and a name for
each of the two branches. Implementation resolves it without inventing a key:

```json
{ "trunk": { "develop": false, "main": "main" } }
```

`trunk.develop` is `false` or the develop branch's name. `false` means the
repository has no develop branch, so the trunk is `trunk.main`. A string means the
repository's develop branch is named that, so the trunk is `trunk.develop`. The
defaults are `{ "develop": false, "main": "main" }`, and the resolved trunk is
`trunk.develop === false ? trunk.main : trunk.develop`.

Validation accepts `false` or a non-empty string and rejects anything else,
including `true` and `""`, with a diagnostic that falls back to the default. A
consumer that needs the trunk name uses the expression above rather than reading
either key directly. The divergence is recorded in the ticket's
`## Divergence from plan` section.

### The phase brief answers for an implementation agent too

The phase creates each ticket's branch before it dispatches the chain, so the
phase must learn that branch's name. The only skill-reachable resolver is the
brief tool, and the first shape of it refused any name that was not a workflow
phase. It now also accepts an implementation agent's name and resolves that
agent's profile row, returning the ticket branch and the step that creates it off
the effort branch.

So a branch-bearing phase makes one call for its own brief, which names the effort
branch, and one call per ticket for the agent row, which names the ticket branch.
A phase brief never carries a second branch, because that would conflate two
profile rows. A name that is neither a phase nor a gated agent keeps the existing
refusal. This is a tool-surface addition the specification did not name, decided
during implementation and recorded in the ticket's `## Divergence from plan`.
