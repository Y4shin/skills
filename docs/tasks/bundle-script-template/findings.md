# Bundle-script-template prototype — findings

> Task: `bundle-script-template` (type: prototype, map:
> `portable-skill-authoring`). Two questions, one throwaway project:
> (1) the optimum reusable "bundle a helper script + deps into one committed,
> self-contained, runnable file" template for **Python** and **JS/TS**;
> (2) a smoke test of all 17 grilling-settled default-stack picks at the
> **floor** runtimes (Python 3.10 / Node 20 LTS).
>
> The throwaway code lives in `prototype-bundle/` (gitignored — code is not
> committed; these findings are). The user hands no extra restrictions beyond
> the settled floor, so: internet allowed at *build* time; end-user *runtime*
> stays self-contained (no installs, no required external CLI tools); keep a
> readable source + commit the artifact; permissive-license default.

## TL;DR — chosen bundle template per language

| Language | Chosen template | Build command (one-liner) | Artifact | Size (smoke) |
|---|---|---|---|---|
| **Python** | **`zipapp` (stdlib)** + `uv pip install --target` vendoring | `python -m zipapp pkg/ -m "pkg.cli:main" -o helper.pyz -c` | `helper.pyz` | 11.3 MB |
| **JS/TS** | **the project's existing bundler if it has one; else `esbuild`** | (programmatic API — see below) | `helper.mjs` | 4.3 MB |

Both artifacts run on the **bare floor runtime** (no venv / no `node_modules`),
confirming the self-contained contract.

## Setup — floor runtimes pinned via devenv

