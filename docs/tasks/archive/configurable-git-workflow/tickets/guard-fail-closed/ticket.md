---
type: ticket
subtype: bug
title: Refuse rather than pass when the checkout cannot be read
status: deprecated
workflow_state: done
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

## Implementation notes

### What landed

Both enforcement points now fail closed. When the git seam cannot read the
checkout, a phase open refuses in the openers' shape and a profile-gated spawn is
blocked with a reason, instead of passing with a diagnostic or a notification. A
readable-but-wrong branch and a detached checkout behave as before.

- `readCheckout` answers one cause line for both failure modes, and
  `unreadableCheckout()` builds the shared reason and recovery, so the opener and
  the spawn guard word the same condition identically.
- The open gates on that refusal and still carries the underlying cause in
  `details.diagnostics`. The spawn verdict returns a block with the cause in the
  decision.
- `docs/git-workflows.md` gained the refusal bullet and names `flat` for a
  directory that is not a git checkout.
- The architecture document lost the fail-open convention and gained a correction
  entry, so the living record matches the shipped rule.

### Lessons

- The two old tests that expected a seam-absent pass were replaced, not weakened:
  they now pin the refusal text, the legal next, and the carried cause.
- Naming `flat` as the escape hatch matters: without it, a repository that is not a
  git checkout has no profile that opens at all.
