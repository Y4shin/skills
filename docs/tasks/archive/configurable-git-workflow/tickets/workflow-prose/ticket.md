---
type: ticket
subtype: feature
title: Rewire the phase prose, worker agents, and chain to the profiles
status: deprecated
workflow_state: done
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

## Implementation notes

### What landed

The workflow's prose now takes every branch name, merge flag, and trunk from the profile instead of stating them.

- A new prose guard test reads the sixteen phase, resource, and chain files plus the five worker agents and bans five shapes per file: branch literals, branch interpolations, the `{effort}` and `{ticket}` templates, the trunk names, and the merge flags. Nothing is exempted, so a phase that restates a branch name fails the suite.
- The implementation phase's first action is the brief; the open refusal is described as the branch half of the gate; per ticket the phase asks the brief for the worker's row, creates and checks out the branch itself, and dispatches with the branch names and the merge flag in the chain arguments.
- The five worker agents state that their branch is already checked out. The TDD worker no longer creates one; the deviation reporter diffs against the base its task names; the land worker checks out the merge target, merges, and deletes the ticket branch.
- The chain merges a ticket branch into the effort branch and its host gates assert the names it was handed.
- The effort close lands the effort branch on the trunk with the profile's flag, or hands off per settings.
- A new documentation page describes the two profiles, the three settings keys, and the refusal behaviour.

### Lessons

- The deviation report caught a real defect in the data: the profile stored `"no-ff"` without dashes, so the rendered merge step was `git merge no-ff <branch>`, which fails. The fix belongs in the profile value (`--no-ff`) and is accompanied by a test that a bundled profile's merge value is a complete flag.
- `tw_phase_brief` now answers for an implementation agent, which the specification did not name. The phase therefore makes one call for its own effort branch and one per ticket for the ticket branch, and a phase brief never carries two branches.
- The brief also carries the trunk and the trunk-merge mode, so the close-out never restates them.
