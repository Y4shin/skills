---
type: ticket
subtype: feature
title: Turn pending changesets into a version bump and a changelog through tools
status: stable
workflow_state: ready
blocked_by:
- changeset-authoring
size: l
---

## What to build

Pending changesets become a version bump and a root changelog through two tools,
with the changesets command line tool not installed. A preview reports the pending
entries and the versions they produce. Applying writes the manifest and the
changelog section and removes the consumed entries. A repository with no manifest,
a missing changeset config, and nothing pending are three distinct, named
outcomes, never one silent no-op.

## Acceptance criteria

- [ ] The changesets library set and the workspace reader are runtime
      dependencies; the command line tool stays a dev dependency.
- [ ] A plan tool returns the pending entries, the versions they produce, and the
      changelog section text, and writes nothing.
- [ ] An apply tool bumps the manifest, inserts the changelog section, and
      removes the consumed entries.
- [ ] The changelog renders through the standalone changelog package whatever
      specifier the repository's config names.
- [ ] Formatting is disabled and no formatter subprocess runs.
- [ ] A missing manifest, a missing changeset config, and an empty plan are
      reported distinctly.
- [ ] A fixture comparison against the command line tool shows identical manifest
      bytes, changelog content, and entry removal.
- [ ] The prototype's failure paths are covered: no version field, a private
      package, a malformed entry, and an unknown package name.

## Blocked by

- `changeset-authoring`, for the file contract this consumes
