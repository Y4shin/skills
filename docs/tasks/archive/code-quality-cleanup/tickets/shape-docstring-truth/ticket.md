---
type: ticket
subtype: bug
title: Correct the shape module's docstring to state its real consumers
status: deprecated
workflow_state: done
blocked_by: []
size: s
---

## What to build

The shape module's docstring tells a false story. It says the resolver, the spawn
guard, and the tool families all read a value the same way through this module,
but no tool family imports either guard. The families hand-roll the same trim at
roughly thirty-five sites, so the claim is not merely premature, it points away
from the duplication that exists.

Correct the docstring so it states what is true: the module holds the two generic
shape guards, imports nothing, and serves the modules that read an untrusted value
from a tool call or a config file. Name the duplication it does not cover, so the
next reader knows the families' hand-rolled trims are a known gap and not the
module's purpose.

Do not change behaviour, do not import the guards into the families, and do not
rewrite the hand-rolled trims: consolidating them is a separate change with its
own risk, and this ticket exists so the record does not lie about it.

## Acceptance criteria

- [ ] The shape module's docstring states only what is true about its consumers.
- [ ] The docstring names the families' hand-rolled trims as a known gap rather
      than implying the families use the module.
- [ ] No source file other than the shape module changes.
- [ ] Both typechecks are clean and the whole suite is green.
- [ ] The tool surface, the schemas, and the refusal texts are unchanged.

## Blocked by

None (can start immediately).

## Implementation notes

### What landed

The shape module's docstring now says what is true: its two consumers are the git
resolver, which reads a profile from a config file, and the spawn guard, which
reads a tool call's arguments. It names the families' hand-rolled trims as a known
gap and calls consolidating them a change of its own, so the next reader is not
told the module serves the tool families when it does not.

Three pins hold the claim: the module's importers, read out of the source corpus,
are exactly those two files with no tool module among them; the docstring does not
present the families as readers; and the docstring names the gap. A family that
later imports the guards fails the first pin and is forced to rewrite the
docstring.

### Lessons

- A docstring is a claim, and a claim about who calls a module is testable from the
  corpus. This effort made three such claims and the review caught one that was
  false; pinning the importer list turns the next one into a failing test.
- The finding arrived through the advisory review after the effort's tickets were
  closed, which is the review doing its job on the effort's own output rather than
  on the code it inherited.
