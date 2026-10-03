---
type: findings
title: Open/close disclosure and write guard prototype
status: stable
---

# Open/close disclosure and write guard prototype

## Question

Does a `tw_open` / `tw_close` pair reliably gate and disclose a workflow
toolset, and does a `tool_call` guard actually block `write`, `edit`, and
`bash` mutations under `docs/tasks/**` and `docs/bugs/**`?

The premise under test is `exposure: "direct", defaultActive: false`,
activated only by the opener. `hidden` cannot gate and `deferred` is
bypassable through `tool_search` (see
`tasks/research-pi-tool-disclosure/findings.md`, F1, F2, F3, F8).

## Prototype location

Throwaway, gitignored (`.work/` is in `.gitignore`), never shipped:
`docs/tasks/enforced-workflow-v5/tasks/prototype-open-close-gating/.work/prototype/`

- `index.ts` the throwaway extension (registration, opener-as-gate, closer,
  guard).
- `harness.mjs` the bounded SDK harness.
- `fixtures/efforts.json` the effort state table the gate reads (override with
  `TW_PROTOTYPE_STATE`); the live tree is not needed.

Nothing outside `.work/` was added except this findings file.

Two harnesses were used:

1. `harness.mjs`, an in-process run of the real Pi SDK from
   `PI_PACKAGE_DIR` (the running `pi` is 1.0.0), with no model call. It loads
   the extension through `DefaultResourceLoader.extensionFactories`, creates a
   `createAgentSession` with `SessionManager.inMemory()`, and inspects the
   active tool set, the system prompt, `tool_search`, and the registered
   `tool_call` handler.
2. A single bounded headless run:
   `timeout 120 pi -ne -ns -np -nc --no-session -e <abs-path-to-index.ts> -p "<prompt>"`.

## Observations

Each observation says whether it is observed or unverified and what produced
it.

### O1. Before open, the gated tools are absent and unsearchable (observed)

Command: `node harness.mjs` (67 checks, 0 failures: the original 49 plus the
18 gate checks added in O6).

- `tw_open` and `tw_close` are declared before open; `tw_show`, `tw_get`,
  `tw_frontier` are not in `session.getActiveToolNames()` and not in
  `session.systemPrompt`.
- Their reported exposure is `direct` in `session.getAllTools()`.
- A test-only `deferred` decoy (`tw_decoy_deferred`) IS found by
  `tool_search`, which proves `tool_search` works, while the three
  `direct` gated tools are NOT found and stay inactive after the search.

### O2. After `tw_open`, the gated tools are declared and callable (observed)

Command: `node harness.mjs`.

- Executing `tw_open` adds all three gated names to
  `session.getActiveToolNames()` and to `session.systemPrompt`, and makes them
  callable (`session.getCallableToolNames()`).
- Calling the gated tool returned `tw_show ran.`, so it is really callable.
- Note: a custom tool needs a `promptSnippet` to appear in the system prompt's
  tool section. Without it the tool is active and callable but not listed in
  the prompt. The authoritative "declared to the model" set is
  `getActiveToolNames()`.

### O3. After `tw_close`, the gated tools are absent and unsearchable again (observed)

Command: `node harness.mjs`.

- `tw_close` removes the three names from the active set and the system prompt.
- `tool_search` still cannot find them afterwards.

### O4. The `tool_call` guard blocks protected writes (observed)

Command: `node harness.mjs`, and one bounded headless run with the current
extension:

```
tw_tools: tw_open, tw_close
write_result: Direct write/edit/bash on docs/tasks/ and docs/bugs/ is locked. Make the change through the task-workflow tw_* tools. (blocked write docs/tasks/_guard_probe.md)
```

The attempted write target (`docs/tasks/_guard_probe.md`) did not exist
afterwards. The harness additionally observed:

- `write` to `docs/tasks/...` blocked, `write` to an absolute
  `docs/bugs/...` path blocked.
- `edit` under `docs/tasks/**` blocked.
- `bash` mutation in `docs/tasks` (`echo hi > docs/tasks/probe.md`) blocked,
  `bash rm -rf docs/bugs/old` blocked.
- `write`/`edit` outside the trees allowed; `bash ls docs/tasks` (read)
  allowed; `bash git status` allowed.
- The guard blocks while the toolset is open too, so it is independent of the
  active set (the research F8 note that the guard survives even if a tool is
  active).

The block reason returned to the model is the guard's `reason` string, which
the harness and the headless run both captured.

### O5. Repo tests are unaffected (observed)

Command: `npm test`. 14 files, 781 tests passed. No repo file was modified;
the prototype lives only under gitignored `.work/`.

### O6. The opener is also the gate: illegal targets refuse without opening (observed, harness-verified)

Command: `node harness.mjs`. The gate landed in the vocabulary grilling: the
opener is the precondition check, not only the activator.

