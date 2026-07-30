---
kind: slice
slug: onboarding-and-routing
title: onboard-workflow + task-overview bug support
task: ../task.md
mode: afk
status: todo
size: s
blocked_by: []
started_at:
completed_at:
---

# Slice 4: onboard-workflow + task-overview bug support

## onboard-workflow

- Create `docs/bugs/archive/` alongside `docs/ideas/` and
  `docs/tasks/` (with .gitkeep handling as for other empty dirs).
- Write a `docs/dev-env.md` template (like `docs/testing.md`):
  how to start the dev environment, how reproduction should work,
  or an explicit "do not attempt AI reproduction" placeholder.

## task-overview

- Routing rows: report a bug → `/skill:report-bug`.
- Read-only query: triage queue = `grep -l "status: reported" docs/bugs/*.md`.
- Mention the bug list location (`docs/bugs/`).

## Acceptance criteria

- onboard-workflow prose includes `docs/bugs/archive/` and
  `docs/dev-env.md` template creation.
- task-overview routes bug reports and lists the triage-queue query.
- Structure/prose tests asserting both.
- Full test suite green.

## Test plan

- Layers touched: skill prose (2 files), test suite.
- Failure modes:
  1. onboard forgets dev-env.md → prose assertion fails.
  2. overview missing report-bug routing → prose assertion fails.
- Key scenarios: prose tests pass.
- Edge cases: re-running onboard on an already-initialized repo must
  not clobber an existing `docs/dev-env.md` (state it in prose).
