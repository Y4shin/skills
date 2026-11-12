---
type: ticket
subtype: feature
title: Order the README's skill lists by a rule the suite enforces
status: stable
workflow_state: done
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

## Implementation notes

### What landed

The model-invoked list's stray entry (`operator-communication`) moved to the head
of its productivity group, the `## Skills` section now states the rule where a
contributor reads the lists, and the top-level test compares the file's order
unsorted, so a swapped pair fails.

### Accepted divergence: a hyphen-insensitive comparator

The chain hit a real conflict and the phase decided it. The rule as written said
"alphabetical", and the suite's existing expectation sorts with plain string
order, where a hyphen precedes every letter. Under that order
`engineering/code-review` sorts before `engineering/codebase-design`, so obeying
it literally would move a second entry and produce a list that reads as wrong to
a human, while the map claims one entry moves.

The decision: order by dictionary order with hyphens ignored, through one named
helper in the test. Only the genuinely misplaced entry moved, the README reads
naturally, and the membership assertions are unchanged. The helper is not the
doc-page section comparator, which compares positions rather than names, so the
architecture's do-not-reimplement line does not cover it. The architecture
document should record the comparator at the end-of-effort reconcile.

### Lessons

- An ordering rule stated as "alphabetical" is ambiguous until it names its
  collation. The prose in the README now states the rule, and the test names the
  collation, which is where the ambiguity belonged.
- A strengthened comparison can surface a second violation that the finding did
  not predict. That is the pin working, not the ticket failing.
