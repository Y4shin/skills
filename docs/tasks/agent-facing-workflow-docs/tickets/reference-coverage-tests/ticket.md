---
type: ticket
subtype: feature
title: Reference coverage tests
status: deprecated
workflow_state: done
blocked_by:
- write-workflow-internals
- thread-reference-everywhere
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
   the architecture document) in every promoted SKILL.md, with exactly two
   exemptions: workflow-failure (must not reference itself) and nothing
   else; the task-workflow-overview line added by write-workflow-internals
   passes as any other surface does.
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

- `write-workflow-internals` (creates the internals resource and the
  overview sentence).
- `thread-reference-everywhere` (creates the sentence coverage the test
  asserts).

Superseded by reference-coverage-suite.
