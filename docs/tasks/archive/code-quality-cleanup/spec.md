---
type: spec
title: "Code-quality cleanup: split the extension's tool file and enforce the documentation order"
status: stable
---

## Problem Statement

The package's Pi extension lives in one 4501-line file. It holds artifact
resolution, the scan layer, the state helpers, the opener gate, the review
helpers, the write lockdown, the extension entry, and the definitions of all 41
tools the extension registers. A maintainer who wants to change one tool family
reads past four unrelated families to find it, and a model editing the file
carries all of it into context to change one refusal sentence.

Three smaller problems came with it. Two generic shape guards live in a module
about git branches, because that is where the resolver that first needed them
sits. The changeset writer tells its proposal outcome and its write outcome apart
with a type assertion, so a caller that gets the wrong one fails at runtime
rather than at the type level. And the top-level README lists the promoted skills
in an order nothing enforces: the test that guards those lists sorts both sides
before comparing, so a maintainer can append an entry anywhere and the suite
still passes.

All four were recorded as open findings by the archived effort
`configurable-git-workflow` and handed to this effort. None of them is a
behaviour defect. The workflow this package enforces works, and this effort
exists so the code that enforces it stays readable.

## Solution

The extension's tool file becomes an entry file plus one module per tool family.
The entry keeps the extension entry point, the two `tool_call` handlers, and a
`createTools()` that composes the family factories into the same tool record it
returns today. Each family module owns its tools and the helpers only that family
uses, so a reader who knows which tool they want knows which file to open.

The two shape guards move to a module about shapes, below both the git resolver
and the tool modules that need them. The changeset writer returns a discriminated
outcome, so the caller narrows on a field instead of asserting a type. The
top-level README gains an enforced order: bucket-grouped, then alphabetical
inside each invocation group, and the test that compares the lists stops sorting
the file's side so a wrong order fails.

None of this changes what the extension does. The tool names, their argument
schemas, their refusal wording, their disclosure sets, the bundled profile data,
and every gate decision stay exactly as they are, and the existing behavioural
gates prove it.

## User Stories

1. As the package maintainer, I want the extension file to hold only the entry
   and the composition, so that I can read the extension's wiring in one place
   without scrolling past forty tool definitions.
2. As the package maintainer, I want one module per tool family, so that a
   change to the release tools touches only the release module.
3. As the package maintainer, I want each tool family's private helpers to sit
   beside the tools that use them, so that a helper shared by two families is the
   only helper I have to think about.
4. As a model editing the extension, I want the tool family's file to be small
   enough to read whole, so that I do not load four unrelated families into
   context to change one refusal sentence.
5. As a reviewer, I want the split to preserve every tool definition byte for
   byte in meaning, so that I can verify the change by reading diffs of moved
   code rather than re-reading logic.
6. As the package maintainer, I want the extension entry to stay at the path the
   manifest names, so that installing the package does not change and a reader
   finds the entry where the documentation points.
7. As the test suite's maintainer, I want the tests that import the extension's
   public functions to keep working without a new import path, so that the split
   does not touch sixteen test files for a reason unrelated to their subject.
8. As the package maintainer, I want the two shape guards to live in a module
   about shapes, so that reading the git resolver does not require reading a
   generic type guard.
9. As the package maintainer, I want the shape module to sit below both the core
   modules and the tool modules, so that neither depends on the other through a
   helper.
10. As a model editing a tool handler, I want a name collision between the shape
    helper and a local variable to be impossible to miss, so that a shadowed
    helper cannot typecheck its way into the tree.
11. As a caller of the changeset writer, I want the proposal outcome and the
    write outcome to be told apart by a field, so that the compiler refuses a
    call that reads the wrong one.
12. As a reviewer, I want no type assertion left where a discriminant will do, so
    that the type system carries the guarantee instead of a comment.
13. As the package maintainer, I want the changeset writer's public shape to
    change only in the way the assertion removal requires, so that its tests keep
    their subject.
14. As a maintainer adding a new tool family, I want the pattern for a family
    module to be obvious from the existing ones, so that the next feature does
    not land in the entry file.
15. As a reader of the top-level README, I want the skill lists ordered by one
    rule, so that I can find a skill by scanning rather than by reading every
    line.
16. As the package maintainer, I want the ordering rule stated where the lists
    live, so that the next contributor does not have to infer it from the data.
17. As the package maintainer, I want the test that guards those lists to fail on
    a wrong order, so that the rule survives the next append.
18. As the maintainer of the two bucket READMEs, I want their authored order
    preserved, so that the engineering bucket stays in the order a reader walks
    the phases.
19. As the package maintainer, I want every existing behavioural gate to stay
    green through the split, so that "no behaviour change" is proven rather than
    asserted.
20. As a reviewer, I want the tool surface pinned by name and by count, so that
    the split cannot quietly add, drop, or rename a tool.
21. As a reviewer, I want the source-text pins that must survive to follow the
    code into its new files, so that the drift guards they exist for are still
    guarding something.
22. As the package maintainer, I want both typechecks and the whole suite green
    after each implementation ticket, so that a bisect names the ticket that
    broke it.
23. As the operator of the workflow, I want this effort to author its changeset
    like any other, so that the cleanup appears in the package's changelog.

## Implementation Decisions

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

## Testing Decisions

A good test here observes what the extension does, not how the source is
arranged. The suite already reaches every tool through the factory, so the
behavioural coverage comes for free: the ungated surface pin, the gated surface
pin, the tool count, the disclosure sets, the argument schemas, and the refusal
texts all run through `createTools()` or the default export.

Three kinds of test change with this effort, and each has prior art in the suite:

- **Documentation order.** Prior art is the doc-page section check that compares
  a document's section positions against their own sorted copy. The README check
  keeps its membership assertion for both files and gains an order assertion for
  the top-level lists, comparing the file's order against a sorted expectation
  without sorting the file's side.
- **Corpus-wide source pins.** Prior art is the suite's corpus file walk, used by
  the em-dash sweep and the identifier sweep. A pin that can no longer be a
  single-file count becomes a count over that walk, so it still fails when a
  second copy appears.
- **The changeset outcome.** Prior art is the changeset suite's existing
  outcome assertions. They keep their subjects and gain a case that reads the
  narrowing field, so a caller that gets the wrong outcome fails to compile
  rather than failing at runtime.

The modules under test are the changeset writer, the git resolver's import
surface, and the README comparison. The split itself is verified by the
unchanged behavioural suite, plus the seven pins after they follow the code.

## Out of Scope

No new tools, no removed tools, no renamed tools, and no changed argument schema.
No restructuring of the core modules beyond moving the two shape helpers: the
migration, changeset, repo-gate, and git-profile internals stay where they are.
No comment or formatting churn on lines the work does not otherwise touch. No
dependency changes and no change to the build, the release script, or the
workflows. No abstraction layer for its own sake: the split is plain files and
plain functions composed in one place.

## Further Notes

The baseline for the effort is 1588 passing tests with both typechecks clean. The
work is four implementation tickets in dependency order: the shape helpers first,
then the changeset discriminant, then the README order, then the split, which
cites the coupling inventory the planning phase produced.

The README ordering rule is the one decision this effort's planning settled
without asking: it keeps today's intent, which is bucket grouping with
alphabetical order inside each group, and fixes the single entry that breaks it,
rather than reordering the two bucket READMEs whose order is deliberate.

The effort's review artifact still carries the two findings it inherited as
undispositioned. They become the implementation tickets of this effort, and the
finalize pass will record that.

> The architecture content in this specification is archival: the living architecture document is [architecture.md](architecture.md); update it there, not here.
