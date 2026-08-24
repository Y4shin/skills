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

- The policy implemented matches the `gate-config-mechanics` verdict:
  - If a hook exists to prevent the expansion (e.g. an `input` event
    handler returning a result that blocks the command, or a
    `tool_call`/`message` refusal): `/skill:implement-task` in a work repo
    does not load the skill and prints a short "gated here" message.
  - If only a warning is possible: the skill loads, but a one-line notice
    ("task-workflow is gated in this work repo; loading on explicit
    request") is emitted first.
- Integration test asserts the chosen behaviour for a work repo and the
  unchanged behaviour for a personal repo.
- The notice/notice text is a single line, no stack trace, no noise.

## Test plan

- **Seams:** the hook the research identified, with the gate decision
  injected. A stub command-expansion path or a recorded `input`/`tool_call`
  event.
- **Failure modes:** the hook doesn't fire for `/skill:` (only for other
  commands) — assert the actual behaviour and, if it can't be prevented,
  ensure the warning path is taken.
- **Scenarios:** `/skill:implement-task` in work repo (blocked or warned),
  `/skill:implement-task` in personal repo (loads normally),
  `/skill:nonexistent` (unchanged — the gate only touches the six).
- **Edge cases:** a `/skill:` invocation of a non-task-workflow skill in a
  work repo must be unaffected (the policy is name-scoped to the six).

## Constraints and dependencies

- Blocked by `gate-suppress-help-and-skill-list` and by
  `gate-config-mechanics` (the authority on which hook, if any).
- Name-scope the policy to the six task-workflow skills (sourced from the
  manifest, as in slice 1) — do not block other packages' skills.
- Prefer prevention over warning only if it's clean; a brittle
  private-API patch is worse than a clear warning.