Per the user's instruction, a `prototype-bundle/devenv.nix` pins the floor
runtimes (not the dev machine's 3.13 / Node 22):

```nix
{ pkgs, ... }: {
  packages = [ pkgs.python310 pkgs.nodejs_20 pkgs.git pkgs.uv ];
}
```

`devenv.yaml` pins `nixpkgs` to `github:NixOS/nixpkgs/nixos-25.05` because the
default (cachix/devenv) snapshot has **removed both floor runtimes** — see the
meta-finding below. Verified shell:

```
python: Python 3.10.19
node:   v20.19.6
uv:     uv 0.7.22
```

## Question 1 — bundle template comparison

### Python: `zipapp` (stdlib) vs `shiv` (pip-driven)

Same trivial helper (a small CLI using `click` + `httpx`, so the bundle is
non-trivial) built both ways on the floor 3.10, then run on the bare floor
python (no venv, `env -u PYTHONPATH -u VIRTUAL_ENV`).

| Path | Build steps | Artifact | Size | Bare-floor run | Notes |
|---|---|---|---|---|---|
| **`zipapp` (stdlib)** | `uv pip install --target build/deps`; copy deps + your pkg into `build/pkg`; `python -m zipapp build/pkg -m "helper_pkg.cli:main" -o helper.pyz -c` | `helper.pyz` | 723,952 B | **✅ exit 0**, correct JSON (echo + httpbin fetch + derived len) | One-liner over a vendored dir; stdlib only; zero config. |
| `shiv` (pip-driven) | `uv venv`; `uv pip install shiv build`; build a wheel (`python -m build --wheel`); `python -m shiv -c helper -o helper.pyz --compressed -r requirements.txt build/wheels/*.whl` | `helper.pyz` | 734,823 B | ❌ `ModuleNotFoundError: No module named 'helper_pkg'` at runtime (entry-resolution friction) | Needs a `pyproject.toml` + wheel build + correct console-script name; fights nix's externally-managed python; shiv's internal pip resolves `.` against a temp cwd (can't see `pyproject.toml` directly). |

**Verdict — Python: `zipapp` (stdlib).** It's a one-liner over a vendored deps
dir, needs no third-party build tool, no `pyproject.toml`, and ran clean on the
first proper build. `shiv`'s pip-driven model adds real friction: it requires
an installable project (wheel), a correct console-script name, and still hit
entry-resolution failure at runtime in this prototype. The ~10 KB size
difference is negligible; the ergonomics gap is large. `pex` was not tried
(heavier still, same pip-driven class as shiv).

**Reusable Python template (the row a follow-up feature task folds into
`references/support-scripts-python.md`):**

```bash
# 1. Vendor deps into a dir (floor python; --target avoids touching site-packages).
uv venv --python python3 .venv && source .venv/bin/activate
uv pip install --python "$(command -v python3)" --target build/deps -r requirements.txt

# 2. Compose the zip root: deps + your package(s) side by side.
mkdir -p build/pkg && cp -r build/deps/* build/pkg/ && cp -r src/your_pkg build/pkg/

# 3. Build the .pyz (-m generates __main__.py; -c compresses).
python -m zipapp build/pkg -m "your_pkg.cli:main" -o dist/helper.pyz -c
```

- **Keep the readable source** (`src/your_pkg/cli.py`) alongside the committed
  `.pyz` for patching (per the grilling's "runnable AND readable" principle).
- **Min-version contract:** the `.pyz` shebang is `#!/usr/bin/env python3`; if
  the helper needs a floor newer than the user's python, the script's `main`
  must check `sys.version_info` and error with a useful "install at least 3.10"
  message (and an agent reading that error must consult the user before
  installing — never silently install an interpreter).
- **Run on the bare floor:** `python3 helper.pyz <args>` — no venv, no
  `PYTHONPATH`, no installed libraries.

### JS/TS: `esbuild` vs `rollup` vs `vite`

Same trivial helper (TS, `commander` + built-in `fetch`) built three ways on
the floor Node 20, then run on the bare floor node (no `node_modules`,
`env -u NODE_PATH`).

| Path | Config | Artifact | Size | Bare-floor run | Notes |
|---|---|---|---|---|---|
| **`esbuild`** | one binary, ~zero config; programmatic API for the banner | `helper.mjs` | 127,481 B | **✅ exit 0**, correct JSON | Needs a `createRequire` banner when bundling CJS deps (commander is CJS); CLI `--banner:js` is literal (a `\n` stays on one line) — use the JS API. |
| `rollup` | needs `@rollup/plugin-node-resolve` + `@rollup/plugin-commonjs` + `@rollup/plugin-typescript` | `helper.mjs` | 133,801 B | **✅ exit 0** after adding `commonjs()` plugin | Choked on commander's ESM/CJS interop without `@rollup/plugin-commonjs` ("default is not exported by commander/index.js"). Same `createRequire` banner needed. |
| **`vite`** (lib mode) | `defineConfig({ build: { lib, rollupOptions: { external: node:* } } })` — the repo's existing bundler (`scripts/build.ts`) | `helper.mjs` | 120,258 B (smallest) | **✅ exit 0** | Cleanest config; smallest artifact; matches the repo's existing precedent. Same `createRequire` banner needed. |

**Verdict — JS/TS: use the project's existing bundler if it has one; else
`esbuild`.** This endorses the grilling's heuristic. This repo's existing
bundler is **Vite** (`scripts/build.ts` already emits a single committed
`.mjs` for `grilling-with-ui`), so for skills produced *in this repo* the
template is Vite lib-mode. For a produced skill whose target repo has no
bundler, **`esbuild`** is the lean default — one binary, ~zero config, fastest.
`rollup` is viable but needs three plugins to match esbuild's out-of-box
behavior and still hit a CJS-interop error without `commonjs()`.

**Reusable JS/TS template (the row a follow-up feature task folds into
`references/support-scripts-js-ts.md`):**

```js
// build.mjs — programmatic esbuild (the JS API avoids the CLI's literal-banner
// newline pitfall and lets the createRequire banner be a real string).
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

// The createRequire banner is ONLY needed when bundling CJS deps (e.g. commander,
// picocolors). If every dep is ESM-native, omit it. Use a namespace import alias
// to avoid colliding with deps that import createRequire themselves.
const needsCjsShim = true; // set based on whether any dep is CJS
const banner = needsCjsShim
  ? "#!/usr/bin/env node\n" +
    'import * as _nodeModule from "node:module";\n' +
    "const require = _nodeModule.createRequire(import.meta.url);\n"
  : "#!/usr/bin/env node\n";

await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/helper.mjs",
  packages: "bundle",
  external: ["node:*"],          // node: builtins resolve at runtime
  banner: { js: banner },
});

// Ensure shebang is line 1 + make executable.
let s = readFileSync("dist/helper.mjs", "utf8");
if (!s.startsWith("#!")) writeFileSync("dist/helper.mjs", banner + s);
```

- **Keep the readable source** (`src/cli.ts`) alongside the committed `.mjs`.
- **`.ts` only with a committed runnable `.mjs`** (per the grilling: never ship a
  `.ts` that needs `tsc`/`tsx` at the end user's runtime).
- **Min-version contract:** check `process.version` / `process.versions.node`
  and error with "install at least Node 20" if older (agent must consult the
  user before installing).
- **The createRequire banner is conditional** — only when a bundled dep is CJS.
  The repo's own `grilling-cli.mjs` doesn't need it (all ESM-native deps). When
  in doubt, include it; the namespace-import alias (`_nodeModule`) avoids
  collisions with deps that import `createRequire` themselves.

## Question 2 — 17-slot stack smoke test

A "kitchen-sink" script per language exercises one representative use case per
slot, bundled with the chosen template, then run on the **bare floor runtime**
(no venv / no `node_modules`). **Both pass all 17 slots.**

### Python — all 17 PASS (floor 3.10, 11.3 MB `.pyz`)

```
{"slot":1,"name":"click","ok":true,"note":"v8.5.0"}
{"slot":2,"name":"httpx","ok":true,"note":"status=200"}
{"slot":3,"name":"PyYAML","ok":true,"note":"safe_load ok"}
{"slot":4,"name":"rich","ok":true,"note":"console print ok"}
{"slot":5,"name":"marshmallow","ok":true,"note":"load ok"}
{"slot":6,"name":"pathlib","ok":true,"note":"glob ok"}
{"slot":7,"name":"subprocess","ok":true,"note":"run ok"}
{"slot":8,"name":"datamodel-code-generator","ok":true,"note":"import ok (codegen is authoring-time)"}
{"slot":9,"name":"bottle","ok":true,"note":"v0.13.4"}
{"slot":10,"name":"bottle(rest)","ok":true,"note":"route decorator ok"}
{"slot":11,"name":"tenacity","ok":true,"note":"retried 2x"}
{"slot":12,"name":"jinja2","ok":true,"note":"render ok"}
{"slot":13,"name":"mistune","ok":true,"note":"md render ok"}
{"slot":13,"name":"beautifulsoup4","ok":true,"note":"parse ok"}
{"slot":14,"name":"difflib","ok":true,"note":"diff ok"}
{"slot":15,"name":"datetime","ok":true,"note":"fromisoformat+tz ok"}
{"slot":16,"name":"csv","ok":true,"note":"write/read ok"}
{"slot":17,"name":"dulwich","ok":true,"note":"init ok (pure-Py)"}
```

Notable: **dulwich's pure-Python fallback worked** (Repo.init with no C
accelerators) — confirms the grilling's gate-1 reasoning. **marshmallow
bundled cleanly** (no compiled core, unlike the rejected pydantic).

### JS/TS — all 17 PASS (floor Node 20, 4.3 MB `.mjs`)

```
{"slot":1,"name":"commander","ok":true,"note":"parse ok"}
{"slot":2,"name":"fetch(builtin)","ok":true,"note":"status=200"}
{"slot":3,"name":"yaml","ok":true,"note":"parse ok"}
{"slot":4,"name":"picocolors","ok":true,"note":"red ok"}
{"slot":5,"name":"zod","ok":true,"note":"parse ok"}
{"slot":6,"name":"tinyglobby","ok":true,"note":"glob ok"}
{"slot":7,"name":"tinyexec","ok":true,"note":"exec ok"}
{"slot":8,"name":"@hey-api/openapi-ts","ok":true,"note":"authoring-time codegen; generated fetch client is 0-dep (not bundled here)"}
{"slot":9,"name":"hono","ok":true,"note":"app constructed"}
{"slot":10,"name":"hono(rest)","ok":true,"note":"route ok"}
{"slot":11,"name":"async-retry","ok":true,"note":"retried 2x"}
{"slot":12,"name":"eta","ok":true,"note":"render ok"}
{"slot":13,"name":"marked","ok":true,"note":"md ok"}
{"slot":13,"name":"cheerio","ok":true,"note":"parse ok"}
{"slot":14,"name":"diff-match-patch","ok":true,"note":"diff ok"}
{"slot":15,"name":"date-fns","ok":true,"note":"formatISO=2026-09-03T14:00:00+02:00"}
{"slot":16,"name":"papaparse","ok":true,"note":"parse ok (3 rows)"}
{"slot":17,"name":"isomorphic-git","ok":true,"note":"init ok"}
```

Notable surprises found while exercising the picks (all resolved, none change
a pick, but the references should mention them):
- **`@hey-api/openapi-ts` is authoring-time only** (~12 MB, uses `__filename`).
  Importing the codegen tool into a runtime bundle is a test bug, not a pick
  failure — only the generated `fetch` client ships at runtime (0 deps via
  `globalThis.fetch`), exactly as the grilling designed. Don't bundle-import
  the codegen tool.
- **`diff-match-patch`'s class export is `diff_match_patch`** (lowercase with
  underscores), NOT `diffMatchPatch`. The reference example should use the
  correct name.
- **`tinyexec` exports `exec` / `x`**, not `execa` (a common confusion with the
  separate `execa` package).
- **The `createRequire` banner collides** if a bundled dep also imports
  `createRequire` from `node:module` (cheerio/undici do) — use a namespace
  import alias (`import * as _nodeModule from "node:module"`) to avoid
  `SyntaxError: Identifier 'createRequire' has already been declared`.

## Meta-finding (NOT a floor change — a test-tooling note)

The default `nixpkgs` snapshot used by `devenv` has **removed both settled floor
runtimes** from its *packaging*:

- `nodejs_20` — removed: "Node.js 20 support was removed given upstream
  End-of-Life on 2026-04-30" (nixpkgs alias, added 2026-07-13).
- `python310` — being dropped for NixOS 26.05 (nixpkgs issue #515284).

This prototype worked around it by pinning `nixpkgs` to `nixos-25.05` (which
still ships both) in `prototype-bundle/devenv.yaml`.

**The floor stays Python 3.10 / Node 20 LTS.** The floor is a *minimum-
compatibility target*, not a recommendation: a produced skill must still run on
the lowest version real users have, and EOL-but-still-widely-installed runtimes
are exactly that (long-tail machines, locked-down CI images, conda envs,
Ubuntu LTS, Apple's Xcode CLT python, etc.). Raising the floor to 3.11/Node 22
would *break* skills for users who haven't upgraded — the opposite of what a
portable skill should do. nixpkgs dropping the *packaging* of an interpreter is
a **test-tooling availability** problem, NOT a floor-reconsideration signal;
other distros/channels still ship both runtimes, and users in the wild still
run them. The references should continue to target 3.10/Node 20 as the floor,
*without recommending* them (the min-version contract already says "install at
least X"; the skill-creator body can add "prefer the current LTS where you
control the runtime" as non-normative guidance).

**Action for the follow-up feature task (not Wayfinder):** when it sets up the
floor-test devenv for the references' own validation, it must pin an older
nixpkgs (e.g. `nixos-25.05`) to get 3.10/Node 20 — the default snapshot no
longer has them. No change to the declared floor, no re-pick of any library
slot (all 17 pass at the current floor).

## Consequences for dependent tasks

- **A follow-up `feature` task (raised via Wayfinder, not pre-created)** folds
  the per-language template (build command + artifact shape + where the
  committed artifact lives + the keep-readable-source note) **and the verified
  stack** into `skills/skill-creator/references/support-scripts-python.md` and
  `references/support-scripts-js-ts.md`. The smoke-test pass means no slot needs
  re-picking; the references can bake in the Q7 table as-verified. That same
  follow-up also carries the floor-test devenv nixpkgs-pin note above (no floor
  change).
- That follow-up is **independent of `build-skill-creator-skill`**, which ships
  policy-level bundling + a pointer in its slice 5 and is **not** blocked on
  this prototype or the follow-up (per the task's "Decision or implementation
  tasks it should unblock" section).
- No Wayfinder follow-up is raised by this prototype: all 17 picks pass at the
  floor (no slot needs re-picking) and the floor itself is unchanged (the EOL
  note is a test-tooling pin, handled by the feature follow-up above).

## Throwaway artifact disposition

Per the prototype skill's "delete throwaway code unless the task explicitly
says to keep it" rule, `prototype-bundle/` is gitignored (`.gitignore`:
`prototype-bundle/`) and is NOT committed. These findings are the durable
artifact. The devenv pin (`prototype-bundle/devenv.nix` + `devenv.yaml`) is
the only setup needed to reproduce; the build scripts under
`prototype-bundle/{py,js}-bundle-compare/` and `prototype-bundle/smoke-{py,js}/`
are the reproducible evidence (rebuild + run on the floor via
`devenv shell bash <script>`).
