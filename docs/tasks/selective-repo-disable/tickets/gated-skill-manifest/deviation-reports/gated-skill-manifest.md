---
type: deviation report
title: Deviation report for gated-skill-manifest
status: stable
---

## Deviation report: gated-skill-manifest

Implementation: `ticket/gated-skill-manifest` (two commits: `2e0a76a` the
manifest plus consistency tests, `f23632a` the handler swap), diffed against
`main` (the branch forks at `ae0af7e`; no separate task branch exists for
this ticket).

### API surface changes

- **Planned:** one exported constant carrying exactly the 10 settled names
  beside the skill registry; `loadGatedSkillNames()` and its 8-name fallback
  constant deleted; the prompt-strip and `/skill:` invocation handlers read
  the manifest; the session-start skill-name diagnostics channel survives for
  a genuine package.json read failure.
- **Actual:** exactly that, with three renames and one text change worth
  recording:
  1. `src/disclosure.ts` exports `GATED_SKILL_NAMES: readonly string[]` with
     the 10 settled names, placed directly above `SKILL_REGISTRY`, as planned.
  2. The module-private helper was renamed `loadGatedSkillNames()` to
     `loadSkillNameDiagnostics()` and its return type narrowed from
     `{ names, diagnostics }` to `string[]` (it derives no names anymore).
     Not an exported surface; nothing outside `src/pi.ts` consumed the old
     helper either.
  3. Two diagnostic notification strings were reworded: the prefix
     `skill-strip:` became `gated-skill manifest:`, and "using fallback list"
     became "the static manifest is in effect". No spec text or test pinned
     the old wording, and it described a fallback that no longer exists.
- **Impact:** none on dependent tickets. `gated-tool-registration` receives
  an untouched registration surface (the diff does not touch `tw_open`,
  `buildOpenParameters`, `validateOpenArgs`, `notify_user`, or
  `restoreDeclaredSetFromTranscript`), and `tw-open-gated-restriction`
  consumes the export exactly as the per-ticket contract states. One
  readability hazard for the next reviewer: `tests/gate-factory.test.ts`
  keeps its own local `GATED_SKILL_NAMES` fixture (5 names, not imported, so
  no collision) beside the now-real export of the same name, and that
  fixture's comment still says the runtime derives the list from
  `package.json pi.skills`, which is now false. Its cleanup is pre-assigned
  to `gated-tool-registration` in the architecture's engineering checks, and
  all its assertions still hold (the 5 names are a subset of the 10), so
  leaving it was correct here.

### Abstraction usage

- Used/was specified: **yes**, all of them.
  - The manifest lives next to `SKILL_REGISTRY` in `src/disclosure.ts` as
    the single keep-list; no second mechanism, per-skill flag, or fallback
    path was added. The do-not-reimplement list is honored in full: one
    list, one source, pinned by the consistency test.
  - The strip handler (`src/pi.ts:158`, `new Set(GATED_SKILL_NAMES)`) and
    the invocation gate (`src/pi.ts:114`, `GATED_SKILL_NAMES.includes(name)`)
    keep their existing name-set shape; only the source of the set changed.
  - The gate-factory test seam is extended with three new tests inside the
    existing describes (work repo passes through `/skill:tdd`, blocks
    `/skill:task-workflow-doctor`, leaves `tdd`/`research` in the prompt
    while stripping `wayfinder`), not a second fixture style.
  - The static diagnostics channel (`SKILL_NAME_DIAGNOSTICS`, notified at
    session start at `src/pi.ts:3728`) survives, now fed by the narrowed
    package.json sanity read.

### Out-of-scope changes

