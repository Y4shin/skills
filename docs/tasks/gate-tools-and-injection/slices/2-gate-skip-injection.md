---
kind: slice
slug: gate-skip-injection
title: Skip before_agent_start guidelines injection when gate active
task: ../task.md
mode: afk
status: todo
size: s
blocked_by:
  - gate-skip-tool-registration
---

# gate-skip-injection

## End-to-end behavior

The `pi.on("before_agent_start", ...)` handler that appends the
guidelines / "Use list_guidelines()" preamble is registered only when
`!gate.active`. A work-repo session's system prompt has no such preamble;
a personal-repo session's is unchanged.

## Acceptance criteria

- When `gate.active`: the stub `ExtensionAPI` records **no**
  `before_agent_start` `on(...)` registration from this extension.
- When `!gate.active`: the handler is registered and, when invoked with a
  fake `event.systemPrompt`, returns a prompt whose tail matches the
  existing guidelines preamble (snapshot the current output for the
  personal case).
- `session_compact` re-arm (`shouldInjectGuidelines = true`) still works in
  the personal path (it's internal to the handler, which only exists when
  personal — so this is automatically correct once registration is guarded).

## Test plan

- **Seams:** same stub `ExtensionAPI` as slice 1; invoke the recorded
  `before_agent_start` handler with `{ systemPrompt: "BASE" }` and assert the
  returned `systemPrompt` for the personal case.
- **Failure modes:** `guidelinesCache` empty (no `docs/*.md` matches) —
  handler returns early; assert it doesn't append an empty section. Both
  gated and ungated.
- **Scenarios:** personal with a discovered guideline file (preamble
  appended), personal with none (no-op), work (handler never registered).
- **Edge cases:** `session_compact` re-arm flag — assert the handler
  respects `shouldInjectGuidelines` on repeat calls in the personal path.

## Constraints and dependencies

- Blocked by `gate-skip-tool-registration` (the factory guard already
  exists; this slice pins the injection specifically and adds its test).
- If slice 1 already guards the `pi.on` call because the whole block is
  under one `if`, this slice is mostly the test — that's fine, keep it to
  make the behaviour explicit and regression-proof.
