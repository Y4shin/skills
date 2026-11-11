---
type: ticket
subtype: feature
title: Turn pending changesets into a version bump and a changelog through tools
status: stable
workflow_state: done
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

## Implementation notes

### What landed

Pending changesets become a version bump and a root changelog through two tools,
with the changesets command line tool absent from the runtime.

- `src/core/changesets.ts` gained the consume half of the seam: `planRelease` and
  `applyRelease`, the report shapes, and eight named refusal codes. The authoring
  path and the release path share the workspace read, the config read, and one
  pending read.
- `tw_release_plan` reports the pending entries, the versions they produce, and
  the changelog section text, and writes nothing.
- `tw_release_apply` bumps the manifest, inserts the section, and removes the
  consumed entries. It recomputes the plan rather than trusting a handed-back one,
  so both tools take no arguments and read the session directory.
- Four changesets libraries and the workspace reader became runtime dependencies;
  the command line tool stays a dev dependency, and an invariant test fails if a
  module the seam imports is not a declared dependency.
- Both tools are declared in every state, so they are reachable from the release
  skill without an open phase.

### Lessons

- The apply recomputes, so the release skill must report the apply's own answer
  and must not claim the preview is exactly what got applied.
- An empty plan is a refusal with its own code, not an empty success, so the skill
  reports it as nothing to release and stops.
- The comparison tests shell out to the dev tree's own command line tool and
  compare manifest bytes, changelog bytes, and entry removal, which is the oracle
  the architecture named.
