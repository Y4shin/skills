---
type: map
title: "Code-quality cleanup: the extension's tool file, shared helpers, and documentation ordering"
status: deprecated
origin_effort: configurable-git-workflow
ready_for_spec: true
---
# Code-quality cleanup: the extension's tool file, shared helpers, and documentation ordering

## Destination

The extension's tool file is small enough to hold in the head, the helpers it
shares with the resolver live where a shared helper belongs, the changeset
writer tells its two outcomes apart with a field rather than an assertion, and
the README's skill lists are ordered by a rule the suite enforces instead of
only being checked for membership.

These are the four open findings the archived effort `configurable-git-workflow`
handed over. Nothing in this effort changes behaviour: the tool surface, the
refusal wording, and the profile data stay exactly as they are.

## Constraints

- No behaviour change. Every tool keeps its name, its argument schema, its
  refusal wording, and its disclosure set; the profile data and the gate
  decisions are untouched.
- The extension entry stays `./src/pi.ts`, because `package.json` names it and a
  reader looks for the entry where the manifest points.
- A test that reads source text follows the code into its new home. No pin is
  deleted, and none is weakened into a membership check that passes either way.
- Both typechecks stay clean and the whole suite stays green after every ticket.
- The repository's own rules hold: no em-dashes in prose, and a promoted skill's
  docs page is re-synced if its behaviour changes (no skill behaviour changes
  here).

## Non-goals

- No new tools, no removed tools, no renamed tools, no changed argument schema.
- No restructuring of `src/core/` beyond moving the two shape helpers: the
  migrate, changeset, repo-gate, and git-profile internals stay where they are.
- No comment or formatting churn on lines the work does not otherwise touch.
- No dependency changes and no change to the build, the release script, or the
  workflows.
- No new abstraction layer for its own sake: a module split is allowed to be
  plain files and plain functions composed in one place.

## Non-negotiable facts

**Success test:** `src/pi.ts` holds the extension entry and the composition of
the tool groups and nothing else, the four handed-over findings are closed, and
the suite is green with the public surface identical: the same 37 `tw_*` tools,
the same argument schemas, and the same refusal texts.

- `src/pi.ts` is 4501 lines. `createTools()` runs from line 2003 to 4116 and
  defines all 37 `tw_*` tools as one object literal, beside the three `skill_*`
  tools, with the planning, ticket, gate, changeset, and release families
  interleaved by history rather than by concern.
- The suite's whole ungated surface is 41 names: the 37 `tw_*` tools, the three
  `skill_*` tools, and `notify_user`, which the extension entry defines outside
  `createTools()`. An existing test pins that surface by name and by count, so a
  split that changes it fails without any new gate.
- `package.json` declares the extension entry as `./src/pi.ts`, so the file's
  path is part of the package's published shape, and sixteen test files import
  `default`, `createTools`, or `notifyConfigPath` from `../src/pi.js`.
- The git resolver exports `text()` and `isObject()` (`src/core/git-profile.ts`
  lines 231 and 235), and the only other importer is
  `src/core/spawn-guard.ts`. No test imports them and no module keeps a copy, so
  what remains is that two generic shape guards live in a module about branches.
- Five local variables in the tool handlers are named `text` (`src/pi.ts` lines
  133, 297, 2131, 2150, 3926). A group module that imports the helper would
  shadow it inside those handlers, and a local `const text` is a string, so the
  mistake typechecks.
- `src/pi.ts` line 3667 tells the changeset proposal and write outcomes apart
  with `(resolved as WriteOutcome).written`, a type assertion standing in for a
  discriminant field.
- `tests/skills.test.ts` reads `src/pi.ts` as one text and asserts seven pattern
  counts inside it ("mechanical single homes"), and
  `tests/platform-compat.test.ts` names it in an eol attribute check. The seven
  counts are the only assertions in the suite that break when a definition
  changes file.
- The top-level README lists the promoted set under `### User-invoked` and
  `### Model-invoked`, and the test that guards those lists sorts both sides
  before comparing, so any ordering passes. Both lists are bucket-grouped by
  hand; the model-invoked group ends with `operator-communication` out of
  alphabetical order.
- Baseline at `ef6d365`: 1588 tests pass, both typechecks are clean, and the
  tree is clean at `6cdfd79`.

## Fog

## Decisions so far

- `split-seam` (grilling, settled): the split goes by family with a thin entry,
  and the four findings ship as one ticket each. Recorded in the task's Notes.
- `source-pin-inventory` (research): the suite's coupling is seven pattern
  counts in `tests/skills.test.ts` read from `src/pi.ts` as one string, sixteen
  files importing `../src/pi.js` for `default`, `createTools`, and
  `notifyConfigPath`, and nothing else. The tool surface is gated behaviourally,
  so a split needs no new gate. Recorded in the task's Notes.
- The family boundary is constrained by two of those counts. A `>= 3` call-site
  count keeps its number only if a definition and both its callers share a file,
  so `writeEffortRootArtifact` and its two writers stay together, and
  `writeTasksIndex` and both its callers (effort creation, effort archive) stay
  together. The split follows the pins rather than the pins being loosened.
- The two shape helpers move to `src/core/shape.ts`, and `git-profile.ts` and
  `spawn-guard.ts` import them from there. The inventory settled the argument:
  both importers are in `src/core`, so a helper module under `src/tools/` would
  invert the dependency. `src/pi.ts` never imports them.
- The changeset discriminant is a field on the outcome type that tells the
  proposal from the write, replacing the `resolved as WriteOutcome` assertion,
  so a caller narrows instead of asserting. The exact spelling belongs to the
  ticket.
- The README rule: the top-level list is bucket-grouped and alphabetical inside
  each invocation group, which is what it nearly does today and the one stray
  entry (`operator-communication` last in the model-invoked group) is fixed to
  match. The bucket READMEs keep their authored flow order, because the
  engineering list is deliberately phase-ordered, and they stay
  membership-checked. The test that pins the top-level order compares an
  unsorted list against a sorted expectation, following the pattern already in
  the suite at `tests/skills.test.ts` line 3264.
