---
type: task
subtype: grilling
title: Settle where the feature branch merges back into the starting branch
status: stable
workflow_state: done
blocked_by:
- profile-schema
---

## Decision to settle

Where and when the effort's feature branch merges back into the starting branch,
who performs it, and what the guard requires at that moment.

## Why this needs deciding

Making a dedicated feature branch unconditional (settled in
`non-negotiables`) leaves the workflow with a branch whose end is unspecified.
Today the last ticket's landing branch is where the effort stops, and this
repo's release expects `main`. Without a decision, an effort finishes with all
its work sitting on a feature branch and nothing that says how it reaches the
starting branch.

## Choices

1. **Finalize-effort close-out**: after the archive commit, `finalize-effort`
   merges the feature branch into the starting branch (no fast-forward) and
   pushes per the push policy. One owner, one place.
2. **The release skill**: the merge to the starting branch is part of preparing
   a release, on the argument that releasing is the act that moves `main`.
3. **A human step**: the skill reports the ready feature branch and the human
   merges, so the last git action of an effort is always deliberate.
4. **A knob**: a profile setting naming the phase that merges, defaulting to one
   of the above.

## Recommended starting answer

Finalize-effort's close-out merges the feature branch into the starting branch
and pushes per policy, and the release skill owns nothing about branches. The
reason: an effort that has passed its whole-effort review is done, and leaving
`main` behind means a later effort starts from a base that does not contain the
previous one.

## Downstream

The profile matrix (`profile-schema`) decides what `finalize-effort`'s branch
template says, so this settles together with it. The spec's close-out steps
follow.

## Notes

## Round settled (operator's answers)

- **Who merges**: `finalize-effort`'s close-out merges the effort branch into the
  trunk, after the archive commit and the review triage, and pushes per policy.
- **A protected trunk is declared through a settings key**, not a profile field:
  `taskWorkflow.git.trunkMerge`, `"local"` by default, `"handoff"` for a repo
  that forbids a local merge. The operator's framing: the settings key "modifies
  what the built-in profile uses as the instructions that it uses for the steps
  that would do the merging". No merge instruction is written into the skills;
  the profiles carry the merge step and the resolver turns the setting into the
  instruction.
- **Handoff behaviour**: skip the merge and the branch deletion, push the effort
  branch when the push policy allows, and print the pull-request instruction with
  the branch and trunk names filled in.
- An unknown `trunkMerge` value is a diagnostic and falls back to `local`, the way
  the repo gate treats malformed settings.

## Consequence for dependents

The release skill owns nothing about branches: it consumes changesets and follows
`docs/releasing.md`, and the merge stays in `finalize-effort`. The profile's
merge step must be written so the resolver can produce both local and handoff
instructions from the same entry, which is a constraint on the spec's resolver
and on the profile JSON shape.
