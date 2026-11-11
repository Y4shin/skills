---
type: ticket
subtype: feature
title: Refuse the two branch-bearing phases from the wrong branch
status: stable
workflow_state: done
blocked_by:
- profile-data-and-phase-briefs
size: m
---

## What to build

Opening the implementation phase or the effort close on the wrong branch is
refused, naming the branch to create and the step to retry. After the branch
exists, the same open passes and the phase receives its instructions. In this
repository, opening the implementation phase on the trunk refuses with the effort
branch to create; after creating it, the open succeeds and the opening
instructions arrive in the result.

## Acceptance criteria

- [ ] The tool context can run a git command against the session directory,
      injected so tests need no repository.
- [ ] The implementation phase's open refuses unless the checkout is the resolved
      effort branch.
- [ ] The effort close's open refuses on the same condition.
- [ ] The refusal names the current branch, the required branch, and the next
      legal call, in the existing refusal shape.
- [ ] A retry after creating the branch passes; nothing is latched.
- [ ] Opening and closing instruction text from the profile reaches the model as
      the tool result.
- [ ] Both openers declare sequential execution mode.
- [ ] Tests drive the opens with a fake context and a fake git seam, covering
      pass, refuse, and retry.

## Blocked by

- `profile-data-and-phase-briefs`, for the resolver that decides the required
  branch

## Implementation notes

### What landed

The two branch-bearing phases now refuse to open from the wrong checkout, and the
profile's instruction text arrives through the open and close results.

- A git execution seam in the tool context (`ToolContext.git`) runs one command,
  `git rev-parse --abbrev-ref HEAD`, against the session directory. Tests inject a
  fake, so no gate test needs a repository.
- One generic branch gate in the open compares the checkout with the branch the
  profile resolves for that phase. Under the bundled `default` profile that is
  exactly the implementation phase and the effort close, because no other phase
  row carries a branch; under an operator profile it is whichever phases do. No
  phase name appears in the gate.
- Off the branch, the open refuses in the existing shape, naming the current
  branch, the required branch, and the step that creates it, and carrying
  `required_branch` in the details. Nothing latches, so creating the branch and
  retrying passes.
- Opening instructions arrive in the open result and closing instructions in the
  close result. Both openers declare sequential execution mode.

### Lessons

- The gate is written as "a phase the profile gives a branch", not as an
  enumeration of two phases. Ticket 3 and ticket 4 should use the same phrasing or
  the prose will contradict a custom profile.
- The open's details payload grew: it now always carries the required branch (or
  its absence), the profile name, and diagnostics. Consumers that assert the exact
  details shape need updating if they pin it.
- The suite is green at 1441 tests. With `.codegraph` removed from the checkout the
  corpus sweeps are clean, so the gate now runs unmodified.
