# Task-workflow-overview completion report

How the overview ends a routing turn with the human. One shape, five parts,
in this order: the parts do not move, and nothing is added to them. The
template is tuned to what a routing answer actually is.

## 1. What is now true

The route found: which skill or flow fits the situation that was described.

## 2. What needs the human

The fact or choice only the human holds: which situation is the real one,
which of the fitting skills to take.

## 3. What to run next

The exact invocation, one command: the `/skill:<name>` call for the picked
skill.

## 4. What is broken or blocked

Workflow trouble the routing surfaced, compact: a broken command, a
missing skill, one or two sentences, or the word nothing.

## 5. One pointer to the detail

The picked skill's `SKILL.md`, or the phase-boundaries reference when the
question was about where one phase ends and the next starts.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
