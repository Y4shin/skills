# Testing

## Framework

- [Vitest](https://vitest.dev/) (`vitest run`) — test files under `tests/`.
- Type checking: `tsc --noEmit` (no emitted build; `type: module`).

## Run commands

| Command | Purpose |
|---|---|
| `npm test` | Run the full test suite |
| `npm run typecheck` | Type-check without emitting |
| `npx vitest run <file>` | Run a single test file |

## Mock conventions

- _To be filled in as patterns emerge._
- **Extension factory tests (no pi runtime):** when testing an extension's
  `export default (pi) => …` factory, drive it with a **stub
  `ExtensionAPI`** that records `registerTool`/`on`/`getAllTools` calls, and
  stub the detection/config modules via `vi.mock`. This is cheaper and more
  isolating than the integration harness and works when the harness is
  broken. See `tests/gate-factory.test.ts` (the repo-gate factory tests) for
  the pattern — it asserts which tool names register and which `on(event)`
  handlers fire under different gate decisions._

## Integration harness (tests/integration/)

- Sessions run on the **faux provider** from pi-ai's compat layer —
  canned responses, no network. Two layers: `registerFauxProvider`
  (pi-ai, serves the responses) + `ModelRegistry.registerProvider`
  (pi-coding-agent, makes auth/model resolution pass).
- Use `AuthStorage.inMemory()` + `ModelRegistry.inMemory(authStorage)`
  — `ModelRuntime` was removed in pi-coding-agent 0.80.3.
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
the per-feature unit tests. Do **not** let this block landing new work —
verify it's not your change by checking the failure is that same
`AuthStorage.inMemory` line.

## Skill prose testing

- Skills are tested via **structure/cross-reference assertions** in
  `tests/skills.test.ts` (e.g. "implement-task references
  tdd-worker"). When adding a skill: extend `SKILL_FILES` and bump the
  manifest count assertion.
- **YAML gotcha:** an unquoted `: ` inside a frontmatter value (e.g. a
  title containing `type: bug`) makes the YAML invalid; the task tools
  then *silently skip* the file. Quote such values.
