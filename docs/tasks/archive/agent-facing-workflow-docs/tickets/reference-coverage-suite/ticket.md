---
type: ticket
subtype: feature
title: Reference coverage tests
status: deprecated
workflow_state: done
blocked_by:
- write-workflow-internals
- thread-reference-everywhere
- workflow-internals-reference
size: m
---

## What to build

Mechanical coverage tests that make the reference contract load-bearing, so
no future promoted skill, removed reference, or missing internals resource
can slip through silently. They extend the repo's existing structural test
suite (the suite that already derives promoted-skill expectations from the
package manifest), following its prior art rather than building a parallel
harness.

The checks assert:

1. Verbatim presence of the canonical reference sentence (as recorded in
   the architecture document) in every promoted SKILL.md, with exactly one
   exemption: workflow-failure (must not reference itself).
2. Verbatim presence of the same sentence in every subagent profile under
   agents/.
3. The internals resource exists under the task-workflow-overview skill and
   is referenced by name from that skill's SKILL.md and from the
   workflow-failure SKILL.md.
4. The canonical sentence in the test is the single source of truth: the
   test compares verbatim strings, never relaxed patterns.

The tests run as part of the existing suite and fail with messages that
name the offending file, so a maintainer sees exactly which surface lost
the line.

## Acceptance criteria

- [ ] Removing the sentence from any one covered file fails the suite with
      a message naming that file.
- [ ] Adding a new promoted skill without the sentence fails the suite.
- [ ] Removing or renaming the internals resource fails the suite.
- [ ] The suite is green on the tree as the prior tickets left it.
- [ ] The test asserts the exact canonical string; a paraphrase in a
      covered file fails.

## Blocked by

- `workflow-internals-reference` (creates the internals resource and the
  overview sentence).
- `thread-reference-everywhere` (creates the sentence coverage the test
  asserts).

## Implementation notes

Knowledge harvest: coverage contracts are strongest when the canonical string lives in exactly one constant and every check compares verbatim (includes/toContain), never a relaxed pattern; asserting the exemption's direction (the ladder must not carry the sentence) removes a silent pass-through where an inverted edit would stay green. Deriving the covered file list from the package manifest and from directory scans makes the suite self-extending: a newly promoted skill or agent profile is auto-covered without test edits, so failures name placement gaps rather than test staleness. When a test ticket's scope is tests/ only, commit scope discipline keeps RED/GREEN evidence reproducible from the ticket branch alone.

Landed: five coverage tests in tests/skills.test.ts (one CANONICAL_REFERENCE_SENTENCE constant, verbatim comparison only) assert promoted SKILL.md presence with workflow-failure the sole asserted exemption, agents/ profile coverage via directory scan, internals resource existence, and dual referencing from the overview and workflow-failure SKILL.md files. RED/GREEN demonstrated per criterion (sentence removal, paraphrase, resource rename, reference deletion, planted promotion). Full suite 1309 passed, 0 failed; typechecks clean.
