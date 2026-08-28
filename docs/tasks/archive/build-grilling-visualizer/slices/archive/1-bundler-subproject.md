---
kind: slice
slug: bundler-subproject
title: "./scripts Vite/SvelteKit bundler subproject emits a committed .mjs with inlined HTML"
task: ../task.md
mode: afk
status: todo
size: s
blocked_by: []
---

# bundler-subproject

## End-to-end behavior

`./scripts` becomes a bundler subproject. It has its own `tsconfig.json` (kept
out of the root `include`, which is `src/**` only) and a build driver that uses
**Vite + plain Svelte 5 (no SvelteKit)** with `vite-plugin-singlefile` (or
equivalent) and `assetsInlineLimit: Infinity` to produce a single self-contained
`index.html` with all JS/CSS inlined. Running the build emits
`skills/grilling/grilling-cli.mjs` (committed), which is a Node ESM bundle
that imports the inlined SPA HTML as a raw string and serves it. The emitted
`.mjs` works without a further build step in normal use.

The build is two steps: (1) the Svelte SPA builds to one inlined `index.html`;
(2) the CLI's TypeScript is bundled to `grilling-cli.mjs` with that `index.html`
embedded as a string (Vite `?raw` import or read-at-build-time). The committed
`.mjs` is the single artifact. No SvelteKit adapter/routing/SSR — one page,
client-side, fetch()ing the CLI's own Node server (`GET /state`, `POST /submit`).

This slice delivers the build pipeline and a minimal placeholder CLI + minimal
placeholder Svelte page so the end-to-end bundle → emit → run loop is
demonstrable, but it does NOT implement the real CLI subcommands, server, or
SPA graph (later slices). It is prefactoring that enables all later slices.

## Acceptance criteria

- `scripts/tsconfig.json` exists, is a standalone config, and is NOT covered by
  the root `tsconfig.json` `include` (`src/**`).
- `scripts/build.ts` (or equivalent driver) runs the two-step Vite build:
  (a) plain Svelte 5 SPA → one inlined `index.html` (via `vite-plugin-singlefile` + `assetsInlineLimit: Infinity`); (b) CLI TS → `grilling-cli.mjs` with the HTML embedded as a raw string.
- The emitted `grilling-cli.mjs` is committed; running `node
  skills/grilling/grilling-cli.mjs --help` (or equivalent) prints a usage line
  and exits 0, proving the bundle loads and runs without a build step.
- The inlined SPA HTML is present in the bundle (a minimal Svelte page renders,
  e.g. "grilling visualizer" placeholder text) — proves the single-artifact
  inline strategy works end to end.
- `npm run typecheck` (root) still passes and does not type-check `scripts/`
  (it has its own config).

## Test plan

### Seams
- Vite + `vite-plugin-singlefile` (or equivalent single-file plugin) produces
  one inlined `index.html` with all JS/CSS — verify the plugin works with the
  Vite version resolvable in `node_modules`.
- The CLI bundle imports the inlined HTML as a raw string (Vite `?raw` import)
  so the committed `.mjs` is self-contained.
- Root `tsconfig.json` `include` stays `src/**`; `scripts/` gets its own config.
- The emitted `.mjs` is ESM (`"type": "module"` already in root package.json).
- No SvelteKit: no adapter, no `+server.ts`, no SSR, no prerender — one page,
  client-side, the CLI's Node server provides the API.

### Failure modes
- If `vite-plugin-singlefile` is stale/missing for the Vite version in the
  tree, pin it as a direct devDependency.
- If any asset is not inlined by `assetsInlineLimit: Infinity`, the build would
  emit multiple files — verify the output is a single `index.html`.
- The committed `.mjs` should not contain absolute paths from the build host.

### Scenarios
- Clean build from a fresh clone: `npm i && <build> && node
  skills/grilling/grilling-cli.mjs --help` works with no build step beyond the
  committed `.mjs`.
- Re-running the build is idempotent (emits the same path, overwrites cleanly).
- Root `npm run typecheck` ignores `scripts/` (no errors from scripts/ source).
- The SPA build output is a single `index.html` (no separate JS/CSS files).

### Edge cases
- The committed `.mjs` should not contain absolute paths from the build host.
- No Svelte routes beyond the placeholder — the SPA is one page (`App.svelte`
  or equivalent), no router needed for v1.

## Constraints and dependencies

- D6/D-FE/D6s/D13: Vite + plain Svelte 5 (no SvelteKit), `vite-plugin-singlefile`
  + `assetsInlineLimit: Infinity`; one artifact; src in `scripts/`, emit to the
  skill dir; own tsconfig.
- This slice gates every later slice (they all need the committed `.mjs`).
- Does NOT implement real CLI logic, the server, or the graph SPA — only the
  pipeline + placeholders.
