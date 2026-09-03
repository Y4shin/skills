## Deviation report — fold-templates-and-stack

### API surface changes
- **Planned:** Three reference markdown files edited (`support-scripts-python.md`, `support-scripts-js-ts.md`, `support-scripts.md`) — fold in the concrete bundle templates + verified 17-slot stack tables + resolve the stale pointer. No other files touched.
- **Actual:** Exactly three files changed: `support-scripts-python.md` (+77/-12), `support-scripts-js-ts.md` (+127/-12), `support-scripts.md` (+4/-7). No SKILL.md, scripts, package.json, tests, or other references touched. No frontmatter changes. No new files created.
- **Impact:** None — the changes are additive to existing reference files only; the skill's structure tests and manifest are untouched.

### Abstraction usage
- Used/was specified: yes. Source of truth (`docs/tasks/bundle-script-template/findings.md` + Q7 table in `docs/tasks/support-script-conventions/task.md`) was followed faithfully — templates, gotchas, and stack tables match the findings exactly.

### Template accuracy

**(a) Python `zipapp` 3-step sequence** — matches the findings:
- Step 1: `uv pip install --python "$(command -v python3)" --target build/deps -r requirements.txt` (with the absolute-path pin comment explaining why — uses the floor 3.10, not a newer managed CPython). ✅
- Step 2: `mkdir -p build/pkg && cp -r build/deps/* build/pkg/ && cp -r src/your_pkg build/pkg/` (compose zip root). ✅
- Step 3: `python -m zipapp build/pkg -m "your_pkg.cli:main" -o dist/helper.pyz -c` (build the .pyz, `-m` generates `__main__.py`, `-c` compresses). ✅
- Keep-readable-source note present. ✅
- Min-version contract (`sys.version_info` check + "install at least 3.10" + agent-consults-user remark). ✅
- Bare-floor run invocation (`python3 dist/helper.pyz <args>`, no venv/PYTHONPATH). ✅
- `shiv`/`pex` rejected with the friction reason (wheel + console-script + fights externally-managed pythons + entry-resolution failure). ✅

**(b) JS/TS esbuild programmatic-API build** — matches the findings:
- Programmatic JS API (not CLI, avoiding the literal-banner-newline pitfall). ✅
- `createRequire` banner via namespace import alias (`import * as _nodeModule from "node:module"`). ✅
- `external: ["node:*"]` — node builtins resolve at runtime. ✅
- `format: "esm"`. ✅
- Conditional banner (`needsCjsShim` flag — omit when all deps are ESM-native). ✅
- "existing-bundler-else-esbuild" heuristic citing `scripts/build.ts` as the Vite precedent. ✅
- `.ts`-only-with-committed-`.mjs` rule (never ship a `.ts` needing `tsc`/`tsx` at runtime). ✅
- Min-version contract (`process.versions.node` check + "install at least Node 20"). ✅
- Keep-readable-source note. ✅

**(c) Three API gotchas** — all present and correct:
1. `diff-match-patch`'s class is `diff_match_patch` (lowercase with underscores), not `diffMatchPatch` — with a code example. ✅
2. `tinyexec` exports `exec`/`x`, not `execa` — with a code example. ✅
3. `createRequire` banner collides if a dep also imports it (cheerio/undici) — `SyntaxError: Identifier 'createRequire' has already been declared` — fix is the namespace import alias. ✅

### Stack tables
- **Python table**: 18 rows (17 slots, 13a/13b split) matching the Q7 Python column exactly. Every pick, every stdlib "no entry" slot, every qualifier (e.g. `dulwich` pure-Py fallback, `beautifulsoup4` stdlib `html.parser` backend, `datamodel-code-generator` gen dataclasses/TypedDict = 0 runtime deps). ✅
- **JS/TS table**: 18 rows matching the Q7 JS/TS column exactly. `commander` 14.x, `fetch`/`node:undici` (❌ axios), `yaml` (eemeli), `zod`, `tinyglobby`, `tinyexec`, `@hey-api/openapi-ts`, `hono` + vendored htmx, `async-retry`, `eta`, `marked`, `cheerio`, `diff-match-patch`, `date-fns`, `papaparse`, `isomorphic-git`. ✅
- Both tables carry the "verified at the floor (Python 3.10 / Node 20 LTS) via the `bundle-script-template` prototype" note + a link to `docs/tasks/bundle-script-template/findings.md`. ✅
- The findings doc is linked 2× in each per-language file (template section + table note) and 1× in the shared backbone. ✅

### Stale pointer resolved
- The shared `support-scripts.md` no longer says "template comes later from the prototype" or "fold-bundle-templates-into-refs folds the verified template" (0 matches for stale phrasing). ✅
- It now says: "The concrete build recipe is now folded into the per-language reference files (`support-scripts-python.md` and `support-scripts-js-ts.md`) — each carries the verified bundle template + the verified 17-slot stack table for its language." ✅
- The per-language files' own stale pointers ("the concrete template comes later from the prototype") are replaced with the actual templates. ✅

### No floor change / no library re-pick
- Floor stays Python 3.10 / Node 20 LTS (a minimum-compatibility target, not a recommendation). The Python file says "floor 3.10"; the JS/TS file says "Node floor = Node 20 LTS". No language recommends upgrading. ✅
- All 17 slots are presented as-verified (no re-pick, no "pending verification" caveat). ✅

### Out-of-scope changes
- None. Only the three specified reference files were edited. No SKILL.md, scripts, package.json, tests, or other reference files touched. No frontmatter changes. No new files. The per-language files do not restate the shared policy (0 matches for shared-policy section headings in either per-language file). ✅

### Task doc update needed?
- No. The task doc's `## Implementation notes` does not need updating from this slice — the slice delivered exactly what the task doc specified.

### User attention needed?
- No. No API surface changes, no scope changes, no deviations from the spec. The slice is spec-compliant on all acceptance criteria.
