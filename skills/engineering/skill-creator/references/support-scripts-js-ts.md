# Support Scripts, JS/TS

Read when the chosen language is JS or TypeScript. The shared policy (when
to ship, language choice, self-contained-at-runtime, by-hand fallback,
shape, testing, runtime floor, default-stack picks) lives in
`support-scripts.md`, read it first. This file covers only JS/TS-specific
details.

## Runtime

JS/TS helpers run on **Node.js** (the default), **Deno**, or **Bun**:
whichever the target project already uses. Node floor = **Node 20 LTS**.

**Portability trade-off:** a Node/TS script needs a runtime the target harness
may not have. Unlike Python (nearly universally available), Node is not
guaranteed on every end-user machine. This is a **non-default by-hand/stop
fallback** per the shared safety decision in `support-scripts.md`: if the
end user may not have Node, the skill should either (a) document the Node
requirement in `compatibility` frontmatter, or (b) fall back to a by-hand
path if it is safe and deterministic, or (c) stop and require the script if
the op is dangerous. Don't assume Node is present.

## Self-contained at runtime: bundle into a committed artifact

When a JS/TS helper needs libraries, **bundling is endorsed**, bundle
deps + script into one **committed** runnable artifact via a build step:

- The build step produces a committed `.mjs` (or `.js`) that the end user
  runs with `node helper.mjs <args>`, no `node_modules`, no installed
  packages.
- **Keep the readable source** (`src/cli.ts` or `src/cli.mjs`) alongside the
  committed artifact for patching (the "runnable AND readable" principle).
  The artifact-only approach is rejected, it loses the patchable source.
- The build step + committed artifact are an **authoring concern** (the
  skill-author commits them), not run by the end user.

**Bundler heuristic:** use the target project's existing bundler if it has
one; if none, `esbuild` is the lean default (one binary, ~zero config,
fastest). In this repo, the existing bundler is **Vite** (`scripts/build.ts`
lib-mode), so for skills produced *in this repo* the template is Vite
lib-mode. For a produced skill whose target repo has no bundler, **esbuild**
is the lean default.

### Bundle template (JS/TS)

The concrete esbuild build, use the **programmatic JS API** (not the CLI,
whose `--banner:js` is literal and breaks on real newlines):

