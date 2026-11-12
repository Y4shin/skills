---
type: ticket
subtype: bug
title: Correct the shape module's docstring to state its real consumers
status: stable
workflow_state: ready
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
