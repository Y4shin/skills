---
type: ticket
subtype: feature
title: Rewire the phase prose, worker agents, and chain to the profiles
status: stable
workflow_state: ready
blocked_by:
- branch-gates
- spawn-block
size: m
---

## What to build

The workflow's prose stops stating a branch model and starts stating each phase's
brief-and-gate sentence. The worker agents stop creating branches and expect
theirs to be checked out. The chain merges a finished ticket into the effort
branch and no longer creates a landing branch. The effort close merges the effort
branch into the trunk, or hands off per settings. A docs page describes the two
profiles and the three settings keys.

## Acceptance criteria

- [ ] No phase file, worker agent, or chain script states a branch name or a
      merge flag as a fixed rule.
- [ ] The implementation phase states its branch step and the gate that follows
      it.
- [ ] The five worker agents state that their branch is already checked out.
- [ ] The chain merges a ticket branch into the effort branch and deletes it, and
      its host gates assert the resolved names.
- [ ] The effort close merges into the trunk with the profile's flag or, in
      handoff mode, pushes and prints the pull-request instruction with the
      branch and trunk names filled in.
- [ ] The docs page covers the two profiles, the three keys, and the refusal
      behaviour.
- [ ] The existing suite passes, including the prose guards.

## Blocked by

- `branch-gates`, because the prose describes behaviour that must already exist
- `spawn-block`, because the workers' expectation depends on the block
