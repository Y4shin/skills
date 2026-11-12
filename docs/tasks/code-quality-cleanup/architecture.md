---
type: architecture
title: "Architecture: code-quality cleanup of the extension's tool file"
status: stable
---

## The specification's architecture decisions, in full

**Module families.** The split goes by tool family, with a thin entry. The entry
file keeps the extension entry point, the two `tool_call` handlers that compose
the write lockdown and the spawn guard, and a `createTools()` that spreads the
family factories into one record. Family factories live in their own module
directory: the read-only artifact inspectors, the effort and map tools, the
ticket lifecycle and state tools, the gate and phase tools, the changeset and
release tools, and the feedback and request tools. One support module holds the
helpers more than one family needs.

**The pins constrain the boundary.** Seven pattern counts in the suite read the
entry file as one string and assert how many times a definition and its call
sites appear. Two of them count call sites, so a definition and both its callers
must land in the same file: the effort-root writer must stay with the two
specification and architecture writers that call it, and the root-index writer
must stay with both the effort creation and the effort archive path. The
boundary follows the pins. Where a pin cannot survive as a single-file count, it
becomes a count over the whole source corpus rather than being deleted or
loosened into a membership check.

**Entry path and exports.** The manifest keeps naming the entry file, and the
entry file keeps exporting the extension entry point, the tool factory, and the
configuration-path helper, because sixteen test files import those three names
from it. A family module is never the package's entry.

**Shape helpers.** The two generic guards move out of the git resolver into a
module about shapes that imports nothing. The git resolver and the spawn guard
both import from it, and so does any family module that needs them. The module
sits under the core helpers, not under the tool modules, because the resolver
must not depend on the tools.

**Name collision.** Five local variables in the current tool handlers are named
`text`. A family module that imports the shape helper would shadow it inside
those handlers and the shadow would typecheck. Either those handlers stay in
files that do not import the helper, or the locals are renamed. A local rename is
not a behaviour change and is preferred.

**Changeset discriminant.** The changeset writer's two outcomes are told apart by
a field on the returned type, so the caller narrows instead of asserting. The
proposal outcome and the write outcome keep every field they have today; the
change adds the discriminant and removes the assertion at the call site.

**Documentation order.** The top-level README is bucket-grouped and alphabetical
inside each invocation group. The one entry that breaks the rule today moves.
The two bucket READMEs keep their authored flow order, because the engineering
list is deliberately in phase order, and they stay membership-checked. The test
that pins the top-level order compares the file's list unsorted against a sorted
expectation, following the pattern the suite already uses where it compares a
document's section order against its own sorted copy.

**The surface is proven, not asserted.** The suite already pins the ungated tool
surface by name and by count, the gated surface, each tool's disclosure set and
default active state, and the refusal texts through the tool factory. The split
needs no new gate: a green suite is the proof that the surface is unchanged.

## Module layout this effort produces

The tool record splits into seven family modules under one tool directory, plus
a support module for helpers two or more families need:

- **artifacts**: the read-only inspectors, which are the show, get, and list
  tools, the two finalizable checks, the dependency-level and frontier readers,
  and the context reader.
- **effort**: effort creation and archiving, planning-task creation, the map
  section writer and the map finalizer, the specification, architecture, and
  review writers. The root-index writer and the effort-root writer live here
  with all four of their callers, which is what the two call-site pins require.
- **tickets**: the ticket creator and splitter, the done and blocked markers,
  the uncertainty resolver, the changelog writer, the two note writers, the
  out-of-scope recorder, and the two state tools.
- **gates**: open, close, next, the phase brief, the migration tool, and the
  tool request.
- **release**: the changeset writer and the release plan and apply pair.
- **feedback**: the feedback recorder.
- **skill-creator**: the three bundled-script wrappers and the script runner
  they share.
- **support**: the helpers two or more families need, which after this effort
  are the refusal text builders and the artifact-title and slug helpers that
  more than one family reads.

`notify_user` stays defined in the entry beside the handler registration, because
it is the extension's own notification surface and not a workflow tool.

## Existing abstractions to use

- `src/core/git-profile.ts` already exports `phaseBrief`, `ticketBrief`,
  `closeBrief`, `gateDecision`, `decideFromBrief`, `decideFromClose`,
  `readCheckout`, `phaseText`, and `unreadableCheckout`. Every gate refusal goes
  through them; no family module re-derives a branch rule.
