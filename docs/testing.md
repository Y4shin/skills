# Testing

## Framework

- [Vitest](https://vitest.dev/) (`vitest run`), test files under `tests/`.
- Type checking: `tsc --noEmit` (no emitted build; `type: module`).

## Run commands

| Command | Purpose |
|---|---|
| `npm test` | Run the full test suite |
| `npm run typecheck` | Type-check without emitting |
| `npx vitest run <file>` | Run a single test file |
| `devenv shell -- npm test` | Run the full suite in the reproducible devenv shell |

## Mock conventions

- _To be filled in as patterns emerge._
- **Extension factory tests (no pi runtime):** when testing an extension's
  `export default (pi) => …` factory, drive it with a **stub
  `ExtensionAPI`** that records `registerTool`/`on`/`getAllTools` calls, and
  stub the detection/config modules via `vi.mock`. This is cheaper and more
  isolating than the integration harness and works when the harness is
  broken. See `tests/gate-factory.test.ts` (the repo-gate factory tests) for
  the pattern, it asserts which tool names register and which `on(event)`
  handlers fire under different gate decisions._
- **Iteration-loop seams (function-as-dependency):** when a loop shells out
  to an external process and parses its output, inject the step as a
  `() => Promise<Result>` function so the loop logic (convergence, caps,
  escalation) is unit-testable with a mock, independent of the real
  subprocess. _(The former `scripts/eval/` harness that illustrated this was
  removed with the grilling-with-ui CLI it drove; the pattern stands.)_

## Integration harness (tests/integration/)

- Sessions run on the **faux provider** from pi-ai's compat layer:
  canned responses, no network. Two layers: `registerFauxProvider`
  (pi-ai, serves the responses) + `ModelRegistry.registerProvider`
  (pi-coding-agent, makes auth/model resolution pass).
- Use `AuthStorage.inMemory()` + `ModelRegistry.inMemory(authStorage)`
 , `ModelRuntime` was removed in pi-coding-agent 0.80.3.
- `registerProvider` requires `baseUrl` when the provider defines
  models (a dummy like `http://faux.local` is fine).

### Known issue: harness currently broken on the installed pi (0.80.10)

`tests/integration/session.test.ts` (16 tests) fails with
`TypeError: Cannot read properties of undefined (reading 'inMemory')` at
`harness.ts:138` (`AuthStorage.inMemory()`). This reproduces on `main` and
stems from a version skew in the installed
`@earendil-works/pi-coding-agent` (it no longer exports `AuthStorage` the
way the harness imports it). It is **pre-existing and unrelated** to any
feature landed since. Until fixed, run the suite with
`npx vitest run --exclude tests/integration/session.test.ts`, or rely on
the per-feature unit tests. Do **not** let this block landing new work:
verify it's not your change by checking the failure is that same
`AuthStorage.inMemory` line. The follow-up bug task
`fix-integration-harness-auth-storage` tracks updating the harness for the
installed Pi API.

## Skill prose testing

- Skills are tested via **structure/cross-reference assertions** in
  `tests/skills.test.ts` (e.g. "implement-task references
  tdd-worker"). When adding a skill: extend `SKILL_FILES` and bump the
  manifest count assertion.
- **YAML gotcha:** an unquoted `: ` inside a frontmatter value (e.g. a
  title containing `type: bug`) makes the YAML invalid; the task tools
  then *silently skip* the file. Quote such values.
- **Skill bucket layout (adopt-mp-skills-way):** skills live in bucket folders
  `engineering/`/`productivity/` (promoted, in `package.json` `pi.skills` + get a
  `docs/<bucket>/<name>.md` page) and `misc/`/`in-progress/`/`deprecated/` (kept,
  not promoted). `tests/skills.test.ts` asserts the bucket layout via `readdirSync`
  (only bucket dirs at `skills/` top level) + the manifest count. When moving a
  skill between buckets, update `SKILL_FILES` paths, the `pi.skills` entries, and
  any `toContain("./skills/<bucket>/<name>")` assertions in one commit.
- **validate_skill.mjs allows `disable-model-invocation` + `argument-hint`:** the
  validator's `ALLOWED_KEYS` includes these Pi frontmatter keys (every user-invoked
  skill uses `disable-model-invocation`); a skill whose folder name != frontmatter
  `name:` fails validation (rename the folder to match, not the name).
- **Migration skill (setup-workflow) + version-stamp:** `docs/tasks/state.yaml`
  carries `schema_version`; `setup-workflow` auto-detects fresh/old/current and
  applies per-upgrade resources (`resources/upgrade-<from>-to-<to>.md`) in
  sequence. Structure assertions verify the skill references `upgrade-2-to-3`,
  `migration-target.yaml`, and the dry-run/backup/idempotent safety guarantees.
- **Skill helper-script testing (CLI seam):** when a skill ships executable
  helper scripts (e.g. `skills/engineering/skill-creator/scripts/*.mjs`), test them via
  `spawnSync` on the script CLI (stdout + exit code) from a dedicated vitest
  file (e.g. `tests/skill-creator-scripts.test.ts`). Pin `cwd` to the repo
  root, give each `spawnSync` a timeout, and use `mkdtempSync` + `try/finally
  rmSync` for any temp skill dirs. Include a **dogfood assertion** where
  appropriate, e.g. `validate_skill.mjs skills/skill-creator` must exit 0
  (the skill's own validator validates itself).
