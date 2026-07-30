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

## Integration harness (tests/integration/)

- Sessions run on the **faux provider** from pi-ai's compat layer —
  canned responses, no network. Two layers: `registerFauxProvider`
  (pi-ai, serves the responses) + `ModelRegistry.registerProvider`
  (pi-coding-agent, makes auth/model resolution pass).
- Use `AuthStorage.inMemory()` + `ModelRegistry.inMemory(authStorage)`
  — `ModelRuntime` was removed in pi-coding-agent 0.80.3.
- `registerProvider` requires `baseUrl` when the provider defines
  models (a dummy like `http://faux.local` is fine).

## Skill prose testing

- Skills are tested via **structure/cross-reference assertions** in
  `tests/skills.test.ts` (e.g. "implement-task references
  tdd-worker"). When adding a skill: extend `SKILL_FILES` and bump the
  manifest count assertion.
- **YAML gotcha:** an unquoted `: ` inside a frontmatter value (e.g. a
  title containing `type: bug`) makes the YAML invalid; the task tools
  then *silently skip* the file. Quote such values.
