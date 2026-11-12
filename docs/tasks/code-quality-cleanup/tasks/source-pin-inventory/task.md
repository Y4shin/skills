---
type: task
subtype: research
title: Inventory the suite's coupling to the extension's tool file and the shared helpers
status: stable
workflow_state: ready
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
