# Workflow-failure completion report

How the ladder ends a run that stopped on a snag. One shape, five parts, in
this order: the parts do not move, and nothing is added to them. The shape
covers completion, refusal, failure, and escalation alike: in an escalation,
part 1 states where the run stopped and that the snag itself changed
nothing, and part 2 carries the escalation question the operator must
decide. The report ends the run; the ask lives in part 2, and nothing waits
on the answer mid-run.

## 1. What is now true

Where the work stands: what the run completed before the snag, and the fact
that the refused step activated nothing. The snag changed no files; the
`tw_*` tools are the only writers of the tree, and none of them performed
the refused write.

## 2. What needs the human

The escalation: the one decision only the operator can make, stated in
their terms, with the options the refusal and the ladder leave open. This
is a decision, not a status update; phrase it so a yes or a no is possible.

## 3. What to run next

The exact next step once the decision lands: the named skill or the named
tool call, one command. If the decision gates everything, say that this
step waits on part 2.

## 4. What is broken or blocked

The failed step and the refusal reason, compact: which rung the walk
stopped on and which rungs ran clean, one or two sentences. Offer more on
request.

## 5. One pointer to the detail

Where the evidence lives: the refusal output, the internals reference under
`task-workflow-overview`, or the doctor resource that names the route.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
