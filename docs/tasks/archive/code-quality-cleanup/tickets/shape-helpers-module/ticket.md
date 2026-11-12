---
type: ticket
subtype: feature
title: Move the two generic shape guards into a module about shapes
status: deprecated
workflow_state: done
blocked_by: []
size: s
---

## What to build

The two generic shape guards stop living in the module about git branches and
start living in a module about shapes. The git resolver and the spawn guard both
import them from there, and nothing else changes: the same two functions, the
same behaviour, the same call sites inside the resolver and the guard.

Before this ticket, a reader who opens the git resolver to understand a branch
decision meets two generic type guards that have nothing to do with branches.
After it, the resolver imports what it needs from a module that imports nothing,
so the dependency direction is obvious and the helper is reusable by the tool
families the later tickets extract.

The one hazard to handle: a local variable named `text` exists in several
handlers. A module that imports the helper into a scope with a `text` local
shadows it, and the shadow typechecks because both are strings. Rename the
locals where that could happen, or keep those handlers out of files that import
the helper.

## Acceptance criteria

- [ ] One definition of each guard exists in the whole source tree, in a module
      that imports nothing.
- [ ] The git resolver and the spawn guard import both guards from that module
      and define neither.
- [ ] No test file changes.
- [ ] Both typechecks are clean and the whole suite is green.
- [ ] The tool surface, every refusal text, and every gate decision are
      unchanged.

## Blocked by

None (can start immediately).

## Implementation notes

### What landed

The two shape guards live in `src/core/shape.ts`, a module that imports nothing.
The git resolver and the spawn guard both import them from there and define
neither, so the resolver no longer exports a generic type guard.

The shadow hazard the ticket named was real and was fixed at its one site: the
profile reader's local `let text` became `let body`, because that file now
imports the helper. The remaining `text` locals are in the tool handlers, which
the later extraction tickets will keep out of files that import the helper.

### Lessons

- The structural criteria were verified with a throwaway check outside the repo
  rather than a committed test, and the ticket's own "no test file changes"
  criterion required that. A criterion that forbids a test cannot also be proven
  by a test; it is proven by reading the tree.
- The removed exports were inert because the resolver's only other importer was
  the spawn guard. A later module that reaches for a guard from the resolver now
  fails to compile, which is the point.
