# arch-spec, run-adoption-migration

> This is a markdown/restructuring task, not TDD-able application code. The
> "seams" are structural assertions in `tests/skills.test.ts` +
> `validate_skill.mjs` + `npm test`/`npm run typecheck`. There is no public
> API surface or interface contract between slices in the code sense; the
> "interface contract" is the on-disk layout each slice leaves for the next.
> Work happens in the worktree at `../skills-develop-worktree` on the
> `develop` branch; `main` stays checked out in the primary checkout.

## Source of truth for the target state

- Grilling #1 decision table: `docs/tasks/map-mp-skills-onto-this-repo/task.md`
- Grilling #2 migration design: `docs/tasks/design-migration-skill/task.md`
- Matt's current skills (pinned `6654f6b`, gitignored, symlinked into the
  worktree): `docs/tasks/mp-skills-current-state-report/matt-skills/`

## Per-slice "seams" (verification contract)

Each slice's verification is, in order:
1. `validate_skill.mjs` passes for every new/changed skill.
2. `npx vitest run tests/skills.test.ts` green (structure assertions; update
   `SKILL_FILES` + manifest count as slices add/remove skills).
3. `npm run typecheck` green.
4. `npm test` green except the known `scripts/bundler.test.ts` 2 failures
   (grilling-with-ui), which resolve when slice 2 (`retire-and-drop`) removes
   that bundle + its tests.

## Slice dependency + interface contracts (on-disk layout)

- **L0 (afk, parallelizable conceptually but sequential on shared cwd):**
  - `reorganize-into-buckets`: leaves skills in bucket dirs; `pi.skills`
    trimmed to promoted; bucket READMEs present. **Contract for L0 siblings:**
    all subsequent slices find skills already in buckets.
  - `retire-and-drop` (blocked by reorganize): leaves `report-bug` in
    `deprecated/`, `grilling-with-ui` gone, grilling-cli/ui scripts gone.
    **Resolves the 2 known bundler test failures.**
  - `add-utility-skills` (blocked by reorganize): 7 utility skills present in
    buckets, in `pi.skills`, passing `validate_skill.mjs`.
  - `add-meta-triage-skills` (blocked by reorganize): writing-for-agents,
    triage, grill-me present.
- **L0 cont.:** `rewire-implement-task` (blocked by add-utility +
  add-meta-triage): implement-task SKILL.md + resources reference the new
  skills + implement-spec graph/concurrency language.
- **L1 (hitl):** `scaffold-repo-root-docs`, `add-planning-handoff-skills`,
  `realign-skills` (grilling consult-first), each blocked by reorganize.
- **L2 (afk finalize):** `changesets-prose-finalize`, blocked by all
  others; final em-dash sweep + changesets + `schema_version: 3`.

## Architecture notes

- The repo-gate (`src/core/repo-gate.ts`) and Pi extension (`src/pi.ts`) are
  foundational and untouched (keep-as-ours, Q11).
- Telemetry wiring (`telemetry_skill_context` / `submit_feedback`) is
  mandatory on every new/rewritten skill (map constraint).
- No-em-dashes rule (Q10) applied per-slice; a final sweep in slice 9
  catches stragglers.
- Deviations from grilling #1 are recorded in slice notes so
  `build-migration-skill` encodes the truth.
