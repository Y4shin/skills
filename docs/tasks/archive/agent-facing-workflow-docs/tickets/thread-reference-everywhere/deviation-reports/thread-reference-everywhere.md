---
type: deviation report
title: Deviation report for thread-reference-everywhere
status: stable
---

## Deviation report: thread-reference-everywhere

### API surface changes
- **Planned:** Canonical sentence verbatim in every promoted SKILL.md minus
  `workflow-failure` and `task-workflow-overview`, and in every `agents/`
  profile; placed directly after the operator-communication preamble where
  one exists, otherwise at the top of the body. Agent-frontmatter test file
  list untouched; no new profiles.
- **Actual:** As specified. 29 promoted SKILL.md files (pi.skills minus the
  two exclusions) and all 11 profiles carry the sentence verbatim, exactly
  once. One interpretation of "top of the body" for
  `operator-communication` (a titled, no-preamble file): the sentence is the
  first prose paragraph after the H1 title, not literally above the title.
  The coverage contract asserts verbatim presence only, so this cannot fail
  the mechanical check; it is a one-line move if the operator wants it
  literal.
- **Impact:** None on dependent tickets. `reference-coverage-suite`'s
  verbatim-presence contract is satisfied on the tree as left.

### Abstraction usage
- Used/was specified: yes. The promoted-set seam (`package.json` `pi.skills`)
  was used to derive the coverage list, matching the arch spec's
  abstractions section.

### Out-of-scope changes
- None in the source tree: `git diff main --numstat -- skills/ agents/`
  shows 40 files, 80 insertions, 0 deletions (two added lines per file,
  additions-only).
- Process note: the red-green gate ran against an untracked ticket-local
  checker in the ticket's `.work/` directory instead of adding tests under
  `tests/`, because the arch spec assigns `tests/` ownership to
  `reference-coverage-suite`. Seemingly necessary to honor both the TDD
  loop and the packaging seam, not a source-tree deviation.
- `docs/tasks/state.yaml` was modified by the orchestrator before dispatch
  and intentionally left uncommitted by the implementer.

### Ticket doc update needed?
- Yes, a one-line append to `## Implementation notes` (if the ticket doc
  carries or gains one): record the "top of the body means first prose
  slot, after the H1 for titled files" interpretation, plus the note for
  `reference-coverage-suite` that its test must still assert presence in
  `task-workflow-overview` (its ticket text names only `workflow-failure`
  as exempt; the overview silently loses coverage if treated as exempt
  too).

### User attention needed?
- No. Scope and API surface match the spec. The placement interpretation
  and the test-ownership tension are informational; the coverage suite
  contract is unaffected.
