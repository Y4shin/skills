---
type: ticket
subtype: feature
title: Refuse the two branch-bearing phases from the wrong branch
status: stable
workflow_state: ready
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
