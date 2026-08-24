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

- **Confirmed limitation (see `findings.md` V2):** pi 0.80.10 exposes **no** subtractive hook for the loaded skill set. `/help` / skill-list read from `resourceLoader.getSkills().skills` (`interactive-mode.js`), and `resources_discover` is additive-only (`skillPaths` can be added, never removed). So the six **cannot** be hidden from `/help` / skill-list in a work repo.
- This slice therefore takes the slice doc's "if no mechanism exists" branch:
  - Write `docs/tasks/gate-skills-prompt-and-help/limitations.md` recording: "pi 0.80.10 exposes no extension hook to suppress skills from `/help`/skill-list; the gate covers the system prompt only. `/help` will still list the six task-workflow skills in a work repo. Explicit `/skill:<name>` is prevented via the `input` event (see slice 3)."
  - Add a test in `tests/gate-factory.test.ts` asserting the limitations file exists and mentions `/help`.
  - Hand the limitation text to `gate-config-docs-and-defaults` for the README (recorded in the task result).
- No suppression code is written (there is no hook to use).

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
