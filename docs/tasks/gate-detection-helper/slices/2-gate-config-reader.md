---
kind: slice
slug: gate-config-reader
title: config reader (disableOnRepo + enable) + reader→isWorkRepo integration test
task: ../task.md
mode: afk
status: todo
size: s
blocked_by:
  - gate-detection-core
---

# gate-config-reader

## End-to-end behavior

A thin config reader (`readGateConfig(cwd, settingsGetter)`) extracts
`disableOnRepo` (string[]) and `taskWorkflow.enable` (bool, default `true`)
from the shape confirmed by `gate-config-mechanics`, and an integration test
wires reader → `isWorkRepo` for one SSH-work and one HTTPS-personal fixture.
After this slice the full `tests/repo-gate.test.ts` matrix passes and the
factory can drop the module in.

## Acceptance criteria

- `readGateConfig` returns `{ disableOnRepo: string[], enable: boolean,
  diagnostics: string[] }`.
- When the config home is "top-level `taskWorkflow` in settings" (the
  `gate-config-mechanics` default): missing key → `disableOnRepo: []`,
  `enable: true`, no diagnostics.
- Non-array `disableOnRepo` → coerced to `[]` with a diagnostic. Non-boolean
  `enable` → defaults to `true` with a diagnostic. Invalid regex inside the
  array → that entry skipped + diagnostic, the rest kept.
- Integration test: global `disableOnRepo: ["^github\\.com[:/]QNCGmbH/.*$"]`,
  cwd fixture `~/Projects/openai` (SSH origin) → `isWorkRepo` active. Same
  patterns, cwd `~/.pi/agent/git/github.com/Y4shin/skills` (this repo,
  personal origin) → not active. With `enable: false` in the project override
  on the QNCGmbH repo → not active (override re-enables — confirm direction
  per `gate-config-mechanics`).
- `npm test` and `npm run typecheck` pass.

## Test plan

- **Seams:** `readGateConfig` takes a `settingsGetter` (a function returning
  the parsed settings object) so tests inject fixtures without real files.
  The integration test uses the `fs.mkdtempSync` `.git/config` fixtures from
  slice 1.
- **Failure modes:** malformed `taskWorkflow` object, regex compile error,
  missing global settings file.
- **Scenarios:** the two example repos from the idea (QNCGmbH GitHub,
  anwaltde Bitbucket) and this personal repo, each × `enable` true/false.
- **Edge cases:** `disableOnRepo` present but `enable` absent; `enable`
  present but `disableOnRepo` absent; both absent (current behaviour).

## Constraints and dependencies

- Blocked by `gate-detection-core` (needs the pure core) and by
  `gate-config-mechanics` (needs the confirmed config shape + truth table).
- If `gate-config-mechanics` finds the config must live in a self-read file
  (not settings), this slice reads that file instead — adjust the getter
  seam accordingly, keep the same return shape.
