# Task-workflow-doctor completion report

How the doctor ends a diagnosis with the human. One shape, five parts, in
this order: the parts do not move, and nothing is added to them. The
template is tuned to what a diagnosis actually produces. The shape covers
completion, refusal, failure, and escalation alike: in a failure, part 1
becomes "no diagnosis was found and nothing changed", and part 2 carries
the escalation question.

## 1. What is now true

The diagnosis: the artifact that is missing or misconfigured, and what is
ruled out. The doctor does not fix, so nothing changed.

## 2. What needs the human

The manual step only the human can perform, or the go-ahead for the routed
fix.

## 3. What to run next

The exact next step, one command: the routed skill or the manual step.

## 4. What is broken or blocked

What could not be diagnosed, compact: the checks that ran clean, the
symptom that has no matching cause, one or two sentences. Offer more on
request.

## 5. One pointer to the detail

The matching resource under `resources/`, which carries the cause and the
route.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
