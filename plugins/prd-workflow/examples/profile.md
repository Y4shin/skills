# Project Profile

## Project

Rust + nix + React/TanStack plugin-driven monolith ("Junius").

## Orientation docs

- `docs/design/02-architecture.md` — system architecture
- `docs/design/04-frontend.md` — frontend architecture (React/TanStack)
- `docs/design/06-plugin-shape.md` — plugin structure & manifest
- `docs/design/08-cross-plugin-composition.md` — cross-plugin patterns
- `docs/design/11-backend-plugin-interface.md` — backend plugin interface (SDK)
- `docs/design/12-frontend-plugin-interface.md` — frontend plugin interface
- `docs/plugin-authoring-guide.md` — how to write a plugin
- `docs/impl/README.md` — milestone index and status legend
- `clippy.toml` — disallowed methods and lint config

## Architecture layers

### Feature (vertical slice)

Each feature slice delivers a complete end-to-end path: proto/RPC (Connect)
→ migration → plugin Rust → frontend route/component → test. Cuts through
every relevant layer, not a horizontal slice of one.

### Capability (enabling slice)

Foundational work: an API surface in `crates/junius-sdk/` (types / traits /
fns), a derive/attribute macro in `crates/junius-sdk-macros/`, or a host
capability in `platform/`. Each unit names a concrete first consumer
(plugin or host call site). Acceptance = consumer test (doctest/unit in the
crate + downstream integration test; for macros, `trybuild`/compile-fail).

## Test infrastructure

| Type | File pattern | Run command |
|---|---|---|
| e2e | `plugins/*/frontend/e2e/**/*.spec.ts`, `e2e/cross/**` | `task test:e2e` |
| rust-integration | `tests/*.rs`, `#[tokio::test]` (testcontainers) | `task test:rust` |
| consumer-integration | plugin/host exercising a new SDK surface | `task test:rust` |
| rust-unit / doctest | `#[cfg(test)]`, `///` examples | `task test:rust:unit` |
| macro compile-test | `trybuild` / compile-fail | `task test:rust` |
| frontend-unit | `*.test.tsx` (jsdom/vitest) | `task test:js` |

## CI

`task ci` (fmt, clippy -D warnings, tests, biome, buf)

## Code conventions

- No `unsafe` (`unsafe_code = "forbid"`).
- No clippy-disallowed methods (direct env reads, etc. — see `clippy.toml`);
  go through `junius-sdk`.
- English comments, only where the *why* is non-obvious.
- Plugin work treats `plugin.toml` as the source of truth for plugin
  identity, routes, and permissions.
- If SQL changed: `cargo sqlx prepare --workspace` refreshed (`.sqlx`);
  `task sqlx:check` passes.

## Knowledge destinations

- Design docs: `docs/design/*` (architecture, plugin/SDK interfaces)
- Decision log: `docs/design/14-decision-log.md` (dated entries)
- Milestones: `docs/impl/NN-M<NN>-*.md`
- Milestone index: `docs/impl/README.md`
