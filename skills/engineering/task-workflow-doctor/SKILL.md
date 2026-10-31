---
name: task-workflow-doctor
description: Diagnose a broken task workflow and route to the right skill. Use when the workflow is broken, tasks are not showing, the tree is legacy or unversioned, scaffolding is missing, a migration failed, or an opener refuses.
---

# /task-workflow-doctor, Task Workflow Doctor

The doctor **diagnoses** a reported task-workflow symptom and **routes** you
to the right skill or manual step. It is not a fixer.

It is narrowed to what the tools cannot self-diagnose: a legacy or
unversioned tree, missing scaffolding, a failed migration, and routing when
an opener refuses. When a `tw_*` tool already names the cause (a blocked
ticket, a not-ready target, an anomaly), the tool's own answer is the route;
the doctor is for the cases with no such answer.

## Process

1. Ask the user for the symptom, or read the symptom they already reported.
2. If the symptom is an opener refusal, read the refusal's `reason` and its
   `legal_next` calls first and route there; the opener names the legal next
   moves by design (see [resources/opener-refusal.md](resources/opener-refusal.md)).
3. Otherwise match the symptom to one of the four scopes below, open that
   scope's resource, and run its detection.
4. Report the diagnosis: the artifact at fault, what it rules out, and the
   route. Never edit the tree; run the routed skill to fix.

## Legacy or unversioned tree

A tree on an older schema, or one whose artifacts fail OKF conformance: a
file with no frontmatter, a missing or empty `type`, an invalid
`status`/`workflow_state` pair, or a `docs/tasks/state.yaml` with no
`schema_version` or one less than 5. Symptoms reach you as graph anomalies or
as artifacts silently missing from listings and frontiers.

Route: `/skill:setup-workflow`'s migrate branch. The migration reshapes the
layout and backfills conformant frontmatter; the doctor never patches files
by hand. Detection and the per-file producer routes are in
[resources/okf-conformance-failure.md](resources/okf-conformance-failure.md).

## Missing scaffolding

Two artifacts the workflow cannot run without, and nothing more: the
`docs/tasks/` tree and the repo-root `CONTEXT.md`. Anything else a repo may
choose to document is the repo's own business, and nothing here edits the
manifest. Route to `/skill:setup-workflow` and let it write the scaffold; it
never clobbers an existing file.

| Symptom | Missing artifact | Route |
|---|---|---|
| Tasks are not showing up; `docs/tasks/` is empty or missing | `docs/tasks/` tree | `/skill:setup-workflow` (see [resources/missing-tasks-tree.md](resources/missing-tasks-tree.md)) |
| Repo-wide context is missing from agent prompts | repo-root `CONTEXT.md` | `/skill:setup-workflow` (see [resources/missing-context-md.md](resources/missing-context-md.md)) |

## Failed migration

The migrate branch stopped partway: the migration CLI errored, the layout is
half-applied, both the old and the new path exist for the same artifact, or
the migration report lists failures. The tree is between schemas and no
amount of re-diagnosing makes it readable.

Route: restore the backup branch the migrate branch created, fix the reported
error there, then re-run `/skill:setup-workflow`. The migration is
idempotent, so a second run over a clean tree is a no-op. Steps and the
recovery order are in
[resources/failed-migration.md](resources/failed-migration.md).

## An opener refused

`tw_open` returned `opened: false`: nothing opened, no phase tools were
disclosed, and the refusal carries a `reason` plus a `legal_next` list.
`tw_next` repeats the current state.

Route: follow `legal_next` exactly. The doctor's job is to read the refusal
and name the route, never to reopen by another path. The refusal shapes
(unknown effort, missing target, blocked, done, not ready, no tickets,
missing or unstable architecture document) and their routes are in
[resources/opener-refusal.md](resources/opener-refusal.md).

## Routing notes

- For the `docs/tasks/` tree or the repo-root `CONTEXT.md`, run
  `/skill:setup-workflow`. Do not duplicate its setup logic here.
- The manifest is not a diagnosis target: nothing here edits it, and a
  registration problem is the package's own, not the tree's.
- For an opener refusal, `legal_next` is the route. If it names a skill, run
  that skill; if it names a tool call, make that call.

## Report

End the diagnosis with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.
