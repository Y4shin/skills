# Wayfinder completion report

How Wayfinder ends a pass with the human. One shape, five parts, in this
order: the parts do not move, and nothing is added to them. The template is
tuned to what a bounded pass actually changes.

## 1. What is now true

The pass's outcome in plain terms: which planning tasks moved to done,
what the write-back added to the map, and whether the ready flag is set.
Nothing else changed.

## 2. What needs the human

The decision or confirmation the pass is waiting on, or the word nothing.

## 3. What to run next

The exact next step, one command: `/skill:wayfinder <effort-slug>` for the
next pass, or `/skill:to-spec <effort-slug>` when the map is ready.

## 4. What is broken or blocked

Blocked and refused planning work, compact: the blocked task, the refusal's
message (for example, what the reconcile tool names as missing), one or two
sentences. Offer more on request instead of pasting it.

## 5. One pointer to the detail

The map: `docs/tasks/<effort>/map.md`. For a single task's detail, that
task's `task.md`.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
