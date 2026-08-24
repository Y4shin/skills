---
kind: task
type: feature
slug: gate-detection-helper
title: isWorkRepo(cwd, patterns) + remote normalization, unit-tested
map: gate-skills-by-repo
status: ready
slices:
  - gate-detection-core
  - gate-config-reader
---

# gate-detection-helper — feature

## User-visible outcome

A pure, dependency-light TypeScript module exports the gate's detection
logic with a stable signature the factory in `src/pi.ts` can call at load
time. It is fully unit-tested in isolation (no pi runtime, no real git repo
required). The factory wiring that *uses* it is `gate-tools-and-injection`.

## User story

As the gate author, I want the detection logic (remote-origin reading,
normalization, regex matching, and the config-driven truth table) in one
tested module so the factory stays thin and the gnarly parts (SSH vs HTTPS,
no-origin, invalid regex) are verifiable without booting pi.

## Scope boundaries

- **In:** `normalizeRemote`, `readOriginRemote`, `isWorkRepo` (the truth
  table from `gate-config-mechanics`), plus a thin config reader that
  extracts `disableOnRepo` and `enable` from the shape confirmed by
  `gate-config-mechanics`. Unit tests for all of it.
- **Out:** wiring it into the factory (that's `gate-tools-and-injection`),
  and any pi-API calls. This module imports only `node:fs`, `node:path`,
  `node:child_process` (or reads `.git/config` directly), and the project's
  existing deps. No `@earendil-works/pi-coding-agent` import here.
- The module **must not** throw on invalid config; it returns
  `{ active: boolean, reason: string, diagnostics?: string[] }` so the
  factory can log and proceed.

## Acceptance criteria

- `src/core/repo-gate.ts` (or `src/repo-gate.ts` — match existing `src/core/*`
  convention for pure modules) exports:
  - `normalizeRemote(origin: string): string` — strips `scheme://`, `user@`,
    trailing `.git`, collapses `:`→`/` between host and path, lowercases the
    host. SSH and HTTPS produce the same `provider/org/repo`.
  - `readOriginRemote(cwd: string): string | null` — walks up from `cwd` to
    the first `.git`, reads `origin` from `.git/config` (preferred, no shell)
    or falls back to `git remote get-url origin` (cached per repo root for
    the session). `null` if no `.git` or no `origin`.
  - `isWorkRepo(cwd, globalPatterns, projectEnable): { active: boolean;
    reason: string }` implementing the **exact truth table** delivered by
    `gate-config-mechanics`. `projectEnable` defaults to `true`.
- `tests/repo-gate.test.ts` covers, with `vitest`:
  - `normalizeRemote`: the two SSH forms in the idea
    (`git@github.com:QNCGmbH/openai.git`, `git@bitbucket.org:anwaltde/plai-api.git`),
    the two HTTPS forms, a `.git`-less URL, a URL with a port, upper-case
    host. Each asserts the exact `provider/org/repo` string.
  - `readOriginRemote`: a temp dir with a synthetic `.git/config` `[remote
    "origin"] url = ...` → returns it; a temp dir with no `.git` → `null`;
    a `.git` with no `origin` → `null`. (Use `fs.mkdtempSync`, no real `git
    init` required — but a `git init`-based fixture is acceptable if simpler.)
  - `isWorkRepo` truth table: every row from `gate-config-mechanics`'s Q-C
    table, plus empty-`disableOnRepo` (gate disabled), invalid-regex
    (skipped + diagnostic, does not crash), and no-origin (personal).
  - Invalid regex: `disableOnRepo: ["["]` → that pattern is skipped, a
    diagnostic string is included, `active` reflects the remaining patterns.
- `npm test` passes; `npm run typecheck` (`tsc --noEmit`) passes.
- The module adds **no new runtime dependency**. `yaml` and `typebox` are
  already deps; prefer plain `node:fs`/regex.

## Existing abstractions to use

- The project already separates pure core (`src/core/*.ts`) from I/O
  (`src/pi.ts`). This module follows that split: pure logic in `src/core/`,
  any fs/git I/O in the same file but as small injectable seams for tests.
- `findRoot(start)` in `src/pi.ts` walks to `docs/tasks` or `.git` — reuse its
  walk-up pattern (or extract a shared `walkToGitRoot`) rather than
  duplicating. Keep the `.git` walk here; do not depend on `docs/tasks`.
- Match the existing `Type`/`typebox` usage only at the factory boundary; this
  module is pure TS, no schema types exported.

## Architecture / domain decisions

- **No shell-out if avoidable.** Prefer reading `.git/config` with `node:fs`
  (it's an INI-ish file; a tiny parser for the `[remote "origin"]` `url =`
  line is ~10 lines and avoids `child_process` + PATH issues in the pi
  sandbox). Fall back to `git remote get-url origin` only if `.git` is a
  gitfile (`.git` is a file, not a dir — `core.worktree`/`gitdir`). Document
  the fallback.
- **Cache by repo root.** `readOriginRemote` caches the resolved origin per
  repo-root path for the process lifetime so repeat calls in one session are
  free.
- **Truth table is data.** `isWorkRepo` takes the already-parsed
  `globalPatterns` and `projectEnable`; it does not read files. The *config
  reader* that reads settings is a separate, thin function the factory calls
  first. (Splitting logic from I/O keeps the truth table unit-pure.)
- **Diagnostics, not exceptions.** Every "bad input" path returns a reason
  string + diagnostics array; the factory logs via pi's startup diagnostics
  (per the idea's "invalid regex → reported via startup diagnostics, skipped").

## Slice plan

Two tracer-bullet slices, each independently verifiable:

### 1 — `gate-detection-core` (size: m, blocked_by: [])

End-to-end: `normalizeRemote` + `readOriginRemote` + the pure
`isWorkRepo(cwd, patterns, enable)` truth-table core, with unit tests for the
normalizer and the truth-table rows that do **not** depend on the config
reader (patterns passed in directly). After this slice, `npx vitest
tests/repo-gate.test.ts` passes for normalization + the truth table.

### 2 — `gate-config-reader` (size: s, blocked_by: ["gate-detection-core"])

The thin config reader that extracts `disableOnRepo` (string[]) and
`taskWorkflow.enable` (bool, default `true`) from the shape confirmed by
`gate-config-mechanics`, plus the integration test that wires reader →
`isWorkRepo` for one SSH-work and one HTTPS-personal fixture. After this
slice, the full `tests/repo-gate.test.ts` matrix passes and the factory can
drop the module in.

## Implementation notes

### Slice 1 — `gate-detection-core` (landed)

Landed into `task/gate-detection-helper` via `--no-ff` merge commit
`c788960`. Slice doc archived to
`docs/tasks/gate-detection-helper/slices/archive/1-gate-detection-core.md`.

New pure module `src/core/repo-gate.ts` (286 lines) exports:
- `normalizeRemote(origin)` — collapses SSH/HTTPS/gitfile URLs to lowercased
  `host/org/repo` (strips `scheme://`, `user@`, trailing `.git`, numeric ports).
- `walkToGitRoot(start, deps?)` — extracted walk-up helper reused from the
  `findRoot` pattern.
- `readOriginRemote(cwd, deps?)` — reads `.git/config` directly; falls back to
  `git remote get-url origin` for gitfile worktrees; caches per repo root.
- `isWorkRepo(origin, patterns, projectEnable)` — pure truth-table core with
  diagnostic-safe invalid-regex handling.

`tests/repo-gate.test.ts` — 28 vitest cases (209 lines): SSH/HTTPS
normalization (incl. port URLs, uppercase hosts, `.git`-less, trailing
slashes, empty origins), `walkToGitRoot`, `readOriginRemote` (synthetic
`.git/config`, missing origin, gitfile fallback, CLI failure), and every
truth-table row plus empty patterns, invalid regex, prefix vs full-match.

Verification: slice tests 28/28 pass; `npm run typecheck` clean. No linter
configured (N/A). The full `npm test` suite shows 16 pre-existing failures
in `tests/integration/session.test.ts` (`AuthStorage.inMemory` undefined in
the installed `@earendil-works/pi-coding-agent@0.80.10`), reproduced on the
base branch and untouched by this slice — a peer-dependency/environment
issue to escalate separately.

Divergence from plan: added `execSync` to the injectable `ReadOriginDeps` seam
so the gitfile-style `.git` fallback is unit-testable without shelling out; the
arch spec lists only `existsSync`/`readFileSync`/`isDir`. Also treats empty-string
`origin` as "no origin → personal" for robustness.
