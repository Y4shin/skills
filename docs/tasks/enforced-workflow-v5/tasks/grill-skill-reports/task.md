---
type: task
subtype: grilling
title: What a skill reports when it finishes
status: stable
workflow_state: ready
blocked_by: []
---

# What a skill reports when it finishes

## Decision to settle

The report contract for every workflow skill: what the human is told when a
skill finishes its work, in what shape, at what level of detail, and where the
detail lives when it is needed. The recurring failure is that completion
reports read as a wall of execution-internal text: run ids, step receipts,
output references, harness counts, and workflow jargon, with the context
missing, so the human cannot tell what changed, what needs a decision, or what
to do next. The first concrete instance: after one implementation ticket's
chain finishes, the report describes the chain rather than telling the human
what is now true and what to run next.

## Parent decisions it depends on

None. It consumes the settled vocabulary (the specification, the architecture,
planning task, implementation ticket) but does not depend on another open
decision.

## Choices already known

- The audience: the human operator, who did not watch execution and cannot be
  assumed to hold the run ids, refs, or internal terms in their head. The
  executing agent is not the audience.
- What counts as actionable: what is now true that was not before (state
  changes), what needs a human decision, what is blocked or failed, and the
  exact next commands to run.
- What is noise when it is not asked for: subagent run ids, per-step receipts,
  raw output references, harness counts, tool-call detail, and workflow
  internals. Whether any of it may appear inline at all, or only behind a
  pointer.
- Where the detail lives: chat prose only, a report artifact, or prose that
  points at an artifact. Failure and escalation reports are in scope too, and
  they are the ones most likely to be walls of text.
- Whether the contract is one shared template every skill follows or a
  per-skill shape.
- Whether reports stay prose discipline (documented and reviewed) or become
  gated or checked somehow. Note that a final chat message is not a
  precondition-checkable artifact, so the enforcement pillar may not apply.
- Whether the vocabulary qualifier rule (planning task, implementation ticket,
  the specification, the architecture) applies to reports, and how it squares
  with plain, short prose.

## Recommended starting answer

One shared report contract, in this order, short:

1. What is now true: the state change and the artifacts that exist now.
2. What needs the human: decisions, approvals, or nothing.
3. What to run next: the exact commands, at most a few.
4. What is broken or blocked, with the smallest useful cause.
5. A single pointer to the detail artifact, if any.

The test for whether the report is good: the human can act on it without
reading anything else, and without asking what anything means. Executing-agent
detail is never inlined; it is a pointer. The contract covers normal
completion, refusals, failures, and escalations. It stays prose discipline
(documented in each skill and reviewed), because a chat message cannot be
gated the way a tool call can. Vocabulary qualifiers apply only where they
remove ambiguity, never as ceremony.

## Downstream work it may create

A shared report reference the skills point at; a report section in each of the
workflow skills; a review criterion in `code-review` or `skill-review`; the
effort's final documentation re-sync ticket; possibly a change to how the
per-ticket chain and end-of-effort workflows return their results to the
parent, if the parent's report currently can only mirror the chain's internals.
