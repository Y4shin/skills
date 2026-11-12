---
type: map
title: "Code-quality cleanup: the extension's tool file, shared helpers, and documentation ordering"
status: stable
origin_effort: configurable-git-workflow
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
  defines all 37 tools as one object literal, with the planning, ticket,
  gate, changeset, and release families interleaved by history rather than by
  concern.
- `package.json` declares the extension entry as `./src/pi.ts`, so the file's
  path is part of the package's published shape.
- The git resolver exports `text()` and `isObject()` (`src/core/git-profile.ts`
  lines 231 and 235) and `src/core/spawn-guard.ts` imports them, so the two
  modules already share one implementation. What remains is that two generic
  shape guards live in a module about branches.
- `src/pi.ts` line 3667 tells the changeset proposal and write outcomes apart
  with `(resolved as WriteOutcome).written`, a type assertion standing in for a
  discriminant field.
- `tests/skills.test.ts` reads `src/pi.ts` as one text and asserts counts
  inside it ("mechanical single homes"), `tests/platform-compat.test.ts` names
  it in an eol attribute check, and `tests/gate-factory.test.ts` names it in a
  comment that points at the passive tool set.
- The top-level README lists the promoted set under `### User-invoked` and
  `### Model-invoked`, and the test that guards those lists sorts both sides
  before comparing, so any ordering passes. The lists are bucket-grouped today
  by hand, and the last productivity entry sits out of alphabetical order.
- Baseline at `ef6d365`: 1588 tests pass, both typechecks are clean, the tree is
  clean.

## Fog

- Where the two shape helpers live once the split lands, and whether the spawn
  guard and the git resolver both import them from there.
- The shape of the discriminant that separates the changeset proposal from the
  write outcome: one field on one type, or two types the caller narrows.
- The README ordering rule: by bucket and then alphabetically inside each
  invocation group, or alphabetical across the whole group, and whether the two
  bucket READMEs follow the same rule.

## Decisions so far

- `split-seam` (grilling, settled): the split goes by family with a thin entry,
  and the four findings ship as one ticket each. Recorded in the task's Notes.
