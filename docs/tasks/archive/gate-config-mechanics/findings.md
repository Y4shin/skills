# gate-config-mechanics — findings

> Research artifact for task `gate-config-mechanics` (map `gate-skills-by-repo`).
> Primary source: pi 0.80.10 installed at
> `/nix/store/46l2syffzlyylqhs4mlzaxxyj5ivglry-pi-coding-agent-0.80.10/lib/node_modules/pi-monorepo/`
> (cited as `PI/...` below). All claims are from that tree; no web sources used.

## Question investigated

Can the `task-workflow` extension read, at factory load time, two config
inputs — global `taskWorkflow.disableOnRepo` (regex array) from
`~/.pi/agent/settings.json`, and a per-project `taskWorkflow.enable` (bool,
default `true`) from `<cwd>/.pi/settings.json` — and does pi's typed
`Settings` schema keep an unknown top-level `taskWorkflow` key at all?

Three sub-questions: **Q-A** schema survival, **Q-B** extension access to
settings, **Q-C** project-override mechanics + the truth table.

## Sources and relevant passages

### Q-A — Settings parse is `JSON.parse` + a migration pass that does NOT strip unknown keys

`PI/dist/core/settings-manager.js:182-185` — the actual load:

```js
const settings = JSON.parse(content);
return SettingsManager.migrateSettings(settings);
```

`PI/dist/core/settings-manager.js:188-251` — `migrateSettings` only
touches four *known* legacy keys (`queueMode`, `websockets`, `skills`,
`retry.maxDelayMs`); it never iterates all keys and never deletes unknown
ones. It returns the same object it received.

`PI/dist/core/settings-manager.js:253-259` — accessors return the full
parsed object:

```js
getGlobalSettings()  { return structuredClone(this.globalSettings); }
getProjectSettings() { return structuredClone(this.projectSettings); }
```

No zod/schema/`stripUnknown`/whitelist anywhere in the module
(verified: `rg "zod|strict\(\)|stripUnknown|additionalProperties"` → no
hits in `settings-manager.js`).

**Verdict (Q-A): unknown top-level keys are PRESERVED.** A top-level
`taskWorkflow` object in both `~/.pi/agent/settings.json` and
`<cwd>/.pi/settings.json` survives parse and is readable via
`getGlobalSettings()` / `getProjectSettings()`. No fallback config home
is needed. ✅ D2's chosen config path is viable as-is.

### Q-B — The extension factory and its event handlers get NO SettingsManager

`PI/dist/core/extensions/types.d.ts:839` `interface ExtensionAPI` and
`:1067` `type ExtensionFactory = (pi: ExtensionAPI) => void`. The factory
receives only `pi: ExtensionAPI`.

`PI/dist/core/extensions/loader.js:181` `createExtensionAPI(extension,
runtime, cwd, eventBus)` — the API is built from `extension`, `runtime`,
`cwd`, `eventBus` only. No `settingsManager` is passed in.

`PI/dist/core/extensions/types.d.ts:208-235` `interface ExtensionContext`
(the `ctx` handed to every event handler) exposes `cwd`, `ui`, `mode`,
`sessionManager` (read-only), `modelRegistry`, `model`, `getSystemPrompt()`,
… — **no `settingsManager`**. Confirmed by `rg "settingsManager"
dist/core/extensions/{loader,runner}.js` → no hits.

So: the extension cannot ask pi for the merged settings. It must read the
two settings **files itself** with `node:fs` and do its own merge. This is
safe and cheap (two small JSON reads, once per repo-root per session).

**Implication for the feature tasks:** the "never register" load-time
path from the idea **is** possible — the factory can synchronously read
both files at the top (it has `process.cwd()` and `os.homedir()`), compute
the gate decision, and skip `registerTool`/`pi.on` before any registration.
No need to defer to a hook. ✅ `gate-tools-and-injection` slice 1's
load-time plan stands.

### Q-C — Project settings path, deep-merge direction, and the truth table

`PI/dist/config.js:394` `export const CONFIG_DIR_NAME =
pkg.piConfig?.configDir || ".pi";` → `.pi`.

`PI/dist/core/settings-manager.js:56-58` `FileSettingsStorage`
constructor:

```js
this.globalSettingsPath  = join(resolvedAgentDir, "settings.json");          // ~/.pi/agent/settings.json
this.projectSettingsPath = join(resolvedCwd, CONFIG_DIR_NAME, "settings.json"); // <cwd>/.pi/settings.json
```

`PI/dist/config.js:397,412-417` — `getAgentDir()` returns
`process.env.PI_CODING_AGENT_DIR` if set, else `~/.pi/agent`. So the global
path honors that env override; the extension should read the same path
(prefer `getAgentDir`-equivalent logic, or just `~/.pi/agent/settings.json`
with the env fallback, to match pi exactly).

`PI/dist/core/settings-manager.js:9` `deepMergeSettings(base, overrides)`
and `:144` `this.settings = deepMergeSettings(this.globalSettings,
this.projectSettings);` → **project is the `overrides` arg → project
wins** (for primitives/arrays; nested objects are recursively merged with
project winning per-key).

`deepMergeSettings` semantics (`settings-manager.js:9-30`):
- `overrideValue === undefined` → keep base (so an absent project key does
  not null out a global one).
