---
type: ticket
subtype: feature
title: Ship the user-invoked release skill
status: stable
workflow_state: ready
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
