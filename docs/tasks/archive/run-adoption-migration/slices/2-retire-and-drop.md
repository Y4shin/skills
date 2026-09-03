---
kind: slice
slug: retire-and-drop
title: Retire report-bug into deprecated/ and drop grilling-with-ui + its CLI/UI scripts
task: ../task.md
mode: afk
status: done
size: s
blocked_by:
- reorganize-into-buckets
---

## End-to-end behavior

`report-bug` is retired into `deprecated/` (triage, added in a later slice,
subsumes its intake function per grilling #1 Q12). `grilling-with-ui` is
dropped entirely (grill-me, added in a later slice, replaces it per Q15),
along with its CLI/UI scripts: `scripts/grilling-cli/`, `scripts/grilling-
ui/`, and any `grilling-grilling-summary.md` / `.grilling.json` references in
`.gitignore`. The package no longer ships either skill; `pi.skills` (already
trimmed in the prior slice) has neither.

## Acceptance criteria

- `report-bug` is moved to `skills/deprecated/report-bug/` with a one-line
  note in `skills/deprecated/README.md` naming what replaced it (`triage`).
  Its content is preserved (not deleted) per Matt's deprecated convention.
- `grilling-with-ui` is removed from `skills/` entirely (not deprecated:
  dropped per Q15).
- `scripts/grilling-cli/` and `scripts/grilling-ui/` are removed (and their
  built `dist/` outputs if any).
- `.gitignore` entries for `grilling-grilling-summary.md` and `.grilling.json`
  are removed (no longer produced).
- `tests/skills.test.ts` no longer references `grilling-with-ui`; any
  grilling-cli/grilling-ui tests under `tests/` or `scripts/` are removed.
- `npm test` and `npm run typecheck` are green.

## Test plan

Seams: `tests/skills.test.ts` (remove grilling-with-ui from `SKILL_FILES`,
  bump manifest count); any test importing `scripts/grilling-cli/*` or
  `scripts/grilling-ui/*` (remove). Failure modes: a stale reference to
  grilling-with-ui or grilling-cli/ui remains (broken import / test);
  report-bug content lost (must be preserved in deprecated/). Scenarios:
  `pi install` no longer ships grilling-with-ui; `report-bug` content is
  readable under deprecated/. Edge cases: `package.json` dependencies
  (svelte, vite-plugin-singlefile) added for grilling-with-ui may now be
  unused, remove if nothing else uses them (verify with a usage grep).

## Constraints and dependencies

- Blocked by `reorganize-into-buckets` (skills are already in buckets; this
  slice moves report-bug into deprecated/ and removes grilling-with-ui).
- Grilling #1 Q12 (triage retires report-bug; spot-fix path must survive
  inside triage or be explicitly dropped, the `add-meta-triage-skills`
  slice decides that), Q15 (grill-me in, grilling-with-ui out).
- Deprecation convention: Matt's `deprecated/README.md`, "a retired skill
  is deleted, and the changeset that removes it names whatever replaced
  it." We keep the content (not delete) and name the replacement; record
  this deviation in slice notes for the build task.
