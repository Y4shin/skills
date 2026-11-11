---
type: ticket
subtype: feature
title: Block implementation agent spawns on the wrong ticket branch
status: stable
workflow_state: done
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

## Implementation notes

### What landed

The implementation chain now refuses to start from the wrong checkout, and the
refusal names the branch it wants.

- `src/core/spawn-guard.ts` holds the decision: `spawnIdentity` reads what a call
  says, `spawnVerdict` decides through the same resolver the phase gate uses, and
  `ticketFromKey` reads the slug after the last `@` in a step key.
- The guard is profile-driven, not an enumeration: what the profile gates is what
  the guard gates. Under `default` that is the five implementation agents, under
  `flat` nothing, and an agent the profile does not name resolves no branch. No
  agent name appears in a branch of code.
- Two surfaces, one predicate. The outer surface is a `subagent` call naming a
  gated agent, or a workflow launch whose arguments carry a ticket (the real
  dispatch names no child). The per-child surface is `subagent_launch`, whose
  ticket comes from the step key.
- The existing `tool_call` handler now runs the write lockdown first and the spawn
  guard second, still one handler. A refusal returns `{ block: true, reason }`, so
  a blocked child fails its step and the session continues. An unreadable checkout
  passes with a notification rather than blocking on a missing fact.

### Lessons

- The chain script's step keys now embed the ticket slug after an `@` separator,
  and the separator is pinned by a test against the guard's constant, so the two
  cannot drift silently.
- The guard is async because it reads the checkout, which makes the `tool_call`
  handler async; the write lockdown stays synchronous and first.
- Prose in later tickets should say "a phase or agent the profile gates", never an
  enumeration of five agents, or it will contradict a custom profile.
