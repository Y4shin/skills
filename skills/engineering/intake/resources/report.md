# Intake completion report

How intake ends a run with the human. One shape, five parts, in this order:
the parts do not move, and nothing is added to them. The template is tuned
to what an intake run actually changes. The shape covers completion,
refusal, failure, and escalation alike: in a failure, part 1 becomes
"nothing was created and the tree is unchanged", and part 2 carries the
escalation question.

## 1. What is now true

The run's outcome in plain terms: the effort created (slug and title), the
one non-negotiables grilling task, the bug ticket for a bug report, and
whether the state pointers were set. Nothing else changed.

## 2. What needs the human

The answer the run is waiting on, or the word nothing.

## 3. What to run next

The exact next step, one command: `/skill:wayfinder <effort-slug>`.

## 4. What is broken or blocked

A refused creation (an existing effort, an unsafe slug) or an unresolved
classification, compact: what was refused and what would unblock it, one or
two sentences. Offer more on request instead of pasting it.

## 5. One pointer to the detail

The map: `docs/tasks/<effort>/map.md`. For the recorded facts, the
non-negotiables grilling task's `task.md`.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
vocabulary and no em-dashes. The report offers to expand: it states the
compact cause and offers more context on request; the offer is an offer,
never a dump.
