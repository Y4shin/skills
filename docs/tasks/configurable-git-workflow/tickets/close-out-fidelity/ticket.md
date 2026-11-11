---
type: ticket
subtype: bug
title: Make the close-out push follow the policy and enforce the closing gate
status: stable
workflow_state: done
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

## Implementation notes

### What landed

The close-out and the profile now mean what they say.

- The push step is rendered from the policy, not written in the prose: the brief's
  result text carries a `Push step:` line that names a push command only when the
  policy is `always` and the phase carries a branch, and an explicit "none"
  sentence with no command in every other case. `flat` names no policy, so it never
  pushes.
- The implementation phase's close-out lost its fenced push block and defers to
  that line; the effort close says to push when the line names a command and names
  the branch from the trunk-merge mode.
- The prose guard now bans a push command in every phase file, worker agent, and
  chain script, so a hand-written push cannot come back.
- `tw_close` enforces the profile row's closing gate through a new close brief and
  decision, sharing the openers' refusal wording so an open refusal and a close
  refusal word the same condition identically. It refuses before any state
  mutation, and the close takes the effort and ticket it needs to resolve a
  template.

### Lessons

- A gate whose template needs a value must receive that value: the close now takes
  the same pair the brief does, because `{effort}` cannot be resolved from a skill
  name alone.
- Banning a shape in the prose guard forces the data route. The push command moved
  from the skill file into a rendered line, which is the same move the merge flag
  made earlier.
