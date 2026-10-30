# Finalize-effort completion report

How finalize-effort ends a run with the human. One shape, five parts, in
this order: the parts do not move, and nothing is added to them. The
template is tuned to what the effort close actually changes. The shape
covers completion, refusal, failure, and escalation alike: in a failure,
part 1 becomes "the effort did not archive and the tree is unchanged", and
part 2 carries the escalation question.

## 1. What is now true

Whether the effort archived, and where it now lives. The review artifact:
how many findings it recorded and how each disposition class came out
(implementation tickets in the current effort, accepted follow-ups,
informational acceptances), with the follow-up effort slugs a follow-up
produced. The code did not change: the review is read-only toward it.

## 2. What needs the human

The decisions the run cannot make alone: a finding that needs an
out-of-scope or large disposition, the yes that creates a follow-up, or the
escalation question when the run cannot proceed. The word nothing once every
finding is dispositioned and the effort archived.

## 3. What to run next

The exact next step, one command: `/skill:implement-ticket <effort-slug>`
when the triage put new implementation tickets in the current effort,
`/skill:wayfinder <follow-up-slug>` when an accepted follow-up is the next
work, or `/skill:intake` when the finding belongs to a new effort. Say
archived and done when the effort archived.

## 4. What is broken or blocked

What kept the effort from archiving, compact: the review artifact that still
carries a finding without a disposition, a follow-up the human has not
answered yet, or a refused archive, one or two sentences. Offer more on
request.

## 5. One pointer to the detail

The review artifact at `docs/tasks/<effort>/review.md`, or its archived
path, with the map beside it. For a displaced finding, the follow-up
effort's own review artifact is the pointer.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce. All of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (implementation ticket, planning task, the specification, the
architecture, the review artifact).
