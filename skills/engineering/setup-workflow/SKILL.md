---
name: setup-workflow
description: Initialize or migrate a repository for the task-workflow. Detects whether the repo is fresh (onboard), old (migrate), or already current (no-op) by reading docs/tasks/state.yaml's schema_version. Replaces the former onboard-workflow.
disable-model-invocation: true
---

# Setup Workflow

One skill for two lifecycle events: **onboarding** a fresh repo onto the
task-workflow, and **migrating** an existing repo from an older schema to the
current one. It auto-detects which by reading `docs/tasks/state.yaml`'s
`schema_version` stamp.

Run once per repo before first use of the other workflow skills, and again
whenever a schema upgrade is released.

## Detection

Read `docs/tasks/state.yaml`:

- **No `schema_version` field** (or no `state.yaml`): the repo is fresh. Run
  the **onboard** branch (below).
- **`schema_version` is less than current**: the repo is behind. Run the
  **migrate** branch (below), applying each upgrade resource in sequence.
- **`schema_version` equals current**: the repo is already on the latest
  schema. Stop and report "already on schema_version N, nothing to do."

The current schema version is `3`.

## Onboard (fresh repo)

Scaffold everything a repo needs to use the task-workflow:

1. Create directory structure:
   ```
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/maps/archive
   mkdir -p docs/tasks/out-of-scope
   mkdir -p docs/bugs
   mkdir -p docs/bugs/archive
   mkdir -p docs/adr
   mkdir -p docs/agents
   ```
   Empty directories get a `.gitkeep`.

2. Write `docs/tasks/state.yaml`:
   ```yaml
   task: null
   slice: null
   schema_version: 3
   ```

3. Write `docs/tasks/CHANGELOG.md`:
   ```markdown
   # Task Changelog
   ```

4. Write `docs/testing.md` with a template (framework, run commands, mock
   conventions).

5. Write `docs/dev-env.md` with a template describing how to start the dev
   environment, how reproduction should work, or an explicit "do not attempt
   AI reproduction" placeholder. If `docs/dev-env.md` already exists, do not
   clobber it; leave the existing file in place.

6. Write `CONTEXT.md` at repo root (the project's domain glossary; see the
   domain-modeling skill for the format). For repos that ARE the workflow
   package itself (like this one), the glossary holds the workflow's
   ubiquitous language. For downstream repos, it holds the project's domain
   terms.

7. Write `AGENTS.md` at repo root with the agent conventions (bucket layout,
   promotion rules, invocation split, no-em-dashes rule, skill-tool
   invocation convention).

8. Write `docs/agents/README.md` (per-repo config the skills read, seeded
   minimal; the skills populate it over time).

9. Write `docs/tasks/out-of-scope/README.md` (the rejected-requests KB;
   explains its purpose).

10. Commit: `chore: initialize task-workflow (schema_version 3)`.

11. Report: "Ready. Run `/skill:task-overview` to see the full flow, or
    `/skill:wayfinder` to start planning."

## Migrate (old repo)

The repo is on an older schema. Apply each upgrade resource in sequence from
the repo's current version to the target version:

1. Create a backup git branch: `git checkout -b migrate/schema-${from}-to-${to}`.
   This is the safety net; the migration is reversible by checking out the
   previous branch.

2. For each version step from the repo's `schema_version` to the current
   version, read and follow `resources/upgrade-${from}-to-${to}.md` in order.
   Each resource is a fixed, ordered step list that encodes the proven
   transformations for that version jump.

3. After each upgrade resource completes, bump `schema_version` in
   `docs/tasks/state.yaml` to the target version of that resource.

4. After all upgrades are applied, run the full test suite (`npm test` +
   `npm run typecheck`) and verify it is green.

5. Commit: `chore: migrate task-workflow schema ${from} to ${to}`.

### Dry-run mode

If the user asks for a dry run (or passes `--dry-run`), print the planned
steps and the files each step will add, remove, or rewrite, without writing
anything. Report the full plan, then stop.

### Idempotence

Re-running on a repo whose `schema_version` is already current is a no-op:
report "already on schema_version N, nothing to do." Re-running mid-migration
(after a backup branch exists but before all steps complete) resumes from the
last uncompleted step. Track per-step completion via a
`.migration-progress` marker file (a checklist of completed step numbers) in
`docs/tasks/`; delete it when the migration finishes.

## Available upgrade resources

- [upgrade-2-to-3](resources/upgrade-2-to-3.md): the largely-adopt-Matt
  adoption (v2.x bucket layout, two-phase planning, 12 new skills, repo-root
  docs, changesets, no-em-dashes).

> **Feedback:** if setup or migration hits a snag, a step that didn't fit the
> repo, a resource that was wrong, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the project.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