- **Gated-repo surface narrowed, which is a user-visible behavior change
  shipped by this ticket:** the removed derivation's happy path stripped and
  blocked all 31 `pi.skills` basenames in a work repo; the manifest narrows
  that to the 10 workflow skills. Generic skills (`tdd`, `research`,
  `grilling`, and the rest) are now left in the system prompt and invocable
  via `/skill:` in gated repos. This is the effort's stated purpose and the
  ticket's "What to build" implies it, but it goes beyond the literal
  "remove the derivation" reading of the acceptance criteria, and
  `docs/repo-gating.md:16` still documents the old all-skills strip until
  `repo-gating-docs-resync` lands. Ungated repos are unchanged (all
  personal-repo gate-factory tests pass).
- **Consistency-rule direction, an interpretation rather than a literal
  implementation of the contract:** the per-ticket contract says "manifest
  names are exactly the registry workflow skills", but the settled 10-name
  list includes three skills with no `SKILL_REGISTRY` entry
  (`task-workflow-overview`, `task-workflow-doctor`, `workflow-failure` own
  no toolset, so they have no registry entry). The implementable rule was
  built instead: registry entries outside the manifest are exactly
  `["skill-creator"]`, plus the exact-10 literal pin in the test. All three
  failure modes the ticket's AC 3 lists are covered (a manifest name missing
  from `pi.skills`, a workflow registry skill missing from the manifest, a
  manifest count differing from 10). Logged as workflow friction at report
  time.
- **Test placement:** the consistency tests live in `tests/skills.test.ts`
  (which already reads `package.json` and imports `SKILL_REGISTRY`) rather
  than `tests/disclosure.test.ts` (tool-behavior tests for `tw_open` /
  `tw_close` / `tw_next`). The architecture names no file; the grouping
  rationale is documented and defensible.
- Nothing else: `git diff --stat main..ticket/gated-skill-manifest` lists
  exactly the four expected files (+149 / -26 lines); no `package.json`,
  README, or SKILL.md changes.

### Ticket doc update needed?

Yes. Append to `## Implementation notes` (to be created at land time):

- the gated-repo behavior change for generic skills (now left in the prompt
  and invocable via `/skill:` in work repos), so `repo-gating-docs-resync`
  and any reader of the still-old doc text starts from the stated behavior;
- the session-start diagnostic text change (prefix `skill-strip:` became
  `gated-skill manifest:`; no fallback wording remains);
- the consistency-rule direction reading of the contract (the manifest is
  the registry workflow skills plus the three toolset-less workflow skills,
  and the test pins registry-minus-manifest to exactly `skill-creator`);
- the full-suite caveat: 31 pre-existing environment failures, identical to
  the `main` baseline (installed `@earendil-works/pi-coding-agent` 0.80.3
  while tests expect 1.x; local `.venv/` polluting two corpus scans), so AC
  4's "suite passes" holds as "no new failures relative to main", not as a
  green run on this machine.

### User attention needed?

No. No scope change and no API surface difference beyond the planned
export. The gated-repo widening for generic skills is this effort's
deliberate purpose, already has a follow-up docs ticket, and changes
nothing for ungated repos.

### Reporter's independent verification

- Read the full diff `main..ticket/gated-skill-manifest`: four files,
  `src/disclosure.ts`, `src/pi.ts`, `tests/skills.test.ts`,
  `tests/gate-factory.test.ts`.
- Grep across the repo: no source reference to `loadGatedSkillNames` or
  `FALLBACK_GATED_SKILL_NAMES` remains; the only hits are archived effort
  docs and this effort's own planning records (history, correctly
  untouched).
- `npx vitest run tests/gate-factory.test.ts`: 33/33 pass.
- `npx vitest run tests/skills.test.ts`: 599 pass, 2 fail; both failures
  are the local `.venv/` corpus pollution (em-dash offenders are
  `.venv/lib/python3.13/site-packages/packaging/_structures.py`,
  `packaging/version.py`, `prd_tool-0.1.0.dist-info/METADATA`,
  `pygments/lexers/scripting.py`), confirmed environment-caused, not the
  diff.
- All 10 manifest names confirmed present as `pi.skills` basenames (31
  entries total); the registry has 8 entries and its complement in the
  manifest is exactly `skill-creator`.
