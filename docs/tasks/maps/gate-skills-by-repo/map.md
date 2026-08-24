---
kind: map
slug: gate-skills-by-repo
title: Gate task-workflow resources by repo (no work-repo config)
status: active
tasks:
- slug: gate-config-mechanics
  blocked_by: []
  done: true
- slug: gate-detection-helper
  blocked_by:
  - gate-config-mechanics
  done: true
- slug: gate-tools-and-injection
  blocked_by:
  - gate-config-mechanics
  - gate-detection-helper
  done: true
- slug: gate-skills-prompt-and-help
  blocked_by:
  - gate-config-mechanics
  - gate-detection-helper
  done: false
- slug: gate-config-docs-and-defaults
  blocked_by:
  - gate-tools-and-injection
  - gate-skills-prompt-and-help
  done: false
---

## Destination

In a work repo (origin matches a configurable regex set), the `task-workflow`
package registers **none** of its resources automatically:

- no `task_*` tools, and no `notify_user` / `get_guidelines` / `list_guidelines`
  tools (the model never sees them, never calls them);
- its six skills are kept out of the system prompt **and** hidden from
  `/help` / skill-list surfaces to the extent pi's internals allow —
  suppressing as much as possible, per the grilling decision;
- no `before_agent_start` guidelines/subagent injection runs.

In a personal repo, everything works exactly as today (skills advertised, tools
registered, injection runs). `/skill:<name>` works in both repo types — but in
a work repo an explicit invocation either is prevented, or emits a one-line
"task-workflow is gated here" warning before loading (whichever pi allows),
per the grilling decision.

The gate is driven entirely by **global** config plus the repo's own `origin`
remote. No file is written into a work repo. A personal repo that happens to
match a `disableOnRepo` pattern can re-enable the package via a
`taskWorkflow.enable` override in that repo's `.pi/settings.json`.

Done looks like: a verified, unit-tested gate in `src/pi.ts`, default patterns
shipped, docs updated, and a manual confirmation pass in the two example work
repos and this personal repo showing the behaviour matches the matrix above.

## Constraints

- **No work-repo config.** The gate reads only global settings, a per-project
  personal `.pi/settings.json` override, and the repo's own `origin`. Nothing
  is written into a work repo.
- **No new extension.** All gating lives in `src/pi.ts`; no second file, no
  `~/.pi/agent/extensions/` entry.
- **Detection is remote-based, not content-based.** Match the normalized
  git `origin`, not `.cursor/rules/` or `AGENTS.md` (fragile — a personal repo
  could carry an anwalt.de rule tree). The origin is unambiguous and survives
  renames within the org.
- **Skills can't be un-loaded** (the manifest is always read); they can only
  be hidden from surfaces. Accept that trade-off.
- **Regexes are JS `RegExp`.** `disableOnRepo` is a list of strings compiled
  with `new RegExp(string)`. No mini-DSL.
- **One writer per file.** All gating in the single existing `src/pi.ts`
  factory; core modules stay pure data.

## Decisions so far

- **D1 (grilling Q1):** Gate `notify_user` too. *Everything* this package
  offers is disabled in work repos — `task_*`, `notify_user`,
  `get_guidelines`, `list_guidelines`, the guidelines/subagent injection, and
  skill auto-advertising. Clean work-repo context is the priority.
- **D2 (grilling Q2):** Two-layer config.
  - Global: `~/.pi/agent/settings.json` → top-level `taskWorkflow.disableOnRepo`
    (array of regex strings; empty/absent ⇒ gate disabled ⇒ personal
    everywhere — current behaviour).
  - Per-project override: `<repo>/.pi/settings.json` → top-level
    `taskWorkflow.enable` (bool, default `true`). A repo matching a
    `disableOnRepo` pattern can set `taskWorkflow.enable: false`→ wait, no:
    the override *re-enables* in a personal repo that matches a pattern. So
    `enable: true` in a matched repo means "still gate" is wrong — to be
    settled precisely by `gate-config-mechanics`: define the exact truth table
    (global disableOnRepo match × project enable) and the override's
    direction. Intent: a personal repo that trips a pattern can force-enable
    the package locally.
- **D3 (grilling Q3):** Suppress as much as possible. Strip the six skills
  from the system prompt **and** investigate suppressing them from
  `/help` / skill-list. If `/help` reads from the loaded set (not the prompt),
  `gate-skills-prompt-and-help` finds and applies whatever suppression path
  pi exposes; if none exists, document the residual as a known limitation.
- **D4 (grilling Q4):** Prevent explicit `/skill:<name>` invocation in a work
  repo if pi allows it; otherwise warn before loading. "Explicit is explicit"
  is no longer the default — the user wants the gate to be enforcing, not just
  cosmetic. `gate-skills-prompt-and-help` determines which is mechanically
  possible and implements it.

## Fog

- Exact truth table for `global.disableOnRepo` × `project.taskWorkflow.enable`
  (D2) — to be pinned by `gate-config-mechanics`. Is the override
  enable-or-disable, and does it win over a global match?
- Whether pi's `Settings` schema (a typed interface in
  `settings-manager.d.ts`) **strips** unknown top-level keys like
  `taskWorkflow` on parse, or silently keeps them. If stripped, the config
  must move under an allowed namespace or to a self-read file. This is the
  single biggest unknown and gates everything downstream.
- Whether `/help` / skill-list read from the prompt, the loaded set, or
  something an extension can intercept (e.g. a `resources_discover`
  result). D3 depends on this.
- Whether an extension can block or intercept `/skill:<name>` expansion
  (`_expandSkillCommand` in `agent-session.js`) to enforce D4, or only emit a
  warning via a hook.
- Whether `before_agent_start`'s returned `systemPrompt` is the *full* prompt
  (so a prompt-rewrite handler can strip skill blocks safely) or an *append*.
  The idea claims rewrite is possible; confirm before relying on it.
- Caching: the extension cache is keyed by cwd (`useExtensionCacheCwd`), so a
  work/personal switch re-runs the factory. Confirm the detection runs once
  per repo per session, not per turn.

## Out of scope

- The mirror gate in pi-aura (`engineering-workflow` package hiding its 14
  skills outside anwalt.de repos). Same detection, opposite default, separate
  package — tracked there, not here.
- Changing which resources the package offers (no new tools, no removed
  skills). The gate only hides what exists.
- Per-org or per-user allow/deny lists beyond the regex set. The
  `disableOnRepo` list is the only policy input.
- A TUI/middleware surface for editing `disableOnRepo`. It's hand-edited in
  global settings.
- Gating other global packages (pi-subagents, pi-telemetry, browser-goblin,
  etc.). Each package gates itself; this is only the `task-workflow` side.
