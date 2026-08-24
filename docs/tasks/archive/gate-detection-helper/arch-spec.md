# Architecture spec: gate-detection-helper

> Task `gate-detection-helper`, map `gate-skills-by-repo`. Stable across both
> slice chains. Grounded in `gate-config-mechanics/findings.md` (pi 0.80.10
> source-confirmed).

## Shared notes (all slices)

- **New pure module:** `src/core/repo-gate.ts`. Matches the existing
  `src/core/*.ts` convention (pure data + small helpers; this one does tiny
  fs/git reads, kept behind injectable seams for tests). No
  `@earendil-works/pi-coding-agent` import — this module is pi-agnostic so
  it's unit-testable in isolation.
- **New test file:** `tests/repo-gate.test.ts` (vitest). Follows the
  `tests/state.test.ts` / `tests/art.test.ts` style (direct import, no
  harness). The integration harness (`tests/integration/harness.ts`) is for
  the factory-wiring tasks (`gate-tools-and-injection`), NOT this task.
- **Existing abstractions to use:**
  - `src/pi.ts:30` `findRoot(start)` walks up to `docs/tasks` **or** `.git`.
    Reuse its walk-up pattern, but extract a `walkToGitRoot(start)` that stops
    at `.git` only (do not depend on `docs/tasks` — this module must work in
    any repo). Keep `findRoot` untouched; add the new helper here.
  - `node:fs` + `node:path` only for I/O. `node:child_process` only as a
    fallback for gitfile-style `.git` (see slice 1). No new runtime deps
    (`yaml`, `typebox` already present but unused here).
- **Do NOT reimplement:**
  - No INI parser library — the `.git/config` `[remote "origin"]` reader is
    ~10 lines of `readFileSync` + a `url =` line scan.
  - No settings schema/merge — the gate reads two raw JSON files itself and
    applies the truth table; it does **not** replicate
    `deepMergeSettings` (per Q-B: the extension gets no SettingsManager).
  - No pi event hooks — this module is pure; the factory wiring is a later
    task.
- **Typebox** is used only at the `src/pi.ts` factory boundary (a later
  task). This module exports plain TS interfaces.
- **Fail-open policy:** any unreadable/missing config or detection error
  returns `{ active: false, reason: "...", diagnostics: [...] }` (personal —
  load everything). The factory logs `reason` + diagnostics but never throws.
  This is the feature task's acceptance criterion; the module embodies it.

## The truth table this module implements (from findings.md, Q-C)

`active = (disableOnRepo matches normalized origin) AND (project.enable !== false)`

| matches? | project.enable | active | meaning |
| --- | --- | --- | --- |
| no | true/absent | false | personal |
| no | false | true | personal repo opting out (escape hatch) |
| yes | true/absent | true | work repo (primary case) |
| yes | false | false | work-org repo re-enabled locally |
| empty/absent patterns | * | false | gate disabled globally |

## Slice 1 — gate-detection-core (size: m, blocked_by: [])

- **Exports:** from `src/core/repo-gate.ts`:
  - `normalizeRemote(origin: string): string` — strip `scheme://`, `user@`,
    trailing `.git`, collapse host/path `:` → `/`, lowercase host. SSH and
    HTTPS → same `provider/org/repo`.
  - `readOriginRemote(cwd: string, deps?: { existsSync, readFileSync, isDir }): string | null`
    — walk to `.git` (via `walkToGitRoot`); if `.git` is a dir, read
    `.git/config` and parse the `[remote "origin"]` `url =` line; if `.git`
    is a **file** (gitfile/worktree), fall back to `git remote get-url origin`
    via `child_process.execSync` (sync, cached per repo root). `null` if no
    `.git` or no `origin`.
  - `walkToGitRoot(start: string, deps?): string | null` — extracted helper.
  - `isWorkRepo(origin: string | null, patterns: string[], projectEnable = true): {
    active: boolean; reason: string; diagnostics?: string[] }` — pure
    truth-table core. **NOTE (slice-1 deviation, accepted):** the first arg is
    the **normalized or raw origin URL** (not `cwd`); callers call
    `readOriginRemote(cwd)` first and pass its result here. `isWorkRepo`
    normalizes internally via `normalizeRemote`. Invalid regex → skipped +
    diagnostic, never throws. Empty patterns → not active. No fs: this is
    deliberately pure.
  - A module-level origin cache: `Map<repoRoot, string>` keyed by repo root.