- nested plain objects → merge recursively (`{...base, ...override}`).
- primitives and arrays → override wins outright.

#### Final truth table (implements D2's intent)

The gate decision is: **active iff (`disableOnRepo` matches this repo's
normalized origin) AND (`project.taskWorkflow.enable` is not `false`).**

| `disableOnRepo` matches? | `project.taskWorkflow.enable` | gate active? | meaning |
| --- | --- | --- | --- |
| no | *(absent / `true`)* | **no** | personal repo — load everything (current behaviour) |
| no | `false` | **yes** | personal repo that the user wants quiet — opt-out escape hatch (a personal repo can still ask for the gate; e.g. a personal fork of a work repo) |
| yes | *(absent / `true`)* | **yes** | work repo — gate everything (the primary case) |
| yes | `false` | **no** | work-org repo the user re-enables locally (e.g. this very `Y4shin/skills` is personal, but if it moved under QNCGmbH the user could force-enable) |
| `disableOnRepo` empty/absent | *(anything)* | **no** | gate disabled globally — current behaviour everywhere |

This satisfies D2 ("a personal repo that trips a pattern can re-enable
locally") and adds the symmetric escape hatch (a non-matching repo can
opt *out* via `enable:false`), which is the simplest semantics consistent
with the grilling intent. **Recommend the feature tasks implement exactly
this table.** The `enable:false` opt-out row is the one the map left in
Fog; this pins it.

Note the merge nicety: because `deepMergeSettings` keeps base when
override is `undefined`, a project file with `taskWorkflow.enable`
*absent* leaves any global `taskWorkflow` intact — so the global
`disableOnRepo` is readable from the merged object too. The extension
can read either the two files separately or a self-merged object; reading
both files and applying the table above is the clearest.

## Findings and confidence

- **Q-A preserved — high confidence.** `JSON.parse` + `migrateSettings`
  (known-keys-only) + `structuredClone` accessors; no schema validation
  anywhere. An unknown `taskWorkflow` key round-trips through settings.
- **Q-B no SettingsManager in extension — high confidence.** Both the
  factory API and the handler `ExtensionContext` lack it (verified by type
  decl + grep of loader/runner). Extension must self-read the files.
- **Q-C paths + merge + truth table — high confidence.** `CONFIG_DIR_NAME`
  is `.pi`; project path is `<cwd>/.pi/settings.json`; project overrides
  global; env `PI_CODING_AGENT_DIR` relocates the global dir.

## Recommendation / decision input (for dependent tasks)

1. **`gate-detection-helper` / `gate-config-reader`:** read two files
   yourself with `node:fs`:
   - global: `join(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"), "settings.json")`
   - project: `join(findRepoRoot(cwd), ".pi", "settings.json")` (use the
     `.git`-ward walk; project settings are at the repo root, not cwd,
     when cwd is a subdir — match pi's `resolvePath(cwd)` which is the
     session cwd, but reading at the repo root is safer and matches
     intent).
   - `JSON.parse` each (wrap in try/catch — a malformed file should fail
     *open*: log a diagnostic and treat as personal, matching the
     feature task's fail-open decision). Extract `taskWorkflow.disableOnRepo`
     (coerce non-array to `[]`) and `taskWorkflow.enable` (default `true`,
     coerce non-bool).
   - Apply the truth table above.
2. **`gate-tools-and-injection`:** the load-time "never register" path is
   confirmed viable. Compute the gate at the top of the factory (synchronous
   fs reads), then `if (!gate.active) { registerTools…; pi.on(injection)… }`.
   Fail-open on read error → personal.
3. **`gate-skills-prompt-and-help`:** `before_agent_start` *does* receive
   the full `systemPrompt` (`BeforeAgentStartEvent.systemPrompt`,
   `types.d.ts:514-520`) and its result can return `systemPrompt`
   (`BeforeAgentStartEventResult`, `types.d.ts:787`) — **prompt rewrite is
   safe**. ✅ The strip-handler slice stands. (`/help`/skill-list and
   `/skill:` interception are still open for *that* task to resolve — not
   in scope here.)

## Impact on dependents

- `gate-detection-helper`: unblocked — has its config read shape + truth table.
- `gate-tools-and-injection`: unblocked — load-time gating confirmed.
- `gate-skills-prompt-and-help`: partially unblocked — prompt-rewrite
  confirmed safe; still must resolve `/help` suppression and `/skill:`
  enforcement in its own slices.
- `gate-config-docs-and-defaults`: will document this truth table + the
  `PI_CODING_AGENT_DIR` env caveat.

## Unresolved questions (handed to other tasks, NOT this one)

- Whether `/help` / skill-list can be suppressed by an extension (for
  `gate-skills-prompt-and-help` slice 2).
- Whether `/skill:<name>` expansion can be intercepted (for
  `gate-skills-prompt-and-help` slice 3).
- Project-settings-path nuance: pi uses `<resolvedCwd>/.pi/settings.json`
  (session cwd), but a repo with cwd in a subdir would put `.pi` at the
  subdir, not the repo root. For the gate, reading at the **repo root**
  (walk to `.git`) is the correct intent — `gate-detection-helper`
  should note this and test it. Not blocking.

## No return-to-Wayfinder trigger

Q-A's answer is "preserved", so D2's config home stands unchanged. The
map does not need revision. Proceeding to the feature tasks.
