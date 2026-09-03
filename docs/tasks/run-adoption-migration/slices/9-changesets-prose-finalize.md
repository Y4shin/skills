---
kind: slice
slug: changesets-prose-finalize
title: Integrate changesets into release.sh, run the no-em-dashes sweep, bump schema_version to 3, full suite green
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
- retire-and-drop
- add-utility-skills
- add-meta-triage-skills
- rewire-implement-task
- scaffold-repo-root-docs
- add-planning-handoff-skills
- realign-skills
---

## End-to-end behavior

The adoption is finalized (grilling #1 Q20 + Q10 + grilling #2 R2Q1):
changesets is integrated INTO `scripts/release.sh` (not replacing it —
`release.sh` runs the changeset versioning/generation then publishes),
`.changeset/` is added with `config.json` + a seed changeset recording
this adoption, and `package.json` gains changeset scripts. A repo-wide
**no-em-dashes sweep** runs over all prose (`SKILL.md`, `docs/`, `README`,
`CHANGELOG`, ADRs, companion docs) replacing em-dashes with comma/colon/
period/parens/conjunction per Q10. `docs/tasks/state.yaml`'s
`schema_version` is bumped from `2` to `3`, marking the migration complete.
The full suite (`npm test` + `npm run typecheck`) is green.

## Acceptance criteria

- `.changeset/` exists with `config.json` (changesets CLI) + a seed
  changeset `.md` describing the v2.10.0 → v3.0.0 adoption.
- `package.json` gains changeset scripts (`changeset`, `version`) +
  `@changesets/cli` devDependency; `.claude-plugin`-style version sync is
  not needed (we are Pi, not Claude plugin) — but if a version field needs
  syncing to `package.json`'s version, a small sync script or release.sh
  step handles it.
- `scripts/release.sh` is updated to drive changesets (run `changeset
  version` / generation) then publish the new version.
- A grep for em-dashes (`—` / `--` rendered as em-dash) across `skills/`,
  `docs/`, `README.md`, `CHANGELOG.md`, `docs/adr/` returns none in prose
  (code comments in `src/`/`scripts/` are out of scope unless they're in a
  skill). All hits rewritten.
- `docs/tasks/state.yaml` has `schema_version: 3`.
- `npm test` + `npm run typecheck` green; `validate_skill.mjs` passes for
  every promoted skill.
- Record the final shape of all 11 upgrade-2-to-3 steps (from each slice's
  notes) as a consolidated "what the migration actually did" summary in the
  slice notes — this is the source for `build-migration-skill`.

## Test plan

Seams: `npm test` (changeset config doesn't break the suite), the em-dash
grep (must return empty), `validate_skill.mjs` across all skills, typecheck.
Failure modes: an em-dash survives in a skill/doc; changesets config
breaks the test run; `schema_version` not bumped. Scenarios: `npm run
changeset` works; `release.sh` produces a version bump; the em-dash grep
is empty. Edge cases: em-dashes inside code strings/tests (out of scope);
  a skill's companion doc with a legitimate em-dash in a quote (rewrite
  the quote).

## Constraints and dependencies

- Blocked by all other slices (it finalizes: the em-dash sweep must run
  after all prose is written; the schema bump marks completion).
- Grilling #1 Q20 (changesets into release.sh), Q10 (no-em-dashes),
  grilling #2 R2Q1 (schema_version mechanism).
- The consolidated step-summary in slice notes is the handoff to
  `build-migration-skill` (which distills these proven steps into the
  reusable migration skill + `upgrade-2-to-3` resource).
