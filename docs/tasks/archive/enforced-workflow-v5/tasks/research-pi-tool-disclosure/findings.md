---
type: findings
title: Pi progressive tool disclosure mechanics
status: stable
---

# Pi progressive tool disclosure mechanics

## Question investigated

What exactly does the Pi harness support for progressive tool disclosure, and
what is the minimal mechanism for a workflow skill to activate its toolset on
entry and deactivate it on exit, keyed to a skill invocation?

The target design is the v5 rule that workflow tools are disclosed only while
a workflow skill is active, with one opener that gates a phase and activates
a toolset, and one closer that deactivates it. This research answers the
mechanics so the downstream grilling and prototype tasks do not guess.

## Sources and passages

All paths are relative to the Pi install root
`/nix/store/9srx0akrz64sch01qlnga15wfklyzifp-pi-coding-agent-1.0.0/lib/node_modules/pi-monorepo`
unless the path names this repo.

Documentation:

- `docs/extensions.md:152-186` (`### Tool exposure`), the exposure levels and
  the activation rules.
- `docs/extensions.md:180`, `prepareLoadout(loadout)` and `hiddenDeclarations`.
- `docs/extensions.md:184-186`, `setActiveTools()` and transcript recording.
- `docs/mcp.md:170-204`, the MCP exposure table and the codemode/tool_search
  reachability note.
- `docs/cli.md:141-172`, `tool_search` behavior and `defaultTools`.
- `docs/settings.md:36-56`, `defaultTools`.
- `docs/skills.md:38,78`, how skills load and the `allowed-tools` field.

Implementation reference (shipped dist of the same version):

- `dist/core/extensions/types.d.ts:374-388` (`ToolExposure`),
  `:415-435` (`ToolLoadout`, `ToolLoadoutChanges`), `:458-482`
  (`exposure`, `defaultActive`, `prepareLoadout`), `:864-886` (`InputEvent`,
  `InputEventResult`), `:1236-1246` (`getActiveTools`, `setActiveTools`).
- `dist/core/agent-session.js:1084-1166` (`setActiveToolsByName`,
  `_setActiveTools`, `_getCallableTools`, `_applyToolLoadout`),
  `:1284-1340` (`_installHiddenDeclarationsProjection`,
  `_restoreToolsFromTranscript`), `:1554-1562` (`before_agent_start` tool
  handling), `:2834-2862` (activation on registration), `:3305-3313`
  (`session_tree` restore), `:1658-1661` (input handlers before skill
  expansion), `:988` (stale context after session replacement).
- `dist/extensions/tool-search/tool.js:140-155` (`isSearchable`,
  `searchAndLoad`), `dist/extensions/tool-search/index.js:11`
  (`defaultActive: false`).
- `examples/extensions/plan-mode/index.ts` (`setActiveTools` and persistence
  across `session_start`), `examples/extensions/tools.ts` (branch restore on
  `session_tree`), `examples/extensions/dynamic-tools.ts` (registration
  timing), `examples/extensions/subagent/index.ts:300-346` (child process
  spawn).

Local repo:

- `src/pi.ts:81-104` (`gateSkillInvocation`), `:855-885` (current `tw_*`
  registration, `direct` by default), `:946-949` (`input` hook wiring).
- `src/core/repo-gate.ts` (gate truth table).

## Findings

Confidence is stated per claim. "Verified" means the claim is read from both
the docs and the shipped implementation, or from the implementation where the
docs are silent. "Unverified" means it is inferred and not directly confirmed.

### F1. The exposure levels and which are reachable without explicit activation (verified)

`ToolExposure` is `"direct" | "model-only" | "codemode" | "deferred" | "hidden"`
(`dist/core/extensions/types.d.ts:388`; `docs/extensions.md:155-160`).

- `direct` (default): declared to the model while active, and callable while
  active.
- `model-only`: declared to the model while active, never callable through
  `ctx.executeTool()`.
- `codemode`: callable whenever registered (from codemode scripts), listed by
  the `codemode` tool, not declared to the model unless activated.
