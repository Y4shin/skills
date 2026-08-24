---
kind: slice
slug: gate-skip-tool-registration
title: Skip task_* + notify_user + guidelines tool registration when gate active
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: []
---

# gate-skip-tool-registration

## End-to-end behavior

The `src/pi.ts` factory computes `gate` once at the top and guards the
`task_*` registration loop plus the `notify_user` / `get_guidelines` /
`list_guidelines` `registerTool` calls (and the `session_start` peer
warnings) behind `if (!gate.active)`. A stub-`ExtensionAPI` integration test
proves the gated-out names are absent in a work repo and present in a
personal repo.

## Acceptance criteria

- Factory top: `const gate = isWorkRepo(process.cwd(),
  readGateConfig(...))` (or the hook-only fallback per
  `gate-config-mechanics`).
- Gated names absent when `gate.active`: none of `task_show`, `task_get`,
  `task_set`, `task_set_slices`, `task_resolve`, `task_assert_kind`,
  `task_list`, `task_slices`, `task_finalizable`, `task_dependency_levels`,
  `task_frontier`, `task_map_tasks`, `task_map_tick`, `task_map_finalizable`,
  `task_state`, `task_state_set`, `task_context`, `notify_user`,
  `get_guidelines`, `list_guidelines` appear in the stub's recorded
  `registerTool` calls.
- All of the above present when `!gate.active` (personal).
- `session_start` peer-extension warnings (`pi-subagents`, `pi-telemetry`
  install notices) do **not** fire when gated.
- Integration test uses a stub `ExtensionAPI` that records `registerTool`
  names and `on(event)` registrations, with the detection module stubbed to
  return `{active:true}` and `{active:false}` for the two cases.

## Test plan

- **Seams:** inject the detection result (vi.mock or a setter on the module)
  so the stub factory doesn't need a real repo. The stub `ExtensionAPI`
  implements `registerTool`, `on`, `getAllTools`, and nothing else.
- **Failure modes:** detection throws — factory catches, logs a diagnostic,
  treats as personal (fail-open: a broken gate should not silently disable
  the user's personal package). Assert this.
- **Scenarios:** `{active:false}` (personal — full registration),
  `{active:true}` (work — empty registration), and detection-throw
  (personal fail-open).
- **Edge cases:** cwd changes mid-session (the extension cache is keyed by
  cwd per `gate-config-mechanics` — assert the factory re-runs, not cached
  stale).

## Constraints and dependencies

- Blocked by `gate-config-mechanics` (config read path) and
  `gate-detection-helper` (the module it calls).
- Fail-open on detection error: log + treat as personal. Do not let a gate
  bug silently neuter the package.
