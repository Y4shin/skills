---
kind: slice
slug: migration-tests
title: Add structure assertions for the migration skill in tests/skills.test.ts (+ spawnSync CLI test if helper scripts ship)
task: ../task.md
mode: afk
status: todo
size: s
blocked_by:
- skill-and-detection-and-upgrade-resource
- target-state-spec
---

## End-to-end behavior

Grilling #2 R3Q3: `tests/skills.test.ts` gains structure/cross-reference
assertions for the migration skill per `docs/testing.md`'s skill-prose-
testing convention: the skill exists, references `upgrade-2-to-3`, is in
`package.json` `pi.skills`. If the skill ships helper scripts, a `spawnSync`
CLI test (per `tests/skill-creator-scripts.test.ts` pattern) covers them.
No new fixture-based integration test (the integration harness is broken
per `docs/testing.md`; out of scope for this map).

## Acceptance criteria

- `tests/skills.test.ts` `SKILL_FILES` includes the migration skill; the
  manifest count assertion is bumped.
- A structure assertion: the migration skill's SKILL.md references
  `upgrade-2-to-3` and the target-state spec.
- A structure assertion: `package.json` `pi.skills` includes the migration
  skill (and no longer includes the retired `onboard-workflow` if renamed).
- If the skill ships helper scripts (e.g. a detection/dry-run script), a
  `spawnSync` CLI test in a dedicated vitest file (or `tests/skill-creator-
  scripts.test.ts` if it fits) pins cwd to repo root, timeouts each
  `spawnSync`, and uses `mkdtempSync`/`try-finally rmSync` for temp dirs.
- `npm test` + `npm run typecheck` green.

## Test plan

Seams: the new assertions are the test. Failure modes: an assertion is
too brittle (breaks on a legitimate rename); the manifest count is wrong.
Scenarios: `npm test` passes with the migration skill present. Edge
cases: the `onboard-workflow` → migration-skill rename in `SKILL_FILES`.

## Constraints and dependencies

- Blocked by `skill-and-detection-and-upgrade-resource` (skill must exist)
  + `target-state-spec` (referenced by assertions).
- Grilling #2 R3Q3. `docs/testing.md` skill-prose-testing + skill-helper-
  script-CLI-seam conventions.
