---
type: architecture
title: "Architecture: code-quality cleanup of the extension's tool file"
status: stable
---

## The specification's architecture decisions, as built

**Module families.** The tool record is seven family modules under `src/tools/`,
each exporting one factory that returns its share of the record, plus one
support module for the helpers and plumbing two or more families read. The entry
file (`src/pi.ts`, 578 lines) keeps the extension entry point, the gate
detection and the registration loop, the `tool_call` hook that composes the write
lockdown and the spawn guard, the session-start diagnostics and peer warnings,
the skill-invocation filter and the transcript replay, `notify_user`, the two
registration name lists, and a `createTools()` that is one object literal of
seven spreads. Gate state is the one thing the composition passes down:
`tw_open`'s parameter schema narrows when the repository is gated, so
`createTools(gated)` hands it to `gateTools(gated)` and every other family takes
no argument.

**The pins constrain the boundary.** The seven pattern counts in the suite now
count over the whole source corpus through `SOURCE_CORPUS`, `countInSource`, and
`sourceFilesWith`, built on the existing `corpusFiles` walk, so no pin names a
file. The two call-site pins got stronger on the way: each resolves the module
that holds the writer definition and requires the call sites inside that same
module, which is what the single-file counts were standing in for, and the
root-index pin gained a call-site floor it never had. Both writers therefore sit
in `src/tools/effort.ts` with their callers, the effort-root writer beside
`tw_write_spec` and `tw_write_architecture`, the root-index writer beside
`tw_create_effort` and `tw_archive_effort`.

**Entry path and exports.** The manifest still names `./src/pi.ts`, and the entry
still exports the extension entry point (`default`), the tool factory
(`createTools`), and the configuration-path helper (`notifyConfigPath`), because
sixteen test files import those three names from it. A family module is never
the package's entry. The entry re-exported all 34 tool definitions for the length
of one ticket, while the families landed as named constants; the trim deleted
those re-exports and the name enumeration, and no re-export shim survives for a
tool definition.

**Shape helpers.** `src/core/shape.ts` holds `text` and `isObject`, imports
nothing, and has exactly two consumers: the git resolver and the spawn guard
import from it and define neither. The resolver no longer exports either guard,
so a later module that reaches for a type guard from a branch module fails to
compile. The plan expected tool families to import them as they needed them; no
family ever did, and the guards stayed a core concern.

**Name collision.** The hazard was real and narrower than the inventory counted.
Five `text` locals sat in the pre-move entry and a sixth in the git resolver, and
the sixth is the one that mattered, because that file imports the helper now:
`readProfile`'s `let text` became `let body`. The locals that survive sit in
`src/tools/gates.ts`, `src/tools/artifacts.ts`, and `src/tools/support.ts`, all
in modules that do not import the helper, so nothing is shadowed today. A family
module that later imports `text` must rename them first, because a shadowed
helper typechecks.

**Changeset discriminant.** `Proposal` carries `kind: "proposal"` and
`WriteOutcome` carries `kind: "write"`, and every constructor sets its literal:
`proposeEntries`, the resolver's success return, the refusal builder, and both
write returns. The internal `ResolvedProposal` inherits the proposal literal
through `Proposal`, so the refusal path needed no second constructor change. The
tool handler reads `resolved.kind === "write" ? resolved.written : []` and holds
no type assertion. Every other field and every printed line is unchanged, and
the discriminant stays off the tool's `details` object, so the visible surface
did not grow. The `dryRun` flag still drives the printed branches, so one
question has two sources: they cannot disagree under the current call shape, and
collapsing them into a single read belongs to a later change.

**Documentation order.** The top-level README's lists are bucket-grouped and then
in dictionary order with hyphens ignored, stated in the README's `## Skills`
intro, and one entry moved: `operator-communication`, to the head of the
model-invoked productivity group. The collation is the correction the effort
made. A raw string sort puts `engineering/code-review` before
`engineering/codebase-design`, because a hyphen precedes every letter, which
would have moved a second entry and read wrongly to a human. One local helper,
`dictionaryOrder`, in the suite's documentation describe block, expresses the
order, and the top-level test compares the file's list unsorted against it, so an
adjacent swap fails. The bucket READMEs keep their authored flow order, because
the engineering list is deliberately in phase order, and they stay
membership-checked, with each side normalizing through the same helper. The
rule's prose has its own pin. The doc-page section-order check sorts positions
rather than names, so it supplied the pattern and not the comparator.

**The surface is proven, not asserted.** The suite still pins the ungated tool
surface by name and by count, the gated surface, each tool's disclosure set and
default active state, and the refusal texts through the tool factory, and the
effort added no behavioural gate: a green suite with 40 `createTools()` keys plus
`notify_user` is the proof that the surface is unchanged. What the effort did add
is structural. Four pins landed with the extraction, one of them holding
`Object.keys(createTools())` at 40 and one asserting the entry calls no `def(`,
and ten landed with the trim, asserting that each family is a factory, that the
entry imports only factories, that the composition is seven spreads, that no
re-export shim survives, that the handlers and the name lists are still there,
and that the entry exports three names. They assert the destination shape, and
none of them loosens a pin that was already in the suite.