- `deferred`: like `codemode`, but codemode does not list it; `tool_search`
  can find and activate it.
- `hidden`: registered but unreachable. The type comment is explicit:
  "Activating it has no effect" (`types.d.ts:383`). `_applyToolLoadout`
  filters hidden names out of the loadout, so `setActiveTools()` cannot
  activate a hidden tool at all
  (`dist/core/agent-session.js:1123-1125`: `return tool && this._getToolExposure(name) !== "hidden" ? [tool] : []`).

Only `direct` and `model-only` tools are activated on registration; the other
exposures are never activated on registration
(`docs/extensions.md:164`, `types.d.ts:385`). A `direct` or `model-only` tool
with `defaultActive: false` is registered but not activated, and is activated
only by `--tools`, `defaultTools`, or `setActiveTools()`
(`types.d.ts:471-476`; `dist/core/agent-session.js:2862`:
`_isActivatedOnRegistration` returns `_isDeclarable(name) && definition.defaultActive !== false`).

This is the crucial correction for the prototype task: `hidden` plus
`setActiveTools()` does not work. The bypass free way to keep a tool off until
an opener turns it on is `exposure: "direct", defaultActive: false`.

### F2. `deferred` is hidden until searched, not hidden entirely (verified)

`tool_search` searches the tools that are not declared to the model and
activates the matches. Its own predicate is:

```js
function isSearchable(exposure) {
    return exposure === "codemode" || exposure === "deferred";
}
```

(`dist/extensions/tool-search/tool.js:140-141`). `searchAndLoad` then calls
`tools.setActiveTools([...active, ...matches.map((match) => match.name)])`
(`tool.js:149-153`). So yes, `deferred` tools are reachable through
`tool_search`, and so are `codemode` tools. It is documented the same way:
"Tools with `codemode` or `deferred` exposure can be reached through either
indirect mechanism: codemode scripts can call them, and `tool_search` can load
them" (`docs/mcp.md:204`); "Tools loaded by `tool_search` are recorded in the
transcript and remain declared on that branch" (same line).

`codemode` and `deferred` tools are always callable from codemode scripts
regardless of the active set
(`dist/core/agent-session.js:1107-1112`, `_getCallableTools` includes
`exposure === "codemode" || exposure === "deferred"` unconditionally). So
`codemode` and `deferred` are both an indirect path that bypasses the active
set. `hidden` has no path at all.

Consequence for v5: `deferred` is the wrong exposure for a gated workflow
toolset, because a model can call `tool_search` and activate a gated tool
without going through the skill opener. `direct` plus `defaultActive: false`
has no such path: `tool_search` will not find it, and codemode will not call
it while inactive.

### F3. `setActiveTools()` interaction with declarations, `/tree`, resume, and fork (verified)

The active set is exactly the set of tools declared to the model:
"The active set (`pi.getActiveTools()`, `pi.setActiveTools()`) is the set of
tools declared to the model" (`docs/extensions.md:164`; `types.d.ts:1236-1246`).
Unknown and `hidden` names are ignored (`types.d.ts:1243`; the hidden filter
in `_applyToolLoadout`). Changes take effect on the next agent turn
(`dist/core/agent-session.js:1082`).

Recording: "Pi records the initial prompt and tool set in the transcript's
first system message, then appends tool and prompt changes before the next
model request" (`docs/extensions.md:186`). The change is stored as a system
message carrying `toolsAdded` / `toolsRemoved`
(`dist/core/agent-session.js:1297-1305`; `_preparePromptAndToolLoadout` builds
this patch at `:1267-1272`).

Restore on load and resume: `_restoreToolsFromTranscript` reads the current
system message's `toolsAdded` and re-applies it
(`agent-session.js:1332-1340`). On `/tree` navigation the same restore runs
before the `session_tree` event is emitted
(`agent-session.js:3305-3313`). On fork, the new session file continues from a
branch, so the restored loadout is whichever one that branch's transcript
declares. `tool_search`-loaded tools obey the same rule: "recorded in the
transcript and remain declared on that branch" (`docs/mcp.md:204`). Codemode
and deferred tools reachable only through those indirect mechanisms do not
depend on the active set, so they survive `/tree`, resume, and fork
(`docs/mcp.md:204`).

