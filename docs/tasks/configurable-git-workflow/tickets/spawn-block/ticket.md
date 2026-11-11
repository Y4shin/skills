---
type: ticket
subtype: feature
title: Block implementation agent spawns on the wrong ticket branch
status: stable
workflow_state: ready
blocked_by:
- profile-data-and-phase-briefs
size: m
---

## What to build

Dispatching the implementation chain while the checkout is not the ticket's
branch fails that step before any child starts, and the failure names the required
branch. A dispatch on the correct branch proceeds untouched, and calls that are
not one of the five implementation agents are never blocked.

## Acceptance criteria

- [ ] A `subagent` call naming one of the five implementation agents is blocked
      when the checkout is not the resolved ticket branch.
- [ ] The block carries a reason naming the current and the required branch.
- [ ] The per-child launch for the same agents is blocked by the same predicate,
      using a step key that embeds the ticket slug.
- [ ] The chain's step keys embed the ticket slug, so the identity survives into
      the per-child call where the arguments do not.
- [ ] Calls for any other agent, and calls with no resolvable ticket identity,
      pass untouched.
- [ ] A blocked chain step fails that step; the session continues.
- [ ] Tests cover both surfaces, the pass-through cases, and the missing-identity
      case.

## Blocked by

- `profile-data-and-phase-briefs`, for the resolver that decides the required
  branch
