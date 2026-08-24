## Deviation report — gate-detection-core

### API surface changes
- **Planned:** `isWorkRepo(cwd, globalPatterns: string[], projectEnable: boolean): { active: boolean; reason: string; diagnostics?: string[] }` — a pure truth-table core taking `cwd` and already-parsed inputs.
- **Actual:** `isWorkRepo(origin: string | null, patterns: string[], projectEnable = true): GateResult` — the first argument is a **normalized or raw origin URL**, not `cwd`. The function normalizes internally via `normalizeRemote(origin)`. There is no `cwd` parameter and no file-system access; callers must obtain the origin themselves (via `readOriginRemote`) before calling `isWorkRepo`.
- **Impact:** Slice 2 (`gate-config-reader`) must call `readOriginRemote(cwd)` first and pass the result into `isWorkRepo(origin, ...)`, rather than passing `cwd` through. The arch spec's "interface contract" said `isWorkRepo` takes `globalPatterns` + `projectEnable` directly — that part is honored — but the first positional argument changed from `cwd` to `origin`. This is a **signature deviation** that downstream slices must accommodate. The change is arguably cleaner (purer: no hidden fs), but it diverges from the spec's stated signature.

### Abstraction usage
- **Used the `findRoot` walk-up pattern?** Yes — `walkToGitRoot(start, deps)` reuses the `dirname` walk-up loop from `src/pi.ts:30` `findRoot`, stopping at `.git` only. `findRoot` itself was left untouched, as the spec required.
- **No new runtime deps?** Yes — confirmed: `git diff main..HEAD -- package.json package-lock.json` is empty. Only `node:fs`, `node:path`, `node:child_process` are imported. No INI library, no `yaml`/`typebox` usage here.
- **No pi import?** Yes — `src/core/repo-gate.ts` imports nothing from `@earendil-works/pi-coding-agent`. The module is pi-agnostic and unit-testable in isolation, as specified.

### Out-of-scope changes
- The **git CLI fallback** for gitfile-style `.git` was specified in the arch spec as a fallback for slice 1, and was implemented (the `else` branch in `readOriginRemote` calling `readOriginFromGitCli` via `execSync`). This is in scope, not out of scope. No out-of-scope additions detected — no edits to `src/pi.ts`, no new files beyond `src/core/repo-gate.ts` and `tests/repo-gate.test.ts`.

### Divergence from slice doc acceptance criteria
- All normalizeRemote examples pass (verified by 8 passing tests).
- `readOriginRemote` with synthetic `.git/config`, no-`.git`, and no-origin all pass (verified by 5 tests). Gitfile fallback is also tested (2 tests).
- `isWorkRepo` truth table: empty patterns → `{active:false, reason:"no disableOnRepo patterns"}` ✓; no origin → personal ✓; invalid regex → skipped + diagnostic ✓; all four truth-table rows pass (4 tests). The `npm run typecheck` passes clean. No divergence from the slice doc's stated acceptance criteria.
- **Minor:** The slice doc says `readOriginRemote` "takes an optional `readFile`/`exists` injectable for the fs/git parts" — the actual seam is a full `ReadOriginDeps` object `{ existsSync?, isDir?, readFileSync?, execSync? }`, which is richer (adds `execSync` for the gitfile path). This is a superset of what was specified, not a reduction, and aligns with the arch spec's `deps?: { existsSync, readFileSync, isDir }` (the arch spec itself listed those three; the implementation adds `execSync` to support the gitfile fallback, which the arch spec also mentioned). Acceptable.

### Task doc update needed?
**Yes — minor.** The task doc's `## Architecture notes` / arch spec interface contract should note that `isWorkRepo`'s first argument is `origin: string | null` (not `cwd`), so slice 2 wires `readOriginRemote(cwd)` → `isWorkRepo(origin, ...)`. The arch spec line 66 (`isWorkRepo(cwd, globalPatterns, projectEnable)`) should be corrected to `isWorkRepo(origin, patterns, projectEnable)` for slice 2's consumption.

### User attention needed?
**Yes — but minor.** The `isWorkRepo` first-argument changed from `cwd` to `origin`. This is a signature deviation from the spec. It makes the function purer (no hidden fs) and is arguably an improvement, but slice 2 must adapt. Recommend the parent update the arch spec's interface contract before slice 2 runs, so the tdd-worker for slice 2 isn't confused by the mismatch.

VERDICT: DEVIATION
