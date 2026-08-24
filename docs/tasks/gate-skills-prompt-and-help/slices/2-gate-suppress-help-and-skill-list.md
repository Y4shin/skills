---
kind: slice
slug: gate-suppress-help-and-skill-list
title: Suppress the six from /help and skill-list surfaces (or document the limitation)
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
  - gate-strip-skills-from-prompt
---

# gate-suppress-help-and-skill-list

## End-to-end behavior

In a work repo, the six task-workflow skills do not appear on pi's `/help`
or skill-list surface. If pi offers an interception point, it's used; if
not, the limitation is documented in the task result and carried into
`gate-config-docs-and-defaults`, and the acceptance criterion is
"prompt-stripped + limitation documented".

## Acceptance criteria

- The mechanism `gate-config-mechanics` confirms for `/help`/skill-list is
  implemented (e.g. filtering a `resources_discover` result, or whatever
  the research identifies).
- An integration test asserts the six names are absent from the surface in
  the gated case and present in the personal case — **if** a mechanism
  exists.
- If no mechanism exists: the task result records "pi 0.80.10 exposes no
  extension hook to suppress skills from `/help`/skill-list; the gate
  covers the system prompt only. `/help` will still list the six in a work
  repo." This note is handed to `gate-config-docs-and-defaults` for the
  README/docs. A test asserts the limitation note exists.

## Test plan

- **Seams:** whatever the chosen mechanism is — a stub `resources_discover`
  event, a mock skill-list builder, etc. If no mechanism, the "test" is an
  assertion on the documented limitation file.
- **Failure modes:** mechanism exists but only partially filters (e.g.
  filters the prompt-derived list but not a separate loaded-set list) —
  assert what actually got filtered and document the rest.
- **Scenarios:** gated (six absent from surface), personal (six present).
- **Edge cases:** a seventh skill added to `package.json` later is also
  suppressed automatically (because the list is sourced from the manifest,
  not hardcoded — inherited from slice 1).

## Constraints and dependencies

- Blocked by `gate-strip-skills-from-prompt` (the prompt path is done;
  this slice is the `/help` surface) and by `gate-config-mechanics` (the
  authority on whether the surface is interceptable).
- Do not couple to pi internals beyond what the research confirmed; if
  the only path is private API, prefer documenting the limitation over a
  brittle private-API patch.