`tw_open` now takes `{ skill, effort, target }`. When `target` is present it
reads the effort state first and checks that the target exists, that its
`workflow_state` is `ready` (or `in-progress`), that its same-kind `blocked_by`
blockers are all `done`, and that it is on the frontier. A refusal does NOT
activate the toolset, returns `details.opened === false`, and returns
`details.legal_next` plus text that names the legal next calls. Observed
refusals:

- missing target in `prototype` -> `["work ticket proto-ticket"]`.
- blocked target (`proto-blocked`, blocked by `proto-ticket`) ->
  `["work ticket proto-ticket"]`, reason names the blocker.
- done target (`proto-done`) -> `["work ticket proto-ticket"]` (other work is
  still open).
- not-ready target (`proto-todo`, `workflow_state: todo`) ->
  `["run to-tickets", "work ticket proto-ticket"]`.
- unknown effort -> `["run intake"]`.
- effort with a spec and no tickets -> `["run to-tickets"]`.
- effort with every ticket done -> `["run finalize-task"]`.

A sample refusal text: `Refused: target 'nope' does not exist in effort
'prototype'. Legal next calls: work ticket proto-ticket.` A legal target
(`proto-ticket`, `workflow_state: ready`, no blockers) returns
`details.opened === true` and activates the toolset. The effort state comes
from `fixtures/efforts.json`; the live `docs/tasks/` tree is not read.

### U1. Open and close survive `/tree`, resume, and fork (unverified)

The research shows this works by source (`setActiveTools()` changes are
recorded in the transcript as `toolsAdded` and re-applied on load, `/tree`, and
fork, F3). The prototype could not confirm it non-interactively. This is the
live reaction step below. Treat the transcript-restore path as
verified-by-source, not verified-by-run.

### U2. Bash command-string scanning is not sound (unverified, expected bypassable)

The prototype blocks a `bash` command only when the command string both names
a protected tree and matches a mutation pattern. Detection is a heuristic and
is expected to be bypassable (variables, aliases, scripts, `python -c`,
encoding). It was not attacked or fuzzed. The alternative is to move the
mutating operations into `tw_*` tools so bash never needs to touch the trees.

### U3. Keying the opener to a real skill invocation (unverified)

The prototype opens the toolset through a direct `tw_open` call, not through a
skill body. The research recommends the skill's first step call `tw_open` and
its last step call `tw_close` (F6). That wiring was not exercised.

### U4. Headless model behavior is one sample (unverified)

The bounded headless run is a single sample and does not prove a model will
always comply with the skill body or never retry. It confirms the mechanics,
not model behavior in general.

### U5. Pi version requirement (observed)

The repo's local `@earendil-works/pi-coding-agent` is 0.80.10 and has no
`exposure` field, no `defaultActive`, no `ToolExposure`, and no `tool_search`
in its types; the running global `pi` is 1.0.0, which has all of them
(`grep` over the two `dist` trees). The prototype ran against 1.0.0 via
`PI_PACKAGE_DIR`. Progressive disclosure depends on the 1.0.0 API.

### U6. The gate reads a fixture, not the live effort tree (unverified)

The prototype gate reads `fixtures/efforts.json` so the harness does not depend
on the live effort having tickets. Reading and computing the same frontier from
the real `docs/tasks/` scan (the `src/core/graph.ts` path) was not exercised.

## Chosen direction and rejected alternatives

Chosen:

- Gated workflow tools are registered `exposure: "direct", defaultActive:
  false`, activated only by the opener.
- `tw_open` and `tw_close` are ordinary always-declared `direct` tools.
- `tw_open` is also the gate: when given a phase target it checks the effort
  state before activating, and refuses without activating when the target is
  missing or illegal, naming the legal next calls.
- The write guard is an unconditional `tool_call` handler on `write`, `edit`,
  and `bash`, independent of the active set.

Rejected:

- `hidden` exposure plus `setActiveTools()`: hidden tools are unreachable and
  activation has no effect (F1). Confirmed by source; not re-tested.
- `deferred` exposure: `tool_search` can activate it without the opener (F2).
  The decoy in O1 demonstrates exactly that reachability.
- `prepareLoadout` / `hiddenDeclarations`: hides the declaration but keeps the
  tool active and callable (F4); it is not a phase gate.
- Tying the guard to the open state: the guard is a static lockdown, so it
  blocks direct mutation of the trees in every phase. Mutations are meant to
  go through `tw_*` tools.

## Decision-rich snippets

Registration options (the decision, trimmed):

```ts
// Gated toolset: off until an opener turns it on.
pi.registerTool({
  name,
  description: `Workflow tool ${name} (gated behind tw_open).`,
  promptSnippet: `Workflow tool ${name} (only while a workflow skill is open)`,
  parameters: Type.Object({}),
  exposure: "direct",
  defaultActive: false,
  async execute() { /* ... */ },
});
```

Opener as gate (check first, activate only when legal):

