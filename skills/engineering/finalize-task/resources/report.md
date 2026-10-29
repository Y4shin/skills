# Finalize-task completion report

How the close-out ends a run with the human. One shape, five parts, in this
order: the parts do not move, and nothing is added to them. The template is
tuned to what the close-out actually changes.

## 1. What is now true

The ticket is done and its trail exists: the changelog entry, the merge to
main. When the effort is finished, the effort is archived as a unit.

## 2. What needs the human

The closing decision the run cannot make alone, or the word nothing.

## 3. What to run next

The exact next step, one command: the next ticket's close-out, or nothing
when the effort is closed.

## 4. What is broken or blocked

What stopped the close-out, compact: the gate that is red, the ticket whose
merge is refused, and a one-line cause, one or two sentences. Offer more on
request.

## 5. One pointer to the detail

The changelog entry in `docs/tasks/CHANGELOG.md`; it names the landed
ticket and the commit.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce. The landing's machine
result stays in the failure toolbelt, never in the message. The spelling is
simplified technical English, compact, written for someone who did not
watch the run, with the qualified nouns (implementation ticket, planning
task, the specification, the architecture).
