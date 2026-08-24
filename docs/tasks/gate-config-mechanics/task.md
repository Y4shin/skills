---
kind: task
type: research
slug: gate-config-mechanics
title: How does pi surface settings + project overrides to an extension, and does the Settings schema keep unknown top-level keys?
map: gate-skills-by-repo
status: done
blocked_by: []
completed_at: 2026-08-24T12:30:00Z
---

# gate-config-mechanics — research

## Precise question

The gate needs two config inputs available **inside the extension factory** at
load time:

1. **Global** `disableOnRepo`: an array of regex strings, read from
   `~/.pi/agent/settings.json`.
2. **Per-project override** `taskWorkflow.enable`: a boolean (default `true`),
   read from `<cwd>/.pi/settings.json`.

Three sub-questions, all about pi 0.80.10 internals, all answerable from the
installed pi source under
`/nix/store/46l2syffzlyylqhs4mlzaxxyj5ivglry-pi-coding-agent-0.80.10/lib/node_modules/pi-monorepo/`
(already inspected for this map; cite file:line):

- **Q-A (schema survival):** pi's `Settings` is a *typed* interface
  (`dist/core/settings-manager.d.ts`, the big `export interface Settings`).
  When `FileSettingsStorage` reads a JSON file containing an unknown top-level
  key like `taskWorkflow`, is the key **preserved** in the parsed object, or
  **stripped/validated** away? Trace `SettingsManager` parse/merge
  (`getGlobalSettings`, `getProjectSettings`, `deepMergeSettings` in
  `settings-manager.js`) to a definitive answer. If unknown keys are dropped,
  identify the fallback (existing extension-config namespace, or a self-read
  `~/.pi/task-workflow.json` file) and state exactly which path this task
  recommends.

- **Q-B (extension access):** Does the `ExtensionAPI` passed to the factory
  expose the `SettingsManager` (or merged settings) to the extension at all?
  Inspect `dist/core/extensions/types.d.ts` and `runner.js`. The factory gets
  `cwd` and an event bus; confirm whether it can read `getGlobalSettings()` /
  `getProjectSettings()` synchronously at load, or whether settings are only
  reachable inside event handlers (`session_start`, `before_agent_start`).
  If the latter, the detection runs at load but the config read is deferred
  — state the concrete call sequence the gate must use.

- **Q-C (project override mechanics):** Confirm `FileSettingsStorage`
  constructor uses `join(cwd, CONFIG_DIR_NAME, "settings.json")` with
  `CONFIG_DIR_NAME = ".pi"` (`dist/config.js`), and that
  `deepMergeSettings` deep-merges project over global. Then define the
  **exact truth table** the gate must implement for `enable` × `disableOnRepo
  match`:

  | global `disableOnRepo` matches this repo? | project `taskWorkflow.enable` | gate active? |
  | --- | --- | --- |
  | no | (default `true`) | no (personal — load everything) |
  | no | `false` | ??? (can a personal repo opt *out*? decide) |
  | yes | (default `true`) | yes (work — gate everything) |
  | yes | `false` | no (override re-enables — personal repo that trips a pattern) |

  Pin the `no/disable` row: does `enable:false` in a non-matching repo mean
  "gate anyway" (escape hatch for a personal repo the user wants quiet), or is
  `enable` only meaningful *against* a match? Recommend the simplest semantics
  that satisfy D2: **gate is active iff (`disableOnRepo` matches) AND
  (`project enable` is not `false`)**. Confirm this matches the grilling
  intent ("a personal repo that trips a pattern can re-enable locally").

## Decision this unblocks

- `gate-detection-helper`: needs the config *read path* (where
  `disableOnRepo` and `enable` come from) and the truth table.
- `gate-tools-and-injection` and `gate-skills-prompt-and-help`: need to know
  whether config is available at factory load or only inside hooks (affects
  whether gating is "never register" vs "register then suppress at turn
  time").
- The whole map: needs Q-A's answer to know whether `taskWorkflow` survives in
  settings at all. **If it does not survive, escalate back to Wayfinder**
  (the config home changes) rather than improvising.

## Trusted source boundaries

- Primary: the installed pi 0.80.10 source tree (path above). Cite `file:line`
  for every claim. Do not guess from memory.
- Cross-check the TypeScript declarations (`.d.ts`) against the compiled
  `.js` when behavior matters (declarations describe shape; `.js` shows
  runtime behavior — e.g. whether `JSON.parse` output is filtered through a
  schema or used as-is).
- Pi's own docs (`README.md`, `docs/`) only as secondary corroboration; the
  source is authoritative for 0.80.10.
- No web research required. This is a local-source question.

## Evidence required for completion

A short findings note (in this task's result / a `findings.md` next to the
task) recording:

1. **Q-A verdict** — preserved-or-stripped, with the exact `file:line` in
   `settings-manager.js` that proves it, and the chosen config path
   (top-level `taskWorkflow` in both files, *or* the named fallback).
2. **Q-B verdict** — does the factory get a `SettingsManager`? Exact
   `file:line` of the factory's argument shape (`createExtensionAPI`) and the
   read call the gate will use. If settings are hook-only, the exact hook
   and whether the gate can still "never register" (e.g. register nothing,
   read config on first `before_agent_start`, then no-op since nothing was
   registered).
3. **Q-C verdict** — the confirmed `CONFIG_DIR_NAME`, the deep-merge
   direction, and the **final truth table** the gate implements, in plain
   English the feature tasks can paste into their acceptance criteria.

## Likely dependent tasks

- `gate-detection-helper` (blocked, this task's output defines its config
  read shape).
- `gate-tools-and-injection` (blocked, needs Q-B).
- `gate-skills-prompt-and-help` (blocked, needs Q-B and Q-C's truth table).

If Q-A returns "stripped", return to Wayfinder: the config home decision (D2)
must be revised before the feature tasks can be written.
