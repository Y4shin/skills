---
type: ticket
subtype: feature
title: Order the README's skill lists by a rule the suite enforces
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

The top-level README's two skill lists become ordered by a rule the suite
enforces. Today the test that guards those lists sorts both sides before
comparing, so any order passes and one entry already sits out of place.

After this ticket, the lists are bucket-grouped and alphabetical inside each
invocation group, the stray entry moves to where the rule puts it, the rule is
stated where the lists live, and the test compares the file's order against a
sorted expectation without sorting the file's side. The two bucket READMEs keep
their authored order and their membership checks: the engineering list is in
phase order on purpose.

## Acceptance criteria

- [ ] The top-level README's user-invoked and model-invoked lists are each
      bucket-grouped and alphabetical, and the one entry that breaks the rule has
      moved.
- [ ] The rule is stated in the README where a contributor reads the lists.
- [ ] The test fails when two adjacent entries are swapped, and it still asserts
      membership for the top-level README and both bucket READMEs.
- [ ] The bucket READMEs' order and their headings are unchanged, so the
      existing section greps still resolve.
- [ ] The whole suite is green.

## Blocked by

None (can start immediately).