Caution: restored tool names that are not yet registered become pending and
are activated when they register (`agent-session.js:133-141, 2852`). Session
replacement invalidates the old extension context, so openers and closers must
use the fresh context after `fork`/`newSession`/`switchSession`
(`agent-session.js:988`).

### F4. `prepareLoadout` and `hiddenDeclarations` behavior and precedence (verified)

`prepareLoadout` is called by `_applyToolLoadout` whenever the active tools
change (`docs/extensions.md:180`; `agent-session.js:1126-1164`). It receives a
`ToolLoadout` with `declared` (the active tools), `callable`, `registered`,
`getExposure(name)`, and `getNamespace(name)` (`types.d.ts:415-425`). It
returns `ToolLoadoutChanges`: replacement `descriptions` for declared tools
(including its own), and `hiddenDeclarations`, defined as "Declared tools whose
declarations requests leave out. They stay active and callable, and the
transcript still declares them, so the active set survives `/tree` and
resume." (`types.d.ts:426-435`).

Precedence relative to `setActiveTools`: `setActiveTools` chooses the active
set first, then `_applyToolLoadout` runs the `prepareLoadout` hooks. A hook
can only rewrite descriptions of already active tools and hide their
declarations. It cannot activate a tool, cannot un-hide one, and cannot change
which tools are active. Multiple hooks compose in registration order:
`descriptions` from later hooks override earlier ones, `hiddenDeclarations`
union (`agent-session.js:1140-1149`). A hook that throws is reported as an
extension error and does not change the loadout (`agent-session.js:1150-1158`).

The hidden declarations are removed from every request by
`_installHiddenDeclarationsProjection`, which rewrites the projected
transcript only, while the stored transcript keeps them
(`agent-session.js:1284-1308`). The system prompt tool list is filtered to
match (`agent-session.js:1269-1270`, `:1237-1239`).

Practical reading: `prepareLoadout`/`hiddenDeclarations` is an orchestrator
feature for adjusting what the model sees while a tool is already active. It
is not the right lever for phase disclosure. `setActiveTools` is.

### F5. Per-agent scope of activation (verified for separate-process subagents)

Activation state is held on the `AgentSession`: the active name list, the tool
loadout on `this.agent.state.tools`, and `_hiddenDeclarations`
(`agent-session.js:1121-1166`; `:160-161`). Each `pi` process has one such
session.

Subagents run as separate child `pi` processes. The reference subagent
extension spawns `pi --mode json -p --no-session ...` per invocation
(`examples/extensions/subagent/index.ts:300, 308-346`). The installed
`pi-subagents` 0.34.0 does the same in both foreground and background modes
(`node_modules/pi-subagents/src/runs/foreground/execution.ts:191, 291-292`;
`src/runs/background/subagent-runner.ts:377-381, 927-929`). The child gets its
own extension runtime, its own session, and optionally an explicit `--tools`
allowlist (`node_modules/pi-subagents/src/runs/shared/pi-args.ts:120-137`).
Therefore an activation in the parent does not leak into a child, and a child
activation does not leak back to the parent. Fresh context: a child started
without a session begins from the default tool set plus its allowlist. Fork:
an in-process `ctx.fork()` continues a branch and restores that branch's
loadout (F3), so activations before the fork point are present and later ones
are independent.

This confirms the grilling task's starting answer that activation is
per-agent, so orchestrator agents open their own toolset and subagents rely on
their `tools:` allowlists. Confidence: verified from the installed source, not
from a live multi-agent run.

### F6. Which event carries a skill invocation (verified)

`/skill:<name>` arrives as an `input` event whose `text` is the raw command.
The ordering is explicit: `_runInputHandlers` runs first, then
`_expandSkillCommand` expands the skill body
(`dist/core/agent-session.js:1511`; `:1658-1661`). `InputEvent` carries `text`,
`images`, `source` (`"interactive" | "rpc" | "extension"`), and an optional
`streamingBehavior` (`types.d.ts:864-877`). Returning `{ action: "handled" }`
stops further processing (`types.d.ts:879-886`). The local repo already keys on
this exact shape: `gateSkillInvocation` slices the name after `/skill:` and
returns `handled` for gated names (`src/pi.ts:81-104`), wired at
`src/pi.ts:948`.

