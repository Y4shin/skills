## Deviation report — bundler-subproject

### API surface changes
- **Planned:** `scripts/build.ts` uses a two-step Vite build: (a) Svelte 5 SPA → inlined `index.html` via `vite-plugin-singlefile` + `assetsInlineLimit: Infinity`; (b) CLI TS → `skills/grilling/grilling-cli.mjs` with the HTML embedded as a raw string (Vite `?raw` import or read-at-build-time). `scripts/tsconfig.json` is a standalone config with `target: ES2022, NodeNext, strict`, includes `scripts/**/*.ts`, does NOT emit to root `dist`.
- **Actual:** `scripts/build.ts` matches the plan exactly — two-step Vite build, `viteSingleFile()` + `assetsInlineLimit: Infinity` + `cssCodeSplit: false` for the SPA step; CLI step uses `lib` mode with `formats: ["es"]` and embeds the HTML via `?raw` import. `scripts/tsconfig.json` is standalone with all the specified compiler options, but uses `include: ["**/*.ts"]` instead of `["**/*.ts"]` (functionally equivalent — both match all `.ts` files under `scripts/`). It also adds `noEmit: true`, `declaration: false`, `sourceMap: false` — minor, non-breaking additions that prevent the standalone config from emitting.
- **Impact:** None on dependent slices. The interface contract — `skills/grilling/grilling-cli.mjs` exists, is invokable as `node skills/grilling/grilling-cli.mjs <subcommand> [flags]`, and carries the inlined SPA HTML — is fully satisfied. Slice 2 can proceed without changes.

### Abstraction usage
- Used/was specified: **yes.** Vite 5.4.21 (already in tree) is used for both build steps. `vite-plugin-singlefile` (new devDep) inlines JS/CSS into a single `index.html`. `@sveltejs/vite-plugin-svelte` (new devDep) compiles the Svelte 5 SPA. No hand-rolled bundler. No SvelteKit (no adapter, no `+server.ts`, no SSR, no router). Root `tsconfig.json` `include` left as `src/**/*.ts`; `scripts/` gets its own config.

### Out-of-scope changes
- **Dependency version pinning:** The arch spec listed `svelte`, `@sveltejs/vite-plugin-svelte`, `vite-plugin-singlefile` as new devDependencies without version constraints. The latest `@sveltejs/vite-plugin-svelte` (v7) requires Vite 8, conflicting with the existing Vite 5.4.21. The worker pinned `@sveltejs/vite-plugin-svelte@^3` (compatible with Vite 5), `vite-plugin-singlefile@^2` (compatible with Vite 5.4.21+), and `svelte@^5`. This is a necessary version-selection detail, not a scope or API change.
- **`package-lock.json` update:** Large diff adding the new devDeps' transitive deps (`zimmerframe`, `vitefu`, `to-regex-range`, etc.) — expected from `npm install --save-dev`.
- **Test uses `process.cwd()` instead of `import.meta.dirname`:** The arch spec says tests live under `scripts/**/*.test.ts`; the worker noted that `import.meta.dirname`/`import.meta.url` resolve incorrectly under vitest's module transformation (path missing the `skills` segment), so the test uses `process.cwd()`. This is an implementation detail of the test harness, not a scope change.
- **`vite-plugin-svelte` v3 warning:** The build emits a non-fatal warning that Svelte 5.56 should use `vite-plugin-svelte@^4`, but v3 works correctly for this slice's needs. Non-blocking.

### Acceptance criteria check

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `scripts/tsconfig.json` exists, standalone, NOT in root `include` | ✅ | Root `include` is `["src/**/*.ts"]`; `scripts/tsconfig.json` is standalone with `include: ["**/*.ts"]` |
| 2 | `scripts/build.ts` runs two-step Vite build (a) SPA → inlined `index.html` (b) CLI → `grilling-cli.mjs` with embedded HTML | ✅ | Matches exactly: `viteSingleFile()` + `assetsInlineLimit: Infinity` for SPA; `lib` mode + `?raw` import for CLI |
| 3 | `grilling-cli.mjs` committed; `node … --help` exits 0, prints usage | ✅ | `.mjs` is committed (in the diff); `--help` prints usage and exits 0 (verified by seam 2 test) |
| 4 | Inlined SPA HTML present in bundle (placeholder text) | ✅ | `.mjs` contains `"grilling visualizer"` (verified by seam 3 test and direct grep) |
| 5 | `npm run typecheck` passes, does NOT type-check `scripts/` | ✅ | Root `include` stays `src/**`; `scripts/` has own config; seam 4 test confirms root typecheck passes |

### Edge cases check

| Edge case | Status | Notes |
|-----------|--------|-------|
| `.mjs` should not contain absolute paths from build host | ✅ | No `/home/`, `/tmp/`, `/Users/` patterns found. One relative source reference: `grilling-ui/src/App.svelte` — Svelte debug metadata, not an absolute path |
| No Svelte routes beyond placeholder | ✅ | One page (`App.svelte`), no router |
| Build output is single `index.html` (no separate JS/CSS) | ✅ | `scripts/grilling-ui/dist/` contains only `index.html` (verified by seam 5 test and direct `ls`) |

### Task doc update needed?
No. The `## Implementation notes` section does not need updating from this slice's deviations. The version-pinning detail is captured here and is not relevant to future slices' planning.

### User attention needed?
No. No scope changed and no API surfaces differ from the spec. The deviations are implementation details (version pinning, test path resolution, non-fatal build warning) that do not affect the interface contract or any dependent slice.
