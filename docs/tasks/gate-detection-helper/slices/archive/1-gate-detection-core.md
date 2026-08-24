---
kind: slice
slug: gate-detection-core
title: normalizeRemote + readOriginRemote + isWorkRepo truth-table core, unit-tested
task: ../task.md
mode: afk
status: done
size: m
blocked_by: []
---

# gate-detection-core

## End-to-end behavior

A pure module (`src/core/repo-gate.ts`) exports `normalizeRemote`,
`readOriginRemote`, and `isWorkRepo(cwd, patterns, enable)` (the truth-table
core). Running `npx vitest tests/repo-gate.test.ts` passes for the normalizer
and every truth-table row where patterns are passed in directly (no config
reader yet).

## Acceptance criteria

- `normalizeRemote("git@github.com:QNCGmbH/openai.git")` → `"github.com/QNCGmbH/openai"`
- `normalizeRemote("https://github.com/QNCGmbH/openai.git")` → `"github.com/QNCGmbH/openai"`
- `normalizeRemote("git@bitbucket.org:anwaltde/plai-api.git")` → `"bitbucket.org/anwaltde/plai-api"`
- `normalizeRemote("https://bitbucket.org/anwaltde/plai-api")` → `"bitbucket.org/anwaltde/plai-api"`
- `normalizeRemote` lowercases the host, strips a trailing `.git`, and
  collapses the host/path `:` to `/`.
- `readOriginRemote` on a temp dir with a synthetic `.git/config`
  `[remote "origin"]\n\turl = git@github.com:QNCGmbH/openai.git` returns that
  url; on a dir with no `.git` returns `null`; on a `.git` with no `origin`
  returns `null`.
- `isWorkRepo` implements the **exact truth table** from
  `gate-config-mechanics` Q-C (paste the table into a test table). Empty
  `patterns` → `{active:false, reason:"no disableOnRepo patterns"}`. No
  origin → personal. Invalid regex in `patterns` → skipped, diagnostic
  included, `active` reflects remaining patterns.
- `npm run typecheck` passes; no new runtime deps added.

## Test plan

- **Seams:** `readOriginRemote` takes an optional `readFile`/`exists`
  injectable for the fs/git parts so tests don't touch the real filesystem
  except via `fs.mkdtempSync` fixtures. `isWorkRepo` is pure — call directly.
- **Failure modes:** invalid regex (`"["`), missing `origin`, `.git` is a
  gitfile (not a dir) — each returns a safe `null`/diagnostic, never throws.
- **Scenarios:** the four SSH/HTTPS examples from the idea; a URL with a port
  (`ssh://git@github.com:22/QNCGmbH/x.git`); an upper-case host
  (`GIT@GitHub.com:QNCGmbH/x.git`).
- **Edge cases:** empty string origin, origin with a trailing slash,
  `.git`-less origin, a pattern that matches the full normalized string vs a
  prefix.

## Constraints and dependencies

- Blocked by `gate-config-mechanics` (needs the confirmed truth table and
  the `enable` semantics).
- Pure module only — no `@earendil-works/pi-coding-agent` import.
- Keep the `.git/config` parser tiny; do not pull in an INI library.