Limitation: a model-invoked skill load does not produce an `input` event. Per
`docs/skills.md:38`, "When a task matches, the model reads `SKILL.md` and
follows its instructions." There is no harness event announcing "skill X is
now active" for that path. So an input hook keyed on `/skill:<name>` catches
explicit human invocation only. The robust keying is the skill body itself:
its first instruction calls the opener, its last instruction calls the closer.

### F7. `allowed-tools` is inert in this Pi build (verified by absence)

`docs/skills.md:78` lists `allowed-tools` as "Experimental pre-approved tool
list". A search of the shipped `dist` for `allowed-tools` / `allowedTools`
finds no implementation. In this version the field is parsed from frontmatter
but not used for activation or disclosure, so skills cannot line up their
toolset with disclosure through `allowed-tools` alone.

### F8. `before_agent_start` is a second activation point (verified)

`before_agent_start` handlers may mutate
`event.systemPromptOptions.selectedTools`, or call `setActiveTools()` for a
side effect. The source notes: "An explicit edit wins; otherwise the live
loadout is authoritative, so a `setActiveTools()` call is not undone here."
(`agent-session.js:1554-1562`). This is a clean place to arm a toolset for the
coming turn, but it fires on every prompt, so it cannot serve as the closer.

## Recommended minimal opener/closer recipe

Design constraints that follow from the findings:

- The gated workflow tools must be `exposure: "direct", defaultActive: false`.
  Not `hidden` (F1: cannot be activated), not `deferred`/`codemode` (F2:
  reachable through `tool_search` and codemode without the opener).
- Only the opener, a closer, and a small always-declared read-only oracle stay
  as ordinary `direct` active tools.
- Activation and deactivation go through `setActiveTools()`, which persists
  across resume, `/tree`, and fork via the transcript (F3).

Registration (one extension, `src/pi.ts` shape):

```ts
// Workflow tools: registered, off until an opener turns them on.
const WORKFLOW_TOOLS = ["tw_show", "tw_get", "tw_frontier", "tw_write_spec", /* ... */];
for (const name of WORKFLOW_TOOLS) {
  pi.registerTool({
    name,
    description: /* ... */,
    parameters: /* ... */,
    exposure: "direct",
    defaultActive: false,
    async execute(/* ... */) { /* ... */ },
  });
}

// Opener, closer, and oracle: always declared.
pi.registerTool({ name: "tw_open", exposure: "direct", /* ... */ });
pi.registerTool({ name: "tw_close", exposure: "direct", /* ... */ });
pi.registerTool({ name: "tw_next", exposure: "direct", /* ... */ });
```

Opener and closer bodies:

```ts
const TOOLSETS: Record<string, string[]> = {
  wayfinder: ["tw_show", "tw_get", "tw_frontier"],
  // ...
};

function openToolset(names: string[]): void {
  pi.setActiveTools([...new Set([...pi.getActiveTools(), ...names])]);
}

function closeToolset(names: string[]): void {
  const drop = new Set(names);
  pi.setActiveTools(pi.getActiveTools().filter((n) => !drop.has(n)));
}

// tw_open({ skill, effort })
//   1. Check gate preconditions (the illegal-transition refusal).
//   2. openToolset(TOOLSETS[skill]); persist the open phase with pi.appendEntry.
//   3. Return the legal next calls.
// tw_close()
//   1. closeToolset(currentOpenSet); clear the persisted phase.
```

Keying to the skill invocation:

- Preferred and mandatory fallback: every workflow skill's first step is
  "call `tw_open({ skill, effort })`" and its last step is "call `tw_close`".
  This keys on the skill loading. It works for both `/skill:<name>` and
  model-invoked loads (F6).
