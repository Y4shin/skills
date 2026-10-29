# To-spec completion report

How to-spec ends a run with the human. One shape, five parts, in this order:
the parts do not move, and nothing is added to them. The template is tuned
to what the spec phase actually produces. The shape covers completion,
refusal, failure, and escalation alike: in a failure, part 1 becomes "no
specification was written and nothing else changed", and part 2 carries the
escalation question.

## 1. What is now true

The specification exists at `docs/tasks/<effort>/spec.md`, with its status
(draft, or stable once approved). Nothing else changed.

## 2. What needs the human

The approval the run is waiting on while the spec is a draft, or the word
nothing once it is stable.

## 3. What to run next

The exact next step, one command: `/skill:to-tickets <effort-slug>` once
the specification is stable.

## 4. What is broken or blocked

What kept the specification from being written or approved, compact: a
refused open (the map is not ready; the pointer points back to Wayfinder),
an open decision, one or two sentences. Offer more on request.

## 5. One pointer to the detail

The specification: `docs/tasks/<effort>/spec.md`.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
