# Architecture spec: bug-workflow

Approved by user. Stable across all slice chains.

## Shared notes (all slices)

- TDD here = extend prose/structure assertions in `tests/skills.test.ts`
  (RED) → write the skill prose/manifest change (GREEN). Reuse its
  existing helpers (`readFile`, `parseFrontmatter`, `SKILL_FILES`);
  **no new test files**.
- **Do NOT touch:** `src/` (no tool changes — permissive frontmatter
  parser already verified), `agents/*.md`,
  `skills/report-bug/resources/` (repro schemas are a follow-up).
- **Do NOT reimplement:** test helpers, chain pseudocode (move it),
  agent definitions.

## Slice 1 — report-bug-skill

- Exports:
  - `skills/report-bug/SKILL.md` — frontmatter `name: report-bug` +
    description; body = the approved 5-step flow (capture en-bloc →
    duplicate check → dev-env.md-governed repro → triage).
  - `package.json` `pi.skills` gains `./skills/report-bug` (count 6).
  - `tests/skills.test.ts`: SKILL_FILES + report-bug; manifest count 6.
- Interface contract (consumed by slices 2–4):
  - Bug doc: `docs/bugs/<slug>.md`, status ∈
    `reported → confirmed → fixed | wontfix | promoted`, plus
    `severity`, `promoted_to`.
  - Promotion writes task frontmatter `type: bug` + `bug: <slug>`;
    `repro.md` (+ scripts) moves next to `task.md`.
  - Invocation name: `/skill:report-bug`.

## Slice 2 — implement-task-wrapper

- Exports:
  - `skills/implement-task/SKILL.md` — wrapper: `task_get type`,
    absent → `feature`, dispatch to resources.
  - `skills/implement-task/resources/feature.md` — current body moved.
  - `skills/implement-task/resources/bug.md` — lean chain.
  - `tests/skills.test.ts` retargeted + new assertions.
- Interface contract:
  - `feature.md` MUST still contain: `task_dependency_levels`,
    `tdd-worker`, `slice-verifier`, `land-worker`,
    `deviation-reporter` (existing tests assert these).
  - `bug.md` MUST reference: tdd-worker, slice-verifier, land-worker +
    red-first test rule; MUST NOT contain arch-spec conversation,
    coherence refactor, or dependency levels.
  - Both resources: failure toolbelt in order **diagnose → split
    (Na/Nb/Nc, `status: split`) → retry +50% → escalate**; "parent
    never implements" as a hard rule.

## Slice 3 — finalize-bug-closure

- Exports: `type: bug` branch in `skills/finalize-task/SKILL.md`
  (close bug doc: `status: fixed`, `fix_commit`, root cause/summary,
  `git mv` to `docs/bugs/archive/`); test asserting it.
- Contract: reads `bug: <slug>` (slice 1's convention); absent → ask
  user. Feature tasks unchanged.

## Slice 4 — onboarding-and-routing

- Exports: `skills/onboard-workflow/SKILL.md` adds
  `docs/bugs/archive/` + `docs/dev-env.md` template (no clobber on
  re-run); `skills/task-overview/SKILL.md` routing row + triage grep.
- Contract: route string `/skill:report-bug`; grep pattern
  `status: reported`.
