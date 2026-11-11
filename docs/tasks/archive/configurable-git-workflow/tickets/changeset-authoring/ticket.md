---
type: ticket
subtype: feature
title: Propose and write changesets at effort close
status: deprecated
workflow_state: done
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

## Implementation notes

### What landed

Changeset authoring at effort close, backed by one module that wraps the
changesets library set.

- `readWorkspace` reads the workspace through the manypkg reader and returns the
  root directory, the member package names, the root package name, and the
  library's own packages view.
- `readChangesetConfig` reads and validates the config. A missing file is
  `no-config`, unreadable or invalid JSON is `invalid-config`, and it never falls
  back to the library's built-in default.
- `readStagedEntries` returns pending entries, one per release.
- `proposeEntries` writes nothing and returns the proposed entries, what was
  skipped as already staged, and whether the generic entry was used. An empty
  change list proposes the generic patch, summary "Performance and stability
  improvements.", package the workspace root, level patch.
- `writeEntries` runs the same resolution and writes one file per entry through
  the library with formatting disabled, so no formatter can spawn and the bytes
  are the library's own.
- `tw_write_changesets` is the named writer, disclosed to the effort close only,
  with refusals rendering in the existing shape.

### Lessons

- The settled flow was "propose, confirm, write", but only the write has a tool:
  `proposeEntries` has no production caller, so the operator currently confirms
  entries after they land. A dry-run flag or a fifth tool restores the settled
  flow, and it is cheap now and a prose rewrite after ticket 4.
- Dedupe collapses when one staged file is malformed: the reader parses every
  file at once, so one bad file empties the staged set and a second identical
  generic entry gets written. The read seam must distinguish "nothing staged"
  from "could not read".
- Validation uses the workspace's member packages, which in a monorepo excludes
  the root package, so an entry naming the root package is refused. The generic
  entry is created after validation and is therefore never validated at all.
- The generic summary text and the root-package choice are operator-facing prose
  chosen here, and a private monorepo root is skipped by the default config, which
  turns the generic entry into an empty release plan that ticket 6 must report as
  a named outcome.
