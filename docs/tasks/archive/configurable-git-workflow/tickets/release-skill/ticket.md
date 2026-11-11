---
type: ticket
subtype: feature
title: Ship the user-invoked release skill
status: deprecated
workflow_state: done
blocked_by:
- release-mechanics
size: s
---

## What to build

Typing the release command runs a promoted, user-invoked skill that previews the
pending changesets and the versions they produce, asks for confirmation, applies
the release, and then follows the repository's release document as prose when one
exists. It refuses and names what is missing when the repository has no manifest
or no changeset config, and it reports nothing to release without bumping.

## Acceptance criteria

- [ ] The skill is user-invoked, so the model cannot start it on its own.
- [ ] It calls the plan tool, reports the plan, and applies only after
      confirmation.
- [ ] It follows the repository's release document afterwards, treating that file
      as the authority for publishing.
- [ ] It refuses with the reason when the manifest or the changeset config is
      missing.
- [ ] It reports nothing to release without a version bump.
- [ ] It is wired into the promoted set: manifest entry, both READMEs, a bucket
      docs page, with the structure tests green.

## Blocked by

- `release-mechanics`, for the plan and apply tools it drives

## Implementation notes

### What landed

A promoted, user-invoked `release` skill, plus its wiring.

- The skill carries `disable-model-invocation: true`, so only the human can start
  it. It previews through the plan tool and reports the entries, versions, and
  changelog sections; asks for confirmation and then applies; and reads
  `docs/releasing.md` as the authority for the mechanical work of preparing and
  publishing when the repository has one.
- Two stopping outcomes: a missing manifest or changeset config is reported with
  the refusal's reason and nothing is created; an empty plan is reported as
  nothing to release, with no bump, no changelog section, and no entry consumed.
- It reports the apply's own answer rather than claiming the preview is what
  landed, because the apply recomputes the plan from the tree it writes.
- It performs no branch operations and never stages a changeset to force a release.
- Wiring: the bucket docs page, the manifest entry, both README lines, the
  migration target's promoted list, the overview skill and its docs page, the two
  skill-count pins, the skill-file list, and the surviving-tools list.

### Lessons

- The promoted-set wiring is eight surfaces, not the four the architecture's
  contract named, because derived pins read the manifest: the count pins, the
  overview route, the migration target, the skill-file list, and the surviving
  tools list all fail when only the four obvious ones are updated.
- The skill-count pins moved from 32 to 33, which is a reminder that a new promoted
  skill is never a single-file change.
