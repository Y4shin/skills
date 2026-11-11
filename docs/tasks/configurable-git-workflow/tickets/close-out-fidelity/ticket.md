---
type: ticket
subtype: bug
title: Make the close-out push follow the policy and enforce the closing gate
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

The close-out and the profile mean what they say. Two gaps: the effort close's
push block runs an unconditional push while its own sentence says a policy of
never means nothing is pushed, and the profile's `closeGate` is carried, resolved,
and reported by nothing enforced.

## Acceptance criteria

- [ ] The effort close's push step follows the profile's push policy: with
      `never`, no push command appears at all; with `always`, the push is part of
      the step; the prose and the block agree.
- [ ] The closing branch gate is enforced when a phase closes: closing a phase
      whose profile row carries a close gate while the checkout is not that branch
      refuses in the existing shape, naming the required branch.
- [ ] The close gate does not latch: after checking the branch out, a retry
      closes.
- [ ] The planning phases and `flat` are unaffected, because their rows carry no
      close gate.
- [ ] Tests cover the push policy branches in the prose guard or its own test, and
      the close gate's pass, refuse, and retry.
- [ ] The architecture document's note that the close gate is unenforced is
      removed.

## Blocked by

None (can start immediately)
