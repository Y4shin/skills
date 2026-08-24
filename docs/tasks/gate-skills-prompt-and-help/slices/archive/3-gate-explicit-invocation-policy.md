---
kind: slice
slug: gate-explicit-invocation-policy
title: Prevent or warn on explicit /skill:<name> in a work repo (D4)
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
  - gate-suppress-help-and-skill-list
---

# gate-explicit-invocation-policy

## End-to-end behavior

In a work repo, an explicit `/skill:implement-task` (or any of the six)
either does not execute the skill (preferred), or executes after printing a
one-line "task-workflow is gated in this work repo" notice. The chosen
behaviour is whichever `gate-config-mechanics` confirms is mechanically
possible. In a personal repo, explicit invocation is unchanged.

## Acceptance criteria

- **Confirmed enforceable (see `findings.md` V3):** the `input` event fires before `_expandSkillCommand` (`agent-session.js:817-830`), and `InputEventResult` supports `{action:"handled"}` (drop) and `{action:"transform", text}` (rewrite) (`types.d.ts:629-636`).
- The factory registers an `input` handler **only when gated**:
  `if (gate.active) pi.on("input", gateSkillInvocation)`.
- The handler: if `event.text` starts with `/skill:`, parse the skill name; if the name is one of the gated six (sourced from `package.json` `pi.skills`, same list as slice 1), call `ctx.ui.notify(\`task-workflow is gated in this work repo; not loading ${name}\`, "warning\`)` and return `{ action: "handled" }` → **prevents** the expansion. Otherwise return `{ action: "continue" }`.
- Non-gated `/skill:other-skill` input passes through unchanged (the policy is name-scoped to the six).
- Personal path: the `input` handler is not registered; `/skill:implement-task` expands normally.
- Integration test (stub `ExtensionAPI` + invoking the recorded `input` handler with `{text:"/skill:implement-task", source:"interactive"}`):
  - gated + gated name → returns `{action:"handled"}` and a notify was recorded.
  - gated + non-gated skill name → returns `{action:"continue"}`.
  - gated + non-`/skill:` input → returns `{action:"continue"}`.
  - personal → handler not registered.

## Test plan

- **Seams:** the stub `ExtensionAPI`'s `on("input", h)` records `h`; invoke it with `{text, source:"interactive"}` and a stub `ctx` whose `ui.notify` records. Assert the returned `InputEventResult` and the notify record.
- **Failure modes:** `/skill:` with no name (pass through), `/skill:` with a name then args (parse name before the first space — match `_expandSkillCommand`'s `slice(7, spaceIndex)`), manifest read failure (pinned fallback list).
- **Scenarios:** the six gated names each blocked; a non-task-workflow skill (`/skill:oracle`) passes; `/help` passes (not a `/skill:`).
- **Edge cases:** `/skill:implement-task some args` (name is `implement-task`, args after the space — block on the name), case sensitivity (pi skill names are lowercase; match exact).

## Constraints and dependencies

- Blocked by `gate-suppress-help-and-skill-list` and by
  `gate-config-mechanics` (the authority on which hook, if any).
- Name-scope the policy to the six task-workflow skills (sourced from the
  manifest, as in slice 1) — do not block other packages' skills.
- Prefer prevention over warning only if it's clean; a brittle
  private-API patch is worse than a clear warning.
