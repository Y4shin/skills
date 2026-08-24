# Architecture spec: gate-tools-and-injection

> Task `gate-tools-and-injection`, map `gate-skills-by-repo`. Stable across
> both slice chains. Grounded in `gate-config-mechanics/findings.md` (Q-B:
> the extension factory gets NO SettingsManager; it must read files itself
> and can gate synchronously at load time) and the landed
> `gate-detection-helper` module (`resolveGate`).

## Shared notes (all slices)

- **Edit target:** `src/pi.ts` only (the factory + the existing handlers).
  No new source files. The detection module `src/core/repo-gate.ts` already
  exists and exports `resolveGate`; **import and call it, do not modify it**.
- **The gate decision, once:** at the very top of `export default function
  (pi: ExtensionAPI)` (line 587), before `createTools()` is even called for
  registration, compute:
  ```ts
  import { resolveGate } from "./core/repo-gate.js";
  const gate = resolveGate(process.cwd());
  // gate: { active: boolean; reason: string; diagnostics: string[] }
  ```
  This is synchronous (fs reads of two small JSON files + a `.git/config`
  parse). Per `gate-config-mechanics` Q-B, the factory has `process.cwd()`
  at load and the extension cache is keyed by cwd, so this runs once per
  repo per session — not per turn. Store `gate` in a closure variable both
  slices read.
- **Fail-open:** `resolveGate` already fails open (returns
  `{active:false,...}` on any read/parse error — personal). The factory
  must **not** add a second try/catch that changes that; it can log
  `gate.diagnostics` via `ctx.ui.notify(..., "info")` on `session_start` if
  non-empty, but never throws. If `gate.active` is false, everything
  registers exactly as today.
- **Existing abstractions to use:**
  - `createTools()` (line 315) — the `task_*` tool factory; keep it, wrap
    its registration loop.
  - The three explicit `pi.registerTool` calls: `notify_user` (619),
    `get_guidelines` (726), `list_guidelines` (754).
  - `pi.on("session_start", …)` (694) — peer-extension health warnings;
    skip the `pi-subagents`/`pi-telemetry` install notices when gated.
  - `pi.on("before_agent_start", …)` (709) — the guidelines injection;
    wrap its registration.
- **Do NOT reimplement:**
  - Do not re-read settings or re-detect the origin — `resolveGate` does it.
  - Do not use `pi.setActiveTools` for narrowing — not-registering is the
    chosen path (cleaner registry; per the idea).
  - Do not touch `src/core/repo-gate.ts` (done task).
- **Integration tests** use the `tests/integration/harness.ts`
  `createTaskSession` helper (real `AgentSession` + faux provider). The
  harness currently has a **pre-existing** failure
  (`AuthStorage.inMemory` undefined at `harness.ts:138`) that exists on
  `main` and is unrelated to this task — see "Test gate" below; do not fix
  it here.

## Slice 1 — gate-skip-tool-registration (size: m, blocked_by: [])

- **Exports:** no new exports. The factory behaviour changes:
  - `if (!gate.active) { for (const [name, def] of Object.entries(tools)) { … pi.registerTool(…) } }`
    — the `task_*` loop (lines 590–617) is guarded.
  - The three utility-tool registrations (`notify_user` 619, `get_guidelines`
    726, `list_guidelines` 754) are each guarded `if (!gate.active)`, OR
    factored into a `function registerUtilityTools(pi)` and called under the
    guard. Prefer the helper for readability, but either is acceptable.
  - The `session_start` handler (694) keeps running, but **skips** the
    `pi-subagents`/`pi-telemetry` install warnings when `gate.active`
    (they're only relevant when task-workflow is live). The
    `guidelinesCache`/`shouldInjectGuidelines` bookkeeping can still run
    harmlessly, or be skipped too — simplest is to early-return from the
    handler when gated after the cache refresh.
- **Existing abstractions to use:** `createTools()`, `pi.registerTool`,
  `pi.getAllTools` (used inside `session_start`).
- **Do NOT reimplement:** the detection; the tool definitions.
- **Interface contract (consumed by slice 2):** the `gate` closure variable
  is in scope for slice 2's `if (!gate.active) pi.on("before_agent_start", …)`
  guard. Slice 2 does not recompute the gate. The contract is: **slice 1
  defines `const gate = resolveGate(process.cwd())` at the top and both
  slices read it.** Do not move or rename it without updating slice 2.
- **Tests:** add a new `tests/gate-factory.test.ts` (vitest, top-level
  `tests/` — **not** under `tests/integration/`, because the integration
  harness is broken, see Test gate). It drives the real factory default
  export with a **stub `ExtensionAPI`** that records `registerTool` names
  and `on(event)` registrations and implements `getAllTools()` from the
  recorded set. The factory only calls `pi.registerTool`, `pi.on`, and (inside
  `session_start`) `pi.getAllTools` — a stub with those three is sufficient.
  Stub `resolveGate`'s input (via `process.cwd()` to a temp repo fixture with
  a `.git/config` + global settings, reusing the `makeRepo`/`makeGlobalSettings`
  pattern from `tests/repo-gate.test.ts`) for the real-path cases, and stub
  the module (`vi.mock`) for the detection-throw fail-open case. Assert:
  - gated session: the stub's recorded `registerTool` names contain **none**
    of the 20 gated names (`task_show`…`task_context`, `notify_user`,
    `get_guidelines`, `list_guidelines`), and the `session_start` install
    warnings do not fire (the `on("session_start")` handler, when invoked,
    does not notify about pi-subagents/pi-telemetry).
  - personal session: all 20 gated names are present.
  - detection-throw fail-open: stub `resolveGate` to throw → factory catches
    → personal (all 20 present).
  `npm run typecheck` clean. The existing `tests/plugin.test.ts` (direct
  `createTools`) is unaffected.

