## Deviation report — gate-skip-injection

### API surface changes
- **Planned:** `pi.on("before_agent_start", ...)` registration (arch spec
  line ~709) guarded by `if (!gate.active) { ... }`. When gated, no
  injection handler is registered; when personal, the handler is registered
  and appends the guidelines preamble. `session_compact` re-arm handler may
  stay unguarded (arch spec: "either is fine").
- **Actual:** Matches the spec exactly.
  - `src/pi.ts:732` — `if (!gate.active) { pi.on("before_agent_start", ...); }`
    wraps the full injection handler body. The handler body itself is
    unchanged from the original (the `shouldInjectGuidelines` guard, the
    `guidelinesCache.size === 0` early return, the preamble construction,
    and the `return { systemPrompt: ... }` are all byte-identical to the
    pre-gate version — only the surrounding `if` was added).
  - `session_compact` (line 730) is **not guarded** — it stays
    unconditionally registered, as the arch spec explicitly allowed ("can
    stay unguarded ... it only flips a flag the injection handler reads;
    with the injection handler absent it's a no-op"). Correct.
- **Impact:** None. The mutual-exclusivity contract with the future
  `gate-skills-prompt-and-help` strip handler is honored: the injection
  handler registers **only when personal** (`!gate.active`). The skills
  task will symmetrically register a strip handler **only when gated**
  (`gate.active`). Exactly one of the two will register, never both, never
  neither.

### Abstraction usage
- Used/was specified: **Yes.** The `gate` closure variable (defined in
  slice 1 at the top of the factory, line 592) is read directly at line 732.
  Slice 2 does not recompute the gate — it reads the slice-1 `gate.active`
  value, exactly as the interface contract requires.
- The existing `before_agent_start` handler body (the
  `shouldInjectGuidelines` flag, `guidelinesCache`, the preamble lines) is
  reused as-is — no reimplementation. The `session_compact` re-arm handler
  is untouched. `src/core/repo-gate.ts` was not modified.
- No new runtime deps. No new source files.

### Out-of-scope changes
- **None.** The diff touches only `src/pi.ts` (guarding the
  `before_agent_start` registration) and `tests/gate-factory.test.ts`
  (adding 4 new tests in a `before_agent_start guidelines injection`
  describe block). The slice did not touch `session_compact`, the tool
  registrations, the `session_start` handler, or any other module.
- A trailing-newline fix was applied (`src/pi.ts` previously had no
  newline at EOF; now it does). This is a cosmetic side-effect of the
  edit, not a behavioural change.

### Divergence from the slice doc's acceptance criteria
- ✅ **When `gate.active`:** the stub `ExtensionAPI` records **no**
  `before_agent_start` registration — verified by test "work repo (gate
  active) does not register before_agent_start handler" which asserts
  `stub.handlers["before_agent_start"]` is `undefined`.
- ✅ **When `!gate.active`:** the handler is registered and, when invoked
  with `{ systemPrompt: "BASE" }`, returns a prompt whose tail matches the
  guidelines preamble — verified by test "personal repo appends guidelines
  preamble when a guideline file exists" which asserts the exact
  `systemPrompt` string (`"BASE\n\n## Project coding guidelines\n..."`).
- ✅ **`guidelinesCache` empty → handler returns early (no empty section):**
  verified by test "personal repo returns undefined when no guideline files
  are discovered" which asserts the handler returns `undefined`.
- ✅ **`session_compact` re-arm:** verified by test "personal repo re-arms
  injection after session_compact" — first call injects, second call
  returns `undefined` (flag consumed), `session_compact` handler re-arms
  the flag, third call injects again. This exactly matches the slice
  doc's "Edge cases" requirement.
- ✅ **`npm run typecheck` passes** clean.
- ✅ **`npx vitest run tests/gate-factory.test.ts`** — 11 tests pass
  (7 from slice 1 + 4 from slice 2).

### Task doc update needed?
**No.** The implementation conforms to the arch spec and slice doc. The
arch spec's interface contract (injection registers only when personal;
mutual-exclusivity with the future strip handler) is honored. No wording
fix needed.

### User attention needed?
**No.** The API surface matches the spec exactly. The mutual-exclusivity
contract is in place for `gate-skills-prompt-and-help` to follow. No
scope change, no downstream impact.
