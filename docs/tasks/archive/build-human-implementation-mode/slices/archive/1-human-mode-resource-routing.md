---
kind: slice
slug: human-mode-resource-routing
title: Split feature and bug resources behind human-mode routers
task: ../task.md
mode: hitl
status: done
size: m
blocked_by: []
---

Implement the compatible three-resource layout for feature and bug execution. Keep `resources/feature.md` and `resources/bug.md` as slim routers, move the current autonomous behavior into `resources/feature/autonomous.md` and `resources/bug/autonomous.md`, and add routing for clear human/manual invocation prose with confirmation for ambiguous intent.

## Acceptance criteria

- Existing autonomous dispatch behavior remains unchanged when human mode is not requested.
- Clear human/manual prose selects the corresponding human resource path.
- Ambiguous prose asks for confirmation rather than silently selecting a mode.
- Router files reference the human and autonomous resources without duplicating their full pipelines.

## Test plan

- Seams: router resource text and implementation-skill resource references.
- Scenarios: autonomous fallback, clear human phrases, wording variants, ambiguous wording, and no trailing prose.
- Failure modes: missing resource, accidental direct autonomous selection, and router drift from the documented paths.

## Constraints and dependencies

- Do not implement the human pipelines in this slice.
- Preserve top-level router filenames for compatibility.
