## Deviation report — gate-skip-tool-registration

### API surface changes
- **Planned:** `const gate = resolveGate(process.cwd())` at the top of the factory, computed once, with no try/catch wrapping it (the arch spec's "Fail-open" note says "resolveGate already fails open ... The factory must **not** add a second try/catch that changes that"). The slice doc's first acceptance criterion says `const gate = isWorkRepo(process.cwd(), readGateConfig(...))` or the hook-only fallback.
- **Actual:** The factory wraps `resolveGate` in a try/catch:
  ```ts
  let gate: ResolveGateResult;
  try {
    gate = resolveGate(process.cwd());
  } catch (e) {
    gate = { active: false, reason: `gate detection failed: ${message}`, diagnostics: [message] };
  }
  ```
  This is a **defensive try/catch** that `resolveGate`'s own fail-open doesn't cover — `resolveGate` catches internal read/parse errors per-helper (each returns `null`/`[]` with diagnostics), but an unexpected throw *outside* those guarded paths (e.g., a bug in `isWorkRepo`'s regex compilation, or a future regression) would propagate. The factory's try/catch catches that and fails open to personal.
- **Impact:** None on dependent slices. The `gate` variable is still in scope for slice 2's `if (!gate.active) pi.on("before_agent_start", ...)` guard. The return shape matches `ResolveGateResult` exactly. This is a **strictly safer** variant of the spec, not a weaker one. The arch spec's "must not add a second try/catch that *changes* that" is arguably honored: the factory's try/catch does not *change* `resolveGate`'s own fail-open (which returns diagnostics gracefully); it adds a belt-and-suspenders layer for unexpected throws. The slice doc's fail-open acceptance criterion ("detection throws — factory catches, logs a diagnostic, treats as personal") is explicitly met and tested. Recommend the arch spec's "must not add a second try/catch" line be softened to "must not override resolveGate's own fail-open result" to match this (correct) defensive pattern.

### Abstraction usage
- Used/was specified: **Yes.** `resolveGate` is imported from `./core/repo-gate.js` and called — not reimplemented. The `createTools()` factory is reused as-is; its loop is wrapped in `if (!gate.active)`. The three utility tools (`notify_user`, `get_guidelines`, `list_guidelines`) are each guarded `if (!gate.active)` inline (not factored into a helper, but the arch spec says either is acceptable). `src/core/repo-gate.ts` was **not modified** by this slice (it's a new file from `gate-detection-helper`, present in the diff only because it didn't exist on `main`). The import adds `type ResolveGateResult` for the `gate` variable's type — correct.

### Out-of-scope changes
- **`session_start` diagnostics logging (in scope, noted):** The handler now emits `ctx.ui.notify("task-workflow gate: <diagnostic>", "info")` for each diagnostic and `ctx.ui.notify("task-workflow gate active: <reason>", "info")` when gated, before the early return. The arch spec mentioned logging diagnostics "if non-empty" — this implements that. Correct.
- **`session_compact` and `before_agent_start` NOT guarded (correct):** Confirmed both remain unguarded at lines 730 and 732 — they are slice 2's scope. The `session_compact` re-arm handler still flips `shouldInjectGuidelines` even when gated, but with the injection handler still registered (unguarded until slice 2), this is the current behaviour. No out-of-scope work.
- No edits to `src/core/repo-gate.ts`, no new source files beyond the test, no new deps. `package.json`/`package-lock.json` untouched.

### Divergence from the slice doc's acceptance criteria
- ✅ Factory top computes gate once via `resolveGate(process.cwd())` (with the defensive try/catch noted above — still "computed once at the top").
- ✅ Gated names absent when `gate.active`: all 20 gated names (`task_show`…`task_context`, `notify_user`, `get_guidelines`, `list_guidelines`) are absent in the work-repo test (verified by 2 passing tests asserting `task_*` and utility tools separately).
- ✅ All 20 present when `!gate.active` (personal) — verified by the "personal repo registers all gated tools" test.
- ✅ `session_start` peer-extension warnings do not fire when gated — verified by the "skips session_start peer warnings" test asserting `pi-subagents`/`pi-telemetry` messages are absent and the "gate active" message is present.
- ✅ Stub `ExtensionAPI` records `registerTool`/`on`/`getAllTools`/`ui.notify` — matches the test plan.
- ✅ Detection-throw fail-open — verified by the "detection throw falls open" test (mock `resolveGate` throws → all 20 gated names present → diagnostic logged).
- ✅ `npm run typecheck` passes clean.
- ⚠️ **Minor (test-plan coverage):** The slice doc's "Edge cases" mentions "cwd changes mid-session — assert the factory re-detects." The test "factory re-detects gate when cwd changes between invocations" covers this by calling the factory twice with different cwds. This is a valid interpretation (factory is stateless per-invocation; pi's extension cache keyed by cwd re-invokes it), though it doesn't simulate pi's actual cache invalidation — that's a harness limitation, acceptable.

### Task doc update needed?
**Yes — minor.** The arch spec's "Fail-open" note ("The factory must **not** add a second try/catch that changes that") should be softened to "must not override resolveGate's own fail-open *result*; a defensive outer try/catch for unexpected throws is acceptable and recommended." The implementation's defensive try/catch is correct and tested; the spec line as written would flag it as a violation, but the intent (fail-open, never throw) is honored. Recommend the parent update the arch spec before slice 2 runs so the verifier doesn't flag the same try/catch.

### User attention needed?
**No.** The API surface matches the spec's intent. The one deviation (defensive try/catch) is strictly safer than the spec required and is explicitly tested. No scope change, no downstream impact. The arch-spec wording fix is a planning-doc clarification, not a product decision.
