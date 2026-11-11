# Implement-ticket completion report

How the implementation phase ends a run with the human. One shape, five
parts, in this order: the parts do not move, and nothing is added to them.
The template is tuned to what ticket execution and the inlined close-out
actually change. The shape covers completion, refusal, failure, and
escalation alike: in a failure, part 1 becomes "the ticket did not land and
the tree is unchanged", and part 2 carries the escalation question.

## 1. What is now true

Which tickets landed and closed out, and in one line each what now exists
because of the ticket: the ticket's behaviour on the effort branch,
its changelog entry, and its done-marking. The one skill-specific line the shape allows is the
frontier line: which tickets remain and at which dependency level.

## 2. What needs the human

The decisions the run cannot make alone: a gate refusal needing a
re-resolution, a split that needs approval, an uncertainty needing a
resolution, or the escalation question once retries are exhausted.

## 3. What to run next

The exact next step, one command: continue the frontier with the next
ticket's chain, or, when every ticket has landed and closed out, run the
end-of-effort pass and then hand off to `/skill:finalize-effort
<effort-slug>`.

## 4. What is broken or blocked

Landings and close-outs that did not happen, compact: the ticket, the step
that failed, and a one-line cause, one or two sentences. Never the chain's
machine receipt. Offer more on request.

## 5. One pointer to the detail

The closed-out ticket's ticket doc; the changelog entry and the merge
commit are its durable trail. For a whole-effort wrap-up, the effort's map
and the review artifact.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce. The chain's machine
result (its step receipt and refs) belongs to the failure toolbelt and the
retry pointer, never to this message. The spelling is simplified technical
English, compact, written for someone who did not watch the run, with the
qualified nouns (implementation ticket, planning task, the specification,
the architecture).
