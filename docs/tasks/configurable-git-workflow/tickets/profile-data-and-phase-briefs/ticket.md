---
type: ticket
subtype: feature
title: Resolve git settings and profiles into phase briefs
status: stable
workflow_state: ready
blocked_by: []
size: m
---

## What to build

A repository's git settings and the two bundled profiles resolve into a phase
brief that any phase can ask for before it opens. In this repository, asking for
the implementation phase's brief names the effort branch and the step that
creates it off the trunk; asking for a planning phase's brief reports no branch
requirement; selecting `flat` makes every brief empty. A malformed key, a missing
profile file, or an unknown profile name produces a diagnostic and falls back to
`default`.

## Acceptance criteria

- [ ] `taskWorkflow.git.profile`, `trunk`, and `trunkMerge` are read from project
      and global settings, project over global, defaults last.
- [ ] Both profiles ship as data in the package and load without configuration.
- [ ] A read-only brief tool returns the required branch, the branch step, and
      the instruction text for a named phase and effort, taking a ticket slug
      where the phase is ticket-shaped.
- [ ] `default` resolves `effort/{effort}` for the implementation phase and the
      effort close, `ticket/{ticket}` for the five implementation agents, and
      nothing for the planning phases.
- [ ] `flat` resolves nothing for any phase or agent.
- [ ] Malformed values, a missing profile file, and an unknown profile name each
      produce a diagnostic and the documented fallback, never a crash.
- [ ] Tests cover the profile matrix, the settings precedence, and each
      fallback.

## Blocked by

None (can start immediately)