- Optional immediate arm: an `input` hook that matches `/skill:<name>` and
  calls `openToolset` right away (`src/pi.ts:81-104` is the pattern). It only
  fires for explicit commands, so it is an optimization, not the mechanism.
- Persistence: because `setActiveTools` is recorded in the transcript, the
  open survives resume, `/tree`, and fork on the branch (F3). To be robust
  against a restored branch, persist the open phase with `pi.appendEntry` and
  re-apply it on `session_start` and `session_tree`, mirroring
  `examples/extensions/plan-mode/index.ts` and
  `examples/extensions/tools.ts`.
- Optional safety net: an `agent_settled` handler can call `closeToolset`
  when a persisted phase state says the skill finished. It must be
  state-driven, because `agent_settled`/`agent_end` fire after each run, not
  only at skill exit.

Bypass check for this recipe: with `direct` plus `defaultActive: false`, the
model can reach a gated tool only through the opener. It cannot reach it via
`tool_search` or codemode (F1, F2). The remaining paths are configuration
(`--tools`, `defaultTools`) and another trusted extension, which are out of
the model's reach.

## Impact on dependents

### grill-disclosure-mechanics

- The harness does not constrain the dispatcher question. One
  `tw_open({ skill, effort })` and per-skill openers both work, since both are
  just extensions calling `setActiveTools()`.
- `deferred` plus `tool_search` is confirmed worse for gating: `tool_search`
  can activate a deferred tool without the opener (F2). The bypass-free choice
  is `direct` plus `defaultActive: false`.
- "What stays always declared": only the opener, the closer, and the read-only
  oracle need ordinary `direct` activation. Everything gated is
  `defaultActive: false`.
- Auto-close is not a harness feature. The closer must be an explicit tool
  call from the skill, or a state-driven handler on a lifecycle event (F6,
  F8). The grilling task should decide between `tw_close` alone and
  `tw_close` plus a state-driven `agent_settled` net.

### grill-gate-model-and-write-lockdown

- The gate surface and the disclosure surface are the same tools, so the
  opener is both the precondition check and the activation point. Named
  transition tools such as `tw_write_spec` should be `direct` plus
  `defaultActive: false`, activated by the opener.
- The `tool_call` guard on `write`, `edit`, and `bash` is independent of
  disclosure. It blocks regardless of the active set, so it survives even if a
  tool is somehow active.

### prototype-open-close-gating

- The prototype's stated alternative "`hidden` exposure plus
  `pi.setActiveTools()`" cannot work: hidden tools are unreachable and
  activating one has no effect (F1, `types.d.ts:383`,
  `agent-session.js:1123-1125`). The prototype must use `direct` plus
  `defaultActive: false` (or the bypass-prone `deferred` if it wants to
  demonstrate the bypass).
- The prototype should add two checks beyond visibility: that a gated tool
  cannot be surfaced by `tool_search`, and that open/close survive `/tree` and
  resume through transcript restoration (F3).
- The `tool_call` write guard is orthogonal and should be tested separately,
  since it does not depend on the active set.

## Unresolved questions

- Live confirmation of the open/close lifecycle across `/tree`, resume, and
  fork. The source strongly implies it works (F3), but only the prototype can
  demonstrate it. Treat the transcript-restore path as verified-by-source, not
  verified-by-run.
- Whether `hiddenDeclarations` is ever preferable to `setActiveTools` for
  disclosure. It hides the declaration but keeps the tool active and callable
  (F4), which is not the phase gate the effort wants. Not tested live.
- Whether `agent_settled` is a safe place for an auto-close safety net, given
  retries, recovery, and queued continuations that can follow a run.
- Whether the actual `pi-subagents` runtime passes the workflow extension to
  children in every mode and how its `tools:` allowlists interact with a
  `defaultActive: false` set. This was read from source, not run.
- Timing detail for an opener called during an `input` handler relative to the
  recording of the first request. The ordering says the handler runs before
  skill expansion (F6) and the loadout is recorded before the request
  (F3), but this exact sequence was not exercised live.
- Whether `allowed-tools` will be wired in a later Pi version. It is inert now
  (F7), so it cannot be relied on.
