---
type: task
subtype: research
title: Inventory the suite's coupling to the extension's tool file and the shared helpers
status: stable
workflow_state: done
blocked_by: []
---

## The question

Which tests and modules couple to `src/pi.ts` as one text, to
`src/core/git-profile.ts` for the two shape helpers, and to the top-level
README's skill lists, and what does each coupling assert?

## Why it matters

A split of `src/pi.ts` moves function definitions across files. A test that
counts a function definition in that one file fails after the split, and the
cheap repair (delete the pin) loses the drift guard it exists for. The same is
true of the two shape helpers: moving them changes who imports them. The
inventory turns "update the pins" into a list of named assertions with a stated
new home.

## What to gather

1. Every read of `src/pi.ts` in `tests/`, with the assertion it feeds. Known
   sites to start from: `tests/skills.test.ts` (the "mechanical single homes"
   block reads the file as one string and counts patterns in it),
   `tests/platform-compat.test.ts` (names it in an eol attribute check),
   `tests/gate-factory.test.ts` (names it in a comment about the passive tool
   set), `tests/tw-migrate-tool.test.ts` (refers to `createTools()` by path in a
   comment).
2. Every import of `text` and `isObject` from `src/core/git-profile.ts`, and
   whether any module defines its own copy.
3. Every test that reads the top-level README or the bucket READMEs, with what
   it asserts about ordering, and whether it sorts before comparing.
4. Any test or script that names a source file by path (a corpus sweep, a
   packaging check, a size check), since those lists need the new files added.

## Acceptance

A note that names each coupling site, the assertion, and what it must become
after the split, grouped so a ticket can cite it. No changes to code or tests.

## Notes

### Question

What couples to `src/pi.ts` as one text, to the two shape helpers in the git
resolver, and to the three README skill lists, and what does each coupling
assert?

### Evidence (read at `85d6763`, no repository change made)

Seven pattern counts run against `src/pi.ts` read as one string, in
`tests/skills.test.ts` from line 4288 ("mechanical single homes"): the
`writeEffortRootArtifact` definition, its title fallback, its create-or-refuse
sentence, and a `>= 3` count of its call sites; `writeTasksIndex`'s definition
and its call sites; and the per-ticket close-out counts. Patterns 4 and 7 are
the sharp ones: a `>= 3` count survives a two-caller arrangement only if the
definition and both callers land in one file, which makes the family boundary a
real constraint rather than a taste.

The suite imports `../src/pi.js` from sixteen files, for `default`,
`createTools`, and `notifyConfigPath`. So the file must keep all three exports
whatever moves, `package.json` pins `./src/pi.ts` as the entry, and a test pins
that string.

Neither shape helper reaches `src/pi.ts` today: only `git-profile.ts` (its own
four uses) and `spawn-guard.ts` import them, no test imports them, and no module
holds a private copy. The hazard is different from the map's wording: five
`const text = ...` locals live in the tool file (lines 133, 297, 2131, 2150,
3926), and a group module that imports the helper would shadow it inside those
handlers with no type error, because both are strings.

The three READMEs agree on bucket grouping and on the heading levels that the
test helper greps for, and disagree on order: the top-level list is
bucket-grouped and alphabetical except that `operator-communication` sits last
in the model-invoked group; the engineering bucket list is deliberately in phase
order; the productivity bucket list is alphabetical except for the same entry.
Both comparison tests sort both sides, so no order is enforced anywhere. The
repo already has an order-enforcing pattern to copy at `tests/skills.test.ts`
3264, where doc-page sections are compared against their own sorted copy.

The tool surface is gated behaviourally, not textually: the full 41-name ungated
surface, the gated surface, the count, the disclosure sets, and every refusal
text all run through the factory, so a split needs no new gate. The "37 tools"
figure in the map is the `tw_*` subset; the suite's count is 41 because it
includes the three `skill_*` tools and `notify_user`.

### Recommendation

One caveat a ticket author must carry: `writeTasksIndex` has two call sites,
creation and archiving, so a shared effort-lifecycle module keeps patterns 5 to
7 single-file. If a group split puts those callers in different files, the pins
must become corpus counts over `src/**/*.ts` rather than be deleted.