## Module layout this effort produced

The tool record lives in seven family modules under `src/tools/`, each exporting
one factory, plus a support module for what two or more families need:

- **artifacts**: the read-only inspectors, which are the show, get, and list
  tools, the two finalizable checks, the dependency-level and frontier readers,
  and the context reader. Exports `artifactTools()`.
- **effort**: effort creation and archiving, planning-task creation, the map
  section writer and the map finalizer, the specification, architecture, and
  review writers, and both pinned writers with all of their callers. Exports
  `effortTools()`.
- **tickets**: the ticket creator and splitter, the done and blocked markers,
  the uncertainty resolver, the changelog writer, the two note writers, the
  out-of-scope recorder, and the two state tools. Exports `ticketTools()`.
- **gates**: open, close, next, the phase brief, the migration tool, and the
  tool request. Exports `gateTools(gated)`, the one factory that takes an
  argument.
- **release**: the changeset writer and the release plan and apply pair. Exports
  `releaseTools()`.
- **feedback**: the feedback recorder. Exports `feedbackTools()`.
- **skill-creator**: the three bundled-script wrappers and the script runner
  they share. Exports `skillCreatorTools()`, and `SKILL_SCRIPTS_DIR` carries one
  extra `..` because the module sits a directory deeper than the entry did.
- **support**: the tool record's types, the definition and argument helpers every
  family builds its tools with, the artifact-tree plumbing and the file I/O
  beneath it (the root walk, the resolver, the scan memo, the state readers, the
  shape and ready-flag guards), the refusal text builders, the artifact-title
  reader, and the feedback sender. All seven families and the entry import it.
  That list is a sample and not an inventory: the rule is "two or more families
  read it", and the artifact-tree plumbing qualifies because every family reads
  the tree through it. The alternative was a ninth module, and the layout has no
  room for one. The slug helpers did not move here: they stayed in
  `src/core/slug.ts`, and `tickets.ts` and `effort.ts` import `slugRejection`
  from it.

`notify_user` stays defined in the entry beside the handler registration, because
it is the extension's own notification surface and not a workflow tool.

One import points back at the entry. `src/tools/gates.ts` imports `createTools`
from `../pi.js`, because `tw_request_tool` refuses a tool this package does not
register and reads the factory's own record to know the names. It is the tree's
only cycle, safe because the binding is a hoisted function declaration read when
a tool runs, and it is why the composition stays in the entry.

## Existing abstractions, as used

- `src/core/git-profile.ts` exports `phaseBrief`, `ticketBrief`, `closeBrief`,
  `gateDecision`, `decideFromBrief`, `decideFromClose`, `readCheckout`,
  `phaseText`, and `unreadableCheckout`, and it no longer exports the two shape
  guards. The gates family reads the branch and refusal exports, and the support
  module reads its `GitRun` type; no family re-derives a branch rule.
- `src/core/shape.ts` exports `text` and `isObject` and imports nothing. Its two
  consumers are the git resolver and the spawn guard.
- `src/core/spawn-guard.ts` exports `spawnVerdict` and `isSpawnCall`. The entry's
  `tool_call` hook is their only caller.
- `src/disclosure.ts` decides what a phase discloses from a name list, so a
  tool's module location does not affect disclosure. The gates family imports its
  open and close machinery, and the entry imports the two registration name
  lists.
- `src/core/changesets.ts` exports `proposeEntries`, `writeEntries`, `Proposal`,
  and `WriteOutcome`, and the two outcome types carry `kind`.
- The suite's `corpusFiles` walk in `tests/skills.test.ts` is the existing way to
  read every source file, and the effort's pins reach it through the three
  helpers it gained: `SOURCE_CORPUS`, `countInSource`, and `sourceFilesWith`.
- `sectionBody` and `linkedSkills` read the README lists, and `dictionaryOrder`
  is the collation the top-level order check and both membership checks use. The
  doc-page section-order check, which compares positions against their own sorted
  copy, supplied the pattern rather than the comparator.

## Do not reimplement

- Do not write a second branch resolver, a second spawn predicate, or a second
  refusal sentence builder. The gates family calls the git-profile exports.
- Do not add a registry, a tool descriptor table, or a decorator layer to make
  the families compose. The composition is one object literal of seven spreads.
- Do not add a new source-file walk or a new README parser. Both exist in the
  suite, and the pins reach the walk through `SOURCE_CORPUS` and its two
  companions.
- Do not write a second ordering comparator. `dictionaryOrder` in the suite is
  the one name comparator, and a new list check reuses it. This is the single
  place the plan's "both exist in the suite" was wrong: the prior art compares
  positions, not names, so the comparator had to be written once.
- Do not re-declare `text` or `isObject` anywhere. One definition exists, in
  `src/core/shape.ts`.
- Do not move `GATED_REGISTERED_TOOLS` or the skill-tool name list away from the
  entry: the registration branch in the entry reads them, and a test comment
  points at the entry as their home.

## Seams