## Slice 2 — gate-skip-injection (size: s, blocked_by: ["gate-skip-tool-registration"])

- **Exports:** no new exports. Behaviour change:
  - `if (!gate.active) { pi.on("before_agent_start", async (event, _ctx) => { … guidelines injection … }); }`
    — the registration at line 709 is guarded. When gated, no injection
    handler is registered, so the work-repo system prompt has no
    guidelines/"Use list_guidelines()" preamble.
  - The `session_compact` re-arm handler (707) can stay unguarded (it only
    flips a flag the injection handler reads; with the injection handler
    absent it's a no-op). Or guard it too for symmetry — either is fine.
- **Existing abstractions to use:** the existing `before_agent_start`
  handler body (709–723); `guidelinesCache`, `shouldInjectGuidelines`.
- **Do NOT reimplement:** the injection logic; the guidelines discovery.
- **Interface contract (consumed by `gate-skills-prompt-and-help`):** the
  factory registers the injection handler **only when personal**
  (`!gate.active`). The skills task will, symmetrically, register a
  **strip** handler **only when gated** (`gate.active`). Exactly one of the
  two registers, never both, never neither. That mutual-exclusivity is the
  contract — `gate-skills-prompt-and-help` must follow it.
- **Tests:** extend the `tests/integration/gate.test.ts` from slice 1:
  - gated session: drive a turn with a discovered guideline file present
    and assert the system prompt contains **no** guidelines preamble (the
    strip handler is a later task; here we just assert the injection didn't
    run).
  - personal session: assert the preamble **is** appended (snapshot the
    tail of the prompt).
  - `session_compact` re-arm: in the personal path, after a compact event,
    the injection runs again on the next `before_agent_start`.

## Cross-slice notes

- Both slices edit only `src/pi.ts` + the new `tests/integration/gate.test.ts`.
- The `gate` closure variable is defined in slice 1 and read by slice 2 —
  keep it at the top of the factory.
- The mutual-exclusivity with the future skills strip handler is a hard
  contract; document it in the task body if needed.

## Test gate (shared)

- The full `npm test` suite has a **pre-existing** failure:
  `tests/integration/session.test.ts` (16 tests) fails with
  `TypeError: Cannot read properties of undefined (reading 'inMemory')` at
  `harness.ts:138` (`AuthStorage.inMemory()`). This exists on `main` and is
  caused by a version skew in the installed
  `@earendil-works/pi-coding-agent` (it no longer exports `AuthStorage` the
  way the harness expects). It is **unrelated to this task**.
- **Slice acceptance gate:** `npx vitest run tests/gate-factory.test.ts`
  passes, `npx vitest run tests/repo-gate.test.ts` passes, and
  `npm run typecheck` passes. The pre-existing `session.test.ts` failure is
  not a regression and does not block landing. If a slice's changes cause
  **new** failures beyond that file, that's a regression — block.
- **Confirmed:** `createTaskSession` is **broken** by the `AuthStorage`
  skew — a smoke test (`await createTaskSession({})`) fails at
  `harness.ts:138`. So slice tests MUST use the stub-`ExtensionAPI` path
  described above (drive the real factory default export directly). Do not
  attempt to use `createTaskSession` or fix the harness in this task.
