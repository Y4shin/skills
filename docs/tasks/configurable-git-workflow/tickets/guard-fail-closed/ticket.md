---
type: ticket
subtype: bug
title: Refuse rather than pass when the checkout cannot be read
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

When the checkout cannot be read, the guards refuse instead of passing. Today a
missing git seam or a failing git command lets the phase open and lets the spawn
proceed with only a diagnostic, which contradicts the map's non-negotiable that
guards block and do not warn.

## Acceptance criteria

- [ ] Opening a phase whose brief carries a branch refuses when the checkout
      cannot be read, in the existing refusal shape, with a reason naming what
      could not be read. The diagnostic still reports the cause.
- [ ] A spawn of a profile-gated agent is blocked on the same condition, with a
      reason, instead of passing with a notification.
- [ ] A readable but wrong branch still refuses, naming the current branch, the
      required branch, and the step that creates it; a detached checkout still
      refuses as no branch.
- [ ] Tests cover a missing seam, a git that fails, a detached checkout, a wrong
      branch, and the passing case, for both the opener and the spawn block.
- [ ] Every test that relied on a seam-absent pass injects a readable fake
      instead, and the full suite is green.

## Blocked by

None (can start immediately)