```ts
const gate = evaluateOpen(loadFixture(), args.effort, args.target);
if (!gate.ok) {
  return {
    content: [{ type: "text", text: `Refused: ${gate.reason}. Legal next calls: ${gate.legal_next.join("; ")}.` }],
    details: { opened: false, reason: gate.reason, legal_next: gate.legal_next },
  };
}
pi.setActiveTools([...new Set([...pi.getActiveTools(), ...WORKFLOW_TOOLS])]);
```

Closer (deactivation):

```ts
const drop = new Set(WORKFLOW_TOOLS);
pi.setActiveTools(pi.getActiveTools().filter((n) => !drop.has(n)));
```

Guard (blocks before execution, independent of the active set):

```ts
pi.on("tool_call", async (event) => {
  if (event.toolName === "write" || event.toolName === "edit") {
    const path = (event.input as { path?: unknown }).path;
    if (typeof path === "string" && isProtectedPath(path)) {
      return { block: true, reason: LOCKDOWN_REASON };
    }
  }
  if (event.toolName === "bash") {
    const command = (event.input as { command?: unknown }).command;
    if (typeof command === "string" && isProtectedBashMutation(command)) {
      return { block: true, reason: LOCKDOWN_REASON };
    }
  }
  return undefined;
});
```

## Consequences for `grill-disclosure-mechanics`

- The `direct` plus `defaultActive: false` gate works end to end: the tool is
  invisible and unsearchable before open, declared and callable after open,
  and invisible again after close (O1, O2, O3).
- `tool_search` is confirmed to be a real bypass for `deferred` (the decoy was
  found) and confirmed to leave `direct` gated tools alone.
- The opener and closer must stay ordinary always-declared tools; only the
  gated set flips.
- A gated custom tool needs `promptSnippet` to appear in the system prompt's
  tool section. `getActiveToolNames()` is the authoritative declared set.
- The one dispatcher versus per-skill opener question is not constrained by
  the harness; both just call `setActiveTools()`.
- Progressive disclosure needs pi 1.0.0. The repo currently resolves
  0.80.10, which lacks the API (U5). This likely forces a minimum-version or
  peer-dependency decision.
- The opener is also the gate: the same tool that discloses also checks the
  preconditions, so the phase transition and the disclosure flip together. A
  refused opener leaves the toolset closed (O6).

## Consequences for `grill-gate-model-and-write-lockdown`

- A `tool_call` handler returning `{ block: true, reason }` stops the call
  before execution and delivers the reason to the model (O4, model-facing
  observed in the headless run).
- The guard is orthogonal to disclosure and survives regardless of the active
  set, so it is the correct place for the write lockdown (O4).
- Because the guard is unconditional, the reason should tell the model to use
  the `tw_*` tools, not to call `tw_open`.
- `path` is the input field for `write` and `edit`; `command` is the input
  field for `bash`. Absolute and relative paths both need matching.
- Bash string scanning is a heuristic and expected to be bypassable (U2). The
  durable option is to move mutating operations into `tw_*` tools so bash does
  not need to touch the trees.
- The refusal is the second enforcement surface: it names the legal next calls
  (`work ticket X`, `run finalize-task`, `run intake`, `run to-tickets`)
  instead of only failing, and its shape is `{ opened: false, reason,
  legal_next }` (O6).

## What the user must do to react live

Run interactive Pi in the repo with the extension loaded (no discovery, so the
prototype is isolated):

```bash
cd /home/patric/Projects/skills-stricter-workflow
pi -ne -ns -np -nc \
  -e docs/tasks/enforced-workflow-v5/tasks/prototype-open-close-gating/.work/prototype/index.ts
```

Then react to the transcript-restore behavior (U1):

1. Ask the model to list its `tw_*` tools. Expect only `tw_open` and
   `tw_close`.
2. Call `tw_open`. Ask again. Expect `tw_show`, `tw_get`, `tw_frontier` now
   listed.
3. Open `/tree`, navigate to an earlier entry, then back to the leaf. Ask for
   the `tw_*` list again. Expect the open state to match the branch's
   transcript (open on the branch where `tw_open` ran).
4. Quit and resume the session (`pi -r` or `pi -c`, with the same `-e`
   extension). Ask for the `tw_*` list again. Expect the opened set to be
   restored.
5. Call `tw_close`. Ask again. Expect only `tw_open` and `tw_close`.
6. Try `write` to `docs/tasks/whatever.md` and to `docs/bugs/whatever.md`.
   Expect both blocked with the lockdown reason. Try a write to `src/foo.ts`;
   expect it allowed.
7. Optional: call `tw_open` with a target that is not legal, for example the
   fixture's `proto-blocked` (blocked by `proto-ticket`). Expect a refusal that
   does not disclose the gated tools and names the legal next calls
   (`work ticket proto-ticket`). The extension reads `fixtures/efforts.json`,
   so this step is deterministic.