```js
// build.mjs, programmatic esbuild (the JS API avoids the CLI's literal-banner
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

- **Run on the bare floor:** `node dist/helper.mjs <args>`, no
  `node_modules`, no installed packages (the `.mjs` is self-contained).
- **The `createRequire` banner is conditional**, only when a bundled dep is
  CJS. If every dep is ESM-native, omit it. When in doubt, include it; the
  namespace-import alias (`_nodeModule`) avoids collisions with deps that
  import `createRequire` themselves.
- **Min-version contract:** the committed `.mjs` should check
  `process.version` / `process.versions.node` and error with "install at
  least Node 20" if older (an agent reading that error must consult the user
  before installing, never silently install an interpreter). See
  [Min-version contract](#min-version-contract) below.

> **Verified at Node 20 LTS** via the `bundle-script-template` prototype:
> the esbuild template produced a self-contained `.mjs` that ran clean on
> the bare floor runtime (no `node_modules`). See
> `docs/tasks/bundle-script-template/findings.md` for the build comparison
> and smoke-test results.

### API gotchas (from the smoke test)

Three library-specific surprises found while exercising the picks at the
floor (all resolved; none changes a pick, but watch out when writing the
helper):

1. **`diff-match-patch`'s class export is `diff_match_patch`**, lowercase
   with underscores, NOT `diffMatchPatch`. The reference example should use
   the correct name:
   ```js
   import { diff_match_patch } from "diff-match-patch";
   const dmp = new diff_match_patch();
   ```
2. **`tinyexec` exports `exec` / `x`**, not `execa` (a common confusion with
   the separate `execa` package). Use:
   ```js
   import { exec } from "tinyexec";  // or: import { x } from "tinyexec";
   ```
3. **The `createRequire` banner collides** if a bundled dep also imports
   `createRequire` from `node:module` (cheerio/undici do), you get
   `SyntaxError: Identifier 'createRequire' has already been declared`.
   The fix is the **namespace import alias** shown in the template above:
   `import * as _nodeModule from "node:module"` then
   `_nodeModule.createRequire(...)`, avoiding the collision.

## `.ts` only with a committed runnable artifact

Ship `.ts` source **iff** the build step commits a runnable artifact
(`.mjs`/`.js`). **Never** ship a `.ts` that needs `tsc`/`tsx` at the end-user
runtime, the end-user runtime stays dependency-free per the shared policy.
The committed artifact is what the end user runs; the `.ts` source is kept
for patching.

## Shebang

The committed artifact starts with:

```javascript
#!/usr/bin/env node
```

Make it executable (`chmod +x`), but also support `node helper.mjs`
invocation for agents that run it explicitly.

## Inputs

- **`process.argv`** for CLI arguments, or use `commander` (default-stack
  pick) for anything beyond trivial parsing.
- **stdin** for piped input when the script is part of a pipeline.
- Avoid interactive `readline` prompts unless the script's explicit purpose
  is human-interactive.

## Testing

Per the shared policy (Q4): test on a worked example with a known answer. If
the skill lives in a project with vitest/jest, use it. Otherwise run the
script directly on a known input and assert the output:

```bash
node helper.mjs --input known.json --output result.json
diff result.json expected.json  # known-good literal
```

When bundling, test the **committed `.mjs`** (what the end user runs), not
only the source. For a stdlib-only script with no bundler, the source *is*
the artifact.

## Min-version contract

Node floor = **Node 20 LTS**. The script should check `process.version` /
`process.versions.node` and error with "install at least Node 20" if older.
An agent reading that error must **consult the user before installing
anything**, never silently install an interpreter.

```javascript
const [major] = process.versions.node.split(".").map(Number);
if (major < 20) {
  console.error("Error: this script requires Node 20 LTS or newer. " +
    "Please install Node 20+. " +
    "(If you are an agent, ask the user before installing.)");
  process.exit(1);
}
```

Pin library majors that satisfy the floor (see the default-stack table in the
shared file for the concrete pins).

## Verified default-stack table (JS/TS)

The shared `support-scripts.md` lists the full default-stack table for both
languages. Below is the **JS/TS column**, verified at the floor (Node 20 LTS)
via the `bundle-script-template` prototype, every pick passed when bundled
into a self-contained `.mjs` and run on the bare floor runtime (no
`node_modules`).

| # | Slot | JS/TS pick |
|---|------|------------|
| 1 | CLI parsing | `commander` 14.x |
| 2 | HTTP requests | built-in `fetch` / `node:undici` (❌ axios, supply-chain backdoor) |
| 3 | config/env/secrets | `yaml` (eemeli) |
| 4 | formatting (LLM-facing) | *(plain text, no entry)* |
| 5 | validation/schemas | `zod` |
| 6 | FS traversal/globbing | `tinyglobby` |
| 7 | process/subprocess | `tinyexec` |
| 8 | OpenAPI client (codegen) | `@hey-api/openapi-ts` (gen fetch-based client = 0 runtime deps) |
| 9 | local interactive web UI | `hono` + vendored htmx |
| 10 | local REST API server | `hono` (JSON endpoints) |
| 11 | retry/backoff | `async-retry` |
| 12 | output templating | `eta` |
| 13a | markdown render | `marked` |
| 13b | HTML parse | `cheerio` |
| 14 | diffing/patching text | `diff-match-patch` |
| 15 | date/time | `date-fns` |
| 16 | tabular (CSV/TSV) | `papaparse` |
| 17 | git operations | `isomorphic-git` (no git binary) |

> Verified at Node 20 LTS via the `bundle-script-template` prototype, all 17
> slots passed on the bare floor runtime bundled into a self-contained
> `.mjs`. See `docs/tasks/bundle-script-template/findings.md` for the full
> smoke-test results.

## By-hand fallback

Per the shared safety decision in `support-scripts.md`, a by-hand fallback
is a considered, safety-first choice, not a default. Omit it for
dangerous/irreversible/non-obvious ops; provide it only when the path is
safe, deterministic, and within the agent's reliable capability. Do not
restate the shared policy here, refer to it.
