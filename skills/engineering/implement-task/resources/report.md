# Implement-task completion report

How the implementation phase ends a chain run with the human. One shape,
five parts, in this order: the parts do not move, and nothing is added to
them. The template is tuned to what ticket execution actually changes.

## 1. What is now true

Which tickets landed, and in one line each what now exists because of the
ticket: the ticket's behaviour, on the landing branch. The one
skill-specific line the shape allows is the frontier line: which tickets
remain and at which dependency level.

## 2. What needs the human

The decisions the run cannot make alone: a gate refusal needing a
re-resolution, a split that needs approval, or the escalation question once
retries are exhausted.

## 3. What to run next

The exact next step, one command: continue the frontier with the next
ticket's chain, or, when every ticket has landed, close the ticket out and
then wrap up the effort.

## 4. What is broken or blocked

Landings that did not happen, compact: the ticket, the step that failed, and
a one-line cause, one or two sentences. Never the chain's machine receipt.
Offer more on request.

## 5. One pointer to the detail

The landed ticket's ticket doc; the changelog entry and the commit are its
durable trail. For a whole-effort wrap-up, the effort's map and the review
artifact.
