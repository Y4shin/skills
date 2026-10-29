# Triage completion report

How triage ends a session with the maintainer. One shape, five parts, in
this order: the parts do not move, and nothing is added to them. The
template is tuned to what a triage session actually changes. The shape
covers completion, refusal, failure, and escalation alike: in a failure,
part 1 becomes "nothing was triaged and the doc is unchanged", and part 2
carries the escalation question.

## 1. What is now true

The item's new category and state role, and what was appended to its doc:
the triage notes, or the agent brief. Nothing else changed.

## 2. What needs the human

What only the maintainer can answer or confirm: the state override, the
reporter's questions, the wontfix call.

## 3. What to run next

The exact next step, one command: the routed skill or the next item to
triage.

## 4. What is broken or blocked

What the session could not settle, compact: conflicting roles, a claim that
did not verify, a request too thin to brief, one or two sentences. Offer
more on request.

## 5. One pointer to the detail

The bug doc or task doc the session worked on; the notes and the brief live
there.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
