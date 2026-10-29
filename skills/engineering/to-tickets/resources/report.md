# To-tickets completion report

How to-tickets ends a phase with the human. One shape, five parts, in this
order: the parts do not move, and nothing is added to them. The template is
tuned to what the ticket phase actually produces.

## 1. What is now true

What the effort gained: the architecture document at
`docs/tasks/<effort>/architecture.md` (when the ticket graph needs one) and
the ticket graph under `docs/tasks/<effort>/tickets/`, with the ticket count
and the dependency levels. Nothing else changed.

## 2. What needs the human

The approval the phase is waiting on: the proposed breakdown, quiz included,
before any ticket is created. Otherwise the word nothing.

## 3. What to run next

The exact next step, one command: hand the effort to the implementation
phase, which implements the tickets in dependency order, one ticket at a
time.

## 4. What is broken or blocked

Refusals and unresolved splits, compact: a refused write (a missing or
unstable specification), a ticket too large to stay whole, one or two
sentences. Offer more on request.

## 5. One pointer to the detail

The architecture document, or, for a bug-only effort with no architecture
document, the effort's tickets directory.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
