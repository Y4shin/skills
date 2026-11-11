---
type: task
subtype: grilling
title: "Settle the changeset contract: file format, authoring step, and verification"
status: stable
workflow_state: done
blocked_by: []
---

## Decision to settle

The changeset file contract that a repository using the task workflow follows,
and how `finalize-effort` authors and the human verifies those entries.

## Settled already

- Changesets are authored at effort finalization, not per ticket.
- Granularity is deliberately loose: some efforts carry one entry, some two.
  This effort would carry two (the stricter git workflow, and the release
  pipeline built on changesets and `docs/releasing.md`).
- A guideline for what qualifies is wanted, and finalization proposes the entries
  for human verification before writing them.

## Choices still open

1. **The file format.** This repo uses `@changesets/cli`: `.changeset/*.md` with
   frontmatter naming the package and a level (`patch`, `minor`, `major`) and a
   body that becomes the changelog entry. A downstream repo may use the workflow
   without changesets installed, or without a package manifest at all. Options:
   adopt the `@changesets/cli` file convention as the contract and read it
   ourselves; define a smaller format of our own; or detect and use the repo's
   installed tool.
2. **Where the entries are written** when a repo has no `.changeset/` directory,
   and whether the workflow creates it.
3. **What "proposes for human verification" means mechanically**: the phase
   prints proposed entries in its close-out report and writes them after a yes,
   or it writes them and the human edits.
4. **The guideline itself**, in one or two sentences, on what merits an entry.
5. **The no-visible-change case**: what an effort that only refactors or only
   changes internal docs records. An empty changeset, a `patch`, or nothing.

## Recommended starting answer

Adopt the `@changesets/cli` file convention as the contract and read it
ourselves, so a repo can use it without the CLI installed, and a repo that has
the CLI gets the same files. Write entries under `.changeset/`, creating the
directory when absent. Propose the entries in the close-out report, write them
after confirmation. The guideline: one entry per change a user of the package or
product can observe, including a behaviour fix, a new capability, or a breaking
change; skip pure refactors. A refactor-only effort records nothing, and the
release skill must handle a release with no pending changesets.

## Downstream

`release-skill-surface` consumes this format. The spec's finalize-effort changes
follow from it.

## Notes

## Round 1 settled (operator's answers)

- **Format: strict `@changesets/cli` compatibility.** `.changeset/<name>.md` with
  the CLI's frontmatter and body, written under `.changeset/`, the CLI's default
  location. The operator wants `changesets` pulled into this package as a
  dependency so the extension can do the work through its own tools, and users
  can still bring the CLI if they want to manage changesets themselves. The
  package must work when the user has no CLI installed, which is why the format
  stays strictly CLI-compatible rather than inventing a shape.
- **Writes go through a tool.** Like every other artifact writer in this package,
  changeset writes are gated behind an extension tool, not the built-in write
  tools.
- **Propose, then write after a yes.** Finalization prints the entries it would
  write and writes them after the operator confirms.
- **The guideline stands**: one entry per user-observable change; refactors, tests,
  and internal docs do not earn one. The operator had no way to judge the
  guideline and will run with it.
- **Every effort yields at least one entry.** An effort with nothing
  user-observable writes a generic "general performance and stability
  improvements" style patch, with dedupe: if such a patch is already staged, do
  not add a second one.

## Newly discovered work

`changesets-api` (research): whether the changesets functionality can be used
programmatically from the extension, so no CLI installation is required. A
`prototype` task follows only if that research leaves the API path unclear.
