---
type: task
subtype: grilling
title: Settle the refactoring pressure rubric and who applies it
status: stable
workflow_state: ready
blocked_by: []
---

## Decision to settle

The prose guide that tells the agent how to choose a refactoring pressure value
of 1, 2 or 3, and the rules around applying it.

Settled already, and not open here: the value is an integer 1 to 3 with no zero,
the default threshold is 9, the value sits in the effort's `review.md` front
matter with an evidence section in its body, and `docs/tasks/state.yaml` holds
the contributing archived efforts.

## Choices already known

- The operator rejected a zero because a model that can say "nothing to see
  here" will say it, and wrongly opening a refactoring conversation every ninth
  effort is the cheaper failure.
- Pressure comes from concrete signs of harder future changes: one
  responsibility becoming scattered, parallel implementations emerging, a
  boundary accumulating workarounds. Feature size is context, not pressure.
- The example cases from the session: three heavy efforts reach 9, and nine light
  efforts also reach 9. Both must feel right.

## What this session must pin down

- The three levels, as sentences a worker can apply to a diff without guessing:
  what it sees at level 1, at 2, at 3, and what it must be able to point at in
  the diff to claim each.
- Who sets the value and when: the agent proposes and the operator confirms, or
  the operator sets it, or the review produces it and the operator rejects it.
  The current `finalize-effort` flow matters here.
- What the evidence block in the review contains, at minimum.
- The wording of the `tw_feedback` question about signal quality, and the kind
  name. A dedicated kind is decided; its spelling is not.
- What happens when a value cannot be agreed: block, default, or ask.
- The single notification on threshold crossing: what it says and where it goes.

## Recommended starting answer

Three levels defined by observable facts in the diff rather than by feeling:
level 1, new functionality lands inside units that already own that
responsibility; level 2, one responsibility is now split across units or a second
implementation of the same concept appears; level 3, a boundary is being worked
around (a caller reaches an implementation detail, or a new edge contradicts a
declared direction). The agent proposes, the operator confirms or amends in one
question, and disagreement is recorded as feedback rather than argued.

## Downstream work this may create

The review writer needs a front-matter key and a section; `state.yaml` needs the
contributing list; `finalize-effort` needs the confirmation step and the
threshold check; and the feedback path needs the new kind.