- `src/core/spawn-guard.ts` exports `spawnVerdict` and `isSpawnCall`. The entry's
  `tool_call` handler is their only caller.
- `src/disclosure.ts` decides what a phase discloses from a name list, so a
  tool's module location does not affect disclosure.
- `src/core/changesets.ts` exports `proposeEntries`, `writeEntries`, `Proposal`,
  and `WriteOutcome`. The discriminant lands on those two types.
- The suite's `corpusFiles` walk in `tests/skills.test.ts` is the existing way to
  read every source file; a pin that becomes a corpus count uses it rather than
  a new walk.
- The doc-page section-order check in `tests/skills.test.ts` compares positions
  against their own sorted copy and is the pattern the README order assertion
  copies.

## Do not reimplement

- Do not write a second branch resolver, a second spawn predicate, or a second
  refusal sentence builder. The gates family calls the git-profile exports.
- Do not add a registry, a tool descriptor table, or a decorator layer to make
  the families compose. The composition is one object spread in `createTools()`.
- Do not add a new source-file walk, a new README parser, or a new ordering
  comparator. Both exist in the suite.
- Do not re-declare `text` or `isObject` anywhere. After the first ticket there is
  one definition, in the shape module.
- Do not move `GATED_REGISTERED_TOOLS` or the skill-tool name list away from the
  entry: the registration branch in the entry reads them, and a test comment
  points at the entry as their home.

## Seams

- **The tool factory**: every behavioural test reaches tools through
  `createTools()` or the default export. That is the seam the split must keep
  identical, and the place where a missing tool shows up as a failing surface
  pin rather than a silent hole.
- **The extension entry**: `package.json` names it, a test pins that string,
  and sixteen test files import three names from it. The entry is the package's
  public shape, so the trim in the last ticket changes the entry's body and
  never its path or its exports.
- **The source-text pins**: seven pattern counts read the entry as one string.
  They are a seam between the tests and the file layout, and they are the one
  place a correct split can still fail the suite.
- **The changeset outcome**: the tool handler is the only place that tells a
  proposal from a write. After the discriminant lands, that distinction is a
  type-level seam.
- **The README lists**: `sectionBody` and `linkedSkills` in the suite grep for
  exact headings and link shapes. A reordering that changes a heading level or a
  link target throws or silently drops a skill from the comparison.

## Per-ticket contracts

**Ticket 1, shape helpers.** Creates the shape module with `text` and
`isObject` and nothing else, imports them in the git resolver and the spawn
guard, and leaves no definition behind. Hands every later ticket a single
import path for the two guards. Nothing else may import them yet.

**Ticket 2, changeset discriminant.** Adds the discriminant to `Proposal` and
`WriteOutcome` and narrows at the tool handler, deleting the assertion. Keeps
every existing field, so the changeset suite's assertions survive untouched.
Hands the split tickets a changeset module whose types no caller asserts.

**Ticket 3, README order.** Moves the one out-of-order entry and adds the order
assertion to the existing README test, deleting nothing from the membership
checks. Hands the later tickets a suite whose documentation pins are stronger,
not weaker.

**Ticket 4, extract the families.** Creates the seven family modules and the
support module, moves each tool definition and its private helpers into its
family, moves the two shared writers with all their callers, and leaves the entry
as thin re-exports plus the handler registration, so every existing import path
still resolves and the whole suite stays green. Rewrites the seven pins as corpus
counts that no longer name one file. Hands the last ticket an entry that is
wrappers only, and a corpus of source files where every definition has one home.

**Ticket 5, trim the entry.** Deletes the wrappers, imports the family factories
into `createTools()`, and leaves the entry with the extension entry point, the
two `tool_call` handlers, `notify_user`, the registration name lists, and the
composition. Keeps the three exports and the path. Hands the effort the
destination's shape: an entry file that holds the entry and the composition and
nothing else.

## What this effort does not build

No new tool, no behaviour change, no change to the bundled profiles or the gate
decisions, no change to the migration, changeset, repo-gate, or git-profile
internals, no new build step, and no change to the release script or the
workflows. The tool surface stays at 41 names, and the suite proves it.