- **The tool factory**: every behavioural test reaches tools through
  `createTools()` or the default export. It kept its name, its shape, and its
  default argument, so the split is invisible through it, and a missing tool
  still shows up as a failing surface pin rather than a silent hole.
- **The extension entry**: `package.json` names it, a test pins that string, and
  sixteen test files import three names from it. The trim changed the entry's body
  and never its path or its exports.
- **The source-text pins**: the seven pattern counts that read the entry as one
  string are corpus counts now, and the structural pins added by the extraction
  and the trim read the entry's imports, its spread count, and the absence of a
  `def(` call. They are a seam between the tests and the file layout, and they
  are the one place a correct split can still fail the suite.
- **The gate state**: `createTools(gated)` is the composition's only parameter,
  passed to `gateTools(gated)` because `tw_open`'s schema narrows under a gated
  repository. Computing gate state anywhere else would let the opener's schema
  disagree with the registration loop.
- **The entry import cycle**: `src/tools/gates.ts` reads `createTools()` from
  `../pi.js` at call time. Moving the composition out of the entry moves that
  import with it.
- **The changeset outcome**: the tool handler is the only place that tells a
  proposal from a write, and it reads `kind` now. `dryRun` still drives the
  printed branches, so a call shape that handed a proposal to the non-dry-run
  path would print write text over an empty `written`.
- **The README lists**: `sectionBody` and `linkedSkills` grep for exact headings
  and link shapes, and `dictionaryOrder` is the collation both the file's side and
  the expectation use. A reordering that changes a heading level or a link target
  still throws or silently drops a skill from the comparison.

## Per-ticket contracts, as delivered

**Ticket 1, shape helpers (`shape-helpers-module`).** Created `src/core/shape.ts`
with `text` and `isObject` and nothing else, imported them in the git resolver and
the spawn guard, and left no definition behind: the resolver no longer exports
either guard, and nothing else imported them. It renamed one local,
`readProfile`'s `let text` to `let body`, because that file imports the helper
now. Because the ticket forbade test changes, the "one definition" property was
checked by reading the tree rather than by a committed test, and the corpus pins
in ticket 4 are the first suite-level guard against a second copy. The
`blocked_by` edge ticket 4 took from this ticket, "the extracted families import
the shape guards", turned out to be false, so the edge serialized two tickets
that could have run in parallel.

**Ticket 2, changeset discriminant.** Added `kind` to `Proposal` and
`WriteOutcome`, set the literal in every constructor, narrowed at the tool
handler, deleted the assertion, and kept every existing field so the changeset
suite's assertions kept their subjects. `tests/changesets.test.ts` gained a `the
changeset outcome` block that reads the discriminant and reads `proposal.written`
under `@ts-expect-error`, so half the criterion lives in `typecheck:tests` rather
than in the vitest run. The discriminant stays off the tool's `details`.

**Ticket 3, README order.** Moved the one out-of-order entry and added the order
assertion to the existing README test, deleting nothing from the membership
checks. The collation is hyphen-insensitive dictionary order, which is why
exactly one entry was out of place. The two bucket README tests normalize through
the same helper and stay membership-only, proven by a mutation that reorders the
engineering README and leaves the suite green. One test beyond the contract pins
the `## Skills` rule prose, which is what the criterion to state the rule where
the lists live needed.

**Ticket 4, extract the families (`extract-tool-families`).** Created the seven
family modules and the support module, moved each tool definition and its private
helpers into its family, moved the two shared writers with all their callers, and
left the entry as thin re-exports plus the handlers and the registration lists, so
every existing import path still resolved and the whole suite stayed green. The
seven pins became corpus counts, both call-site pins were strengthened, and four
structural pins landed. It did not reach the planned shape on its own: the
families landed as 34 named tool constants and the entry enumerated them, so the
entry was 616 lines of wiring plus re-exports, a state the trim replaced.
`src/tools/gates.ts` took its import of `createTools`, the tree's only cycle, and
`SKILL_SCRIPTS_DIR` gained one `..`.

**Ticket 5, trim the entry (`trim-the-entry`).** Converted the six
named-constant families to factories, which its own wording did not name and the
extraction's deviation report had flagged, then deleted the wrappers, imported the
factories into `createTools()`, and left the entry at 578 lines holding the
extension entry point, the `tool_call` hook, the session-start and
skill-invocation handlers, `notify_user`, the two registration name lists, and the
composition. It kept the three exports and the path, and added ten structural
pins. Registration order is family-grouped now: 18 of 40 positions differ from the
pre-effort order, nothing pins order, and every surface assertion sorts.

## What this effort did not build

No new tool, no behaviour change, no change to the bundled profiles or the gate
decisions, no change to the migration, changeset, repo-gate, or git-profile
internals, no new build step, and no change to the release script or the
workflows. The tool surface is the same 41 names (40 from `createTools()` plus
`notify_user`), with the same schemas and the same refusal texts, and the suite
proves it. The one observable difference is the order of the ungated registration
listing, which is family-grouped now; no test pins order, and tools resolve by
name. No ticket authored a changeset entry: no ticket contract asked for one, and
the effort's own entry belongs to the effort close.
