---
type: ticket
subtype: feature
title: Resolve git settings and profiles into phase briefs
status: stable
workflow_state: done
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

## Implementation notes

### What landed

A repository's `taskWorkflow.git` settings and the two bundled profiles now
resolve into a phase brief that any phase can ask for before it opens.

- `readGitSettings` in `src/core/repo-gate.ts` extends the existing settings read
  rather than reimplementing it: `settingsPaths()` is now the single place the
  global and project paths resolve. It merges project over global key by key,
  applies built-in defaults last, returns `{ profile, trunk, trunkMerge,
  diagnostics }`, and never throws. `trunkName()` resolves the trunk from
  `{ develop, main }`.
- `src/profiles/default.json` and `src/profiles/flat.json` ship the profiles as
  data through the package's existing `files` entry. Schema: `{ name, merge?,
  push?, phases: { <phase>: { branch?, openInstructions?, closeInstructions?,
  closeGate? } }, agents: { <agent>: { branch? } } }`. `default` names
  `effort/{effort}` for the implementation phase and the effort close,
  `ticket/{ticket}` for the five implementation agents, nothing for the planning
  phases; `flat` names nothing anywhere.
- `src/core/git-profile.ts` holds the loader and the one resolver: `phaseBrief`
  and `gateDecision` read the same resolution, so the brief and the refusal cannot
  drift. Tickets 2 and 3 consume this resolver rather than reading settings.
- `tw_phase_brief` is read-only and needs no open phase. It joined
  `ALWAYS_DECLARED`, which changed the always-declared surface; three pins were
  updated deliberately (`FULL_TOOL_SURFACE`, the always-declared loop, the
  plugin registration list). The gated registered surface is unchanged.

### Lessons

- The specification's `trunk` snippet repeated the `develop` key, so no parser
  could represent it. The operator-approved shape is `{ develop: false | string,
  main: string }`, where `false` means no develop branch and a string is its name.
  `true`, `""`, and non-strings diagnose and fall back.
- Profile field names and the `merge`/`push` vocabulary are this ticket's choice
  (`"no-ff"` and `"always"` in `default`, nothing in `flat`) because the spec
  named the fields but not their values. Ticket 4 should confirm the vocabulary
  before documenting it.
- A profile with a wrong shape falls back to `default` as a whole rather than
  being partially applied, so a malformed custom profile cannot gate less than
  its author intended.
- A local `.codegraph/` directory in the checkout makes three `tests/skills.test.ts`
  corpus sweeps fail, because `CORPUS_SKIP_DIRS` does not skip it. With the
  directory set aside the suite is 1410 of 1410. This is pre-existing and
  unrelated to the ticket, but it will keep costing a diagnosis on every run in a
  checkout that uses that tool.
