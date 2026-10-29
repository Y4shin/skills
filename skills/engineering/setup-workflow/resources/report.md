# Setup-workflow completion report

How setup-workflow ends a run with the human. One shape, five parts, in
this order: the parts do not move, and nothing is added to them. The
template is tuned to what bootstrapping and migration actually change.

## 1. What is now true

What the run created or updated: the workflow tree under `docs/tasks/`, the
state file and its schema version, the migration's outcome. Nothing else
changed.

## 2. What needs the human

The choice the run cannot make alone, usually nothing: a confirmation
before an overwrite, a follow-up only the human can run.

## 3. What to run next

The exact next step, one command: the re-run or check command, or the skill
that takes over on a working setup.

## 4. What is broken or blocked

What failed verification, compact: the refused or failed step and a
one-line cause, one or two sentences. A failed migration leaves the tree
untouched. Offer more on request.

## 5. One pointer to the detail

The upgrade guide the run followed under `resources/`, or the created
`docs/tasks/` tree for a first onboard.

Never inline in the message: subagent run ids, per-step receipts, output
references, harness counts, tool-call detail, raw chain JSON, and
workflow-internal terms the human did not introduce; all of it is reachable
behind the one pointer. The spelling is simplified technical English,
compact, written for someone who did not watch the run, with the qualified
nouns (planning task, implementation ticket, the specification, the
architecture).