- **Existing abstractions to use:** `findRoot` walk-up pattern (extracted).
- **Do NOT reimplement:** the config reader (slice 2).
- **Interface contract (consumed by slice 2):** `isWorkRepo(origin, patterns,
  enable)` is pure — slice 2's `readGateConfig`/`resolveGate` calls
  `readOriginRemote(cwd)` to get the origin, then passes it into
  `isWorkRepo(origin, disableOnRepo, enable)`. The shapes `(string|null,
  string[], boolean)` and the `{active, reason, diagnostics}` return are the
  contract. Slice 2 must **not** re-detect the origin; it composes the two
  helpers.
- **Tests (`tests/repo-gate.test.ts`):** `normalizeRemote` matrix (SSH/HTTPS
  for github + bitbucket, port, uppercase host, `.git`-less, trailing
  slash); `readOriginRemote` via `fs.mkdtempSync` fixtures (with-origin,
  no-`.git`, no-origin, gitfile-style `.git`); `isWorkRepo` truth-table rows
  + empty patterns + invalid regex + no-origin. `npm run typecheck` clean.

## Slice 2 — gate-config-reader (size: s, blocked_by: ["gate-detection-core"])

- **Exports:** from `src/core/repo-gate.ts` (same file, appended):
  - `readGateConfig(cwd: string, deps?: { globalSettingsPath?, projectSettingsPath?, readFileSync }): { disableOnRepo: string[]; enable: boolean; diagnostics: string[] }`
    — reads **only config** (no origin, no `isWorkRepo` here):
      - global: `join(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"), "settings.json")`
        (honors the env override per findings Q-C).
      - project: `join(walkToGitRoot(cwd) ?? cwd, ".pi", "settings.json")`
        (repo-root, not session-cwd — see findings "project-settings-path
        nuance").
    - `JSON.parse` each (try/catch → fail-open: missing/malformed file
      contributes `[]`/`true` + a diagnostic, never throws).
    - Extract `taskWorkflow.disableOnRepo` (non-array → `[]` + diagnostic;
      invalid regex inside → that entry skipped + diagnostic, rest kept)
      and `taskWorkflow.enable` (non-bool → `true` + diagnostic). Returns
      `{ disableOnRepo, enable, diagnostics }`. **Does not call `isWorkRepo`.**
  - `resolveGate(cwd, deps?): { active, reason, diagnostics }` — the
    convenience entry point: reads origin via `readOriginRemote(cwd)`, reads
    config via `readGateConfig(cwd)`, then calls `isWorkRepo(origin,
    disableOnRepo, enable)`, merging diagnostics. This composition is what the
    factory will call in `gate-tools-and-injection`.
- **Existing abstractions to use:** `walkToGitRoot` (from slice 1);
  `os.homedir()`; `process.env.PI_CODING_AGENT_DIR`.
- **Do NOT reimplement:** `deepMergeSettings` — we read the two files and
  apply the table; we don't merge arbitrary keys.
- **Interface contract (consumed by `gate-tools-and-injection`):**
  `resolveGate(cwd) → { active, reason, diagnostics }`. That exact shape is
  the factory's gate decision. The downstream task will call this and
  branch on `active`.
- **Tests:** extend `tests/repo-gate.test.ts` — `readGateConfig` with an
  injectable `readFileSync` (no real files for the unit cases); one
  integration case using `fs.mkdtempSync` to write a real
  `~/.pi/agent/settings.json`-shape file + a `.git/config` fixture and
  asserting `resolveGate` for a QNCGmbH SSH origin (active) and this repo's
  origin (not active), including the `enable:false` override rows. `npm
  test` + `npm run typecheck` green.

## Cross-slice notes

- Both slices touch only `src/core/repo-gate.ts` + `tests/repo-gate.test.ts`.
  No edits to `src/pi.ts` (factory wiring is a later task).
- The origin cache and `walkToGitRoot` are shared; slice 1 defines them,
  slice 2 reuses.
- All public fns take an optional `deps` injection arg for test seams
  (matches the "small injectable seams" note); defaults use real `node:fs`.
