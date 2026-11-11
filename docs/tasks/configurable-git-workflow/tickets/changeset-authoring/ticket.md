---
type: ticket
subtype: feature
title: Propose and write changesets at effort close
status: stable
workflow_state: ready
blocked_by: []
size: m
---

## What to build

Effort close-out can propose changeset entries and write them once the operator
confirms. A proposal for an effort with a user-visible change names the package
and a level and writes a file the changesets command line tool accepts. An effort
with nothing user-visible proposes the generic performance and stability patch
unless an identical entry is already staged, in which case it proposes nothing.
A repository without a changeset config gets a refusal naming what is missing.

## Acceptance criteria

- [ ] A writer tool writes entries under `.changeset/` in the tool's own format,
      with formatting disabled.
- [ ] Each entry's package name is validated against the workspace before
      writing; a mismatch is a refusal, not a file.
- [ ] The generic patch is proposed only when no identical entry is staged.
- [ ] The writer refuses, with the reason, when the repository has no changeset
      config.
- [ ] Written files parse with the changesets parser and are what the command
      line tool would accept.
- [ ] Tests use fixture repositories and cover the dedupe, the refusal, and the
      round trip.

## Blocked by

None (can start immediately)
