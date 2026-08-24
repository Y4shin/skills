---
kind: task
type: feature
slug: gate-tools-and-injection
title: Gate task_* + notify_user + guidelines tools + before_agent_start injection behind isWorkRepo
map: gate-skills-by-repo
status: ready
slices:
  - gate-skip-tool-registration
  - gate-skip-injection
---

# gate-tools-and-injection — feature

## User-visible outcome

In a work repo, the `task-workflow` extension **never registers** its
`task_*` tools, `notify_user`, `get_guidelines`, or `list_guidelines`, and
**never registers** its `before_agent_start` guidelines/subagent-injection
handler. The model's tool list and the system prompt stay clean. In a
personal repo, all of it registers exactly as today.

## User story

As the user, I want work-repo sessions to see none of the task-workflow
machinery in the tool list or the injected system-prompt preamble, so the
work repo's own canon (anwalt.de `engineering-workflow` + `.cursor/rules`)
is the only context that's advertised, with zero per-repo config on my part.

## Scope boundaries

- **In:** the factory in `src/pi.ts` calls the detection helper at the top;
  wraps the existing `for` loop over `createTools()`, the three explicit
  `pi.registerTool` calls (`notify_user`, `get_guidelines`,
  `list_guidelines`), and the `pi.on("before_agent_start", ...)` injection
  registration in `if (!gate.active) { ... }`. Logs `gate.reason` via pi's
  startup diagnostics when the gate is active.
- **Out:** the six **skills** (handled by `gate-skills-prompt-and-help`),
  the detection helper itself (`gate-detection-helper`), and the config
  mechanics (`gate-config-mechanics`).
- **In (peer-check):** the `session_start` handler that checks for
  `subagent`/`submit_feedback` peer extensions and warns — keep it; it's a
  health check, not advertising. But if the gate is active, skip the
  `pi-subagents`/`pi-telemetry` install warnings too (they're only relevant
  when task-workflow is live).

## Acceptance criteria

- In a work repo (gate active):
  - `pi.getAllTools()` contains **no** `task_*`, `notify_user`,
    `get_guidelines`, or `list_guidelines` entries (verified by an
    integration test using a stub `ExtensionAPI` that records
    `registerTool` calls).
  - No `before_agent_start` handler from this extension fires — the
    guidelines/"Use list_guidelines()" preamble is absent from the system
    prompt (verified by the same stub raising on unexpected `pi.on`
    registration).
  - `session_start` peer-extension warnings are skipped (no
    "pi-subagents is not installed" notice in a work repo).
- In a personal repo (gate inactive): the registered set and the injection
  are byte-identical to current behaviour (the integration test asserts the
  registered tool names and the injection-handler count match a snapshot of
  today's output).
- Detection runs **once at factory load**, not per turn (assert the helper's
  cache is used; the stub `ExtensionAPI` is constructed once).
- `npm test` and `npm run typecheck` pass.

## Existing abstractions to use

- The factory already loops `Object.entries(tools)` and calls
  `pi.registerTool`; wrap that loop. The three explicit `registerTool`
  calls (notify_user, get_guidelines, list_guidelines) are separate — wrap
  each, or factor them into a `registerUtilityTools(pi)` helper and call it
  conditionally.
- The `before_agent_start` handler is already a named arrow inside the
  factory; wrap its `pi.on(...)` registration.
- Reuse `gate-detection-helper`'s `isWorkRepo` / `readGateConfig` verbatim;
  do not re-detect here.

## Architecture / domain decisions

- **Never register > late unregister.** Per the idea, the factory runs with
  cwd resolved (extension cache keyed by cwd, cleared on cwd change), so
  detecting at the top and skipping `registerTool`/`pi.on` is the cleanest
  path — the things never exist in the registry. No `setActiveTools`
  narrowing, no per-turn filtering.
- **Gate decision is a const at the top of the factory.** `const gate =
  isWorkRepo(process.cwd(), ...)` computed once; the `if (!gate.active)`
  guards read it. This keeps the factory readable and makes the integration
  test trivial (swap the detection module's return).
- **If `gate-config-mechanics` finds config is hook-only** (not available at
  factory load), fall back to: register nothing unconditionally, read config
  on the first `session_start`, and register the tools/injection *then* if
  personal. Document this branch; prefer the load-time path if at all
  possible.

## Slice plan

Two slices; each leaves the factory in a working state.

### 1 — `gate-skip-tool-registration` (size: m, blocked_by: [])

Wire detection at the top of the factory; guard the `task_*` loop and the
three utility-tool `registerTool` calls. Integration test (stub
`ExtensionAPI` recording registrations) asserts the work-repo tool set is
empty of the gated names and the personal-repo set matches today. Skip the
`session_start` peer warnings when gated.

### 2 — `gate-skip-injection` (size: s, blocked_by: ["gate-skip-tool-registration"])

Guard the `pi.on("before_agent_start", ...)` registration. Integration test
asserts no injection handler is registered when gated, and the personal
path still appends the guidelines preamble. (If slice 1 already naturally
guards it because the whole factory is wrapped, this slice collapses to
just the test + a confirming assertion — keep it as a slice so the
behaviour is explicitly pinned.)

## Implementation notes

### Slice 1 — gate-skip-tool-registration (landed)

- `src/pi.ts` now imports `resolveGate` from `./core/repo-gate.js` and computes
  `gate` once at the top of the factory inside a defensive `try/catch` that
  fails open (treats detection errors as personal) and logs a diagnostic.
- The `task_*` registration loop is guarded behind `if (!gate.active)`.
- The three utility-tool `registerTool` calls (`notify_user`,
  `get_guidelines`, `list_guidelines`) are guarded behind `if (!gate.active)`.
- The `session_start` `pi-subagents`/`pi-telemetry` peer-install warnings are
  skipped when gated; `gate.reason` is logged on `session_start` when the
  gate is active.
- `session_compact` and `before_agent_start` are deliberately left untouched —
  `before_agent_start` injection is slice 2's responsibility.
- `tests/gate-factory.test.ts` (7 tests) drives the real factory default
  export with a stub `ExtensionAPI` (records `registerTool`, `on`,
  `getAllTools`, `ui.notify`) and real repo fixtures for gated (QNC origin) and
  personal (Y4shin origin) cases, plus `vi.mock`-controlled detection-throw
  fail-open and a cwd-change redetection edge case.
- Verification: `tests/gate-factory.test.ts` 7 passed, `tests/repo-gate.test.ts`
  40 passed, `npm run typecheck` clean, full `npx vitest run` 212 passed;
  the only failure is the pre-existing `tests/integration/session.test.ts`
  harness (`AuthStorage.inMemory undefined`), unrelated to this slice.
