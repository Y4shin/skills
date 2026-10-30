---
type: ticket
subtype: feature
title: task-workflow-overview and task-workflow-doctor re-scoped
status: stable
workflow_state: ready
blocked_by: [opener-gate-and-toolsets]
size: m
---

## What to build

Two model-invoked skills narrowed to what is left for them.

`task-workflow-overview` stays a progressively disclosed explainer of the v5
workflow plus a fast track that points at `tw_next` for the live answer. It
is a router over the phase skills and the flows between them; it must name
every user-reachable skill and reflect the v5 surface (`intake`,
`wayfinder`, `to-spec`, `to-tickets`, `implement-ticket`, `finalize-effort`,
`setup-workflow`). Its explainer content stays layered so a reader can stop
at any depth.

`task-workflow-doctor` narrows to what the tools cannot self-diagnose: a
legacy or unversioned tree, missing `CONTEXT.md` or `docs/tasks/`, a failed
migration, and routing when an opener refuses. Its resources that addressed
now-retired substrates are removed or repointed.

## Acceptance criteria

- [ ] `task-workflow-overview` names every user-reachable v5 skill and points
      its fast track at `tw_next`.
- [ ] Its explainer stays layered and progressively disclosed.
- [ ] `task-workflow-doctor` covers only legacy trees, missing scaffolding,
      failed migrations, and opener-refusal routing.
- [ ] Doctor resources for retired substrates are removed or repointed.
- [ ] `tests/skills.test.ts` and `tests/skill-rewire.test.ts` are green.

## Blocked by

- opener-gate-and-toolsets (the overview's `tw_next` fast track and the
  doctor's opener-refusal routing depend on the opener surface).