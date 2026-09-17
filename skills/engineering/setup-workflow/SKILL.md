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

- **No `state.yaml`, or no `schema_version` field**: the repo is fresh. Run
  the **onboard** branch (below).
- **`schema_version` is less than 4**: the repo is behind. Run the
  **migrate** branch (below).
- **`schema_version` equals 4**: the repo is already current. Stop and report
  "already on schema_version 4, nothing to do." This is the no-op branch.

The current schema version is **4**.

## Onboard (fresh repo)

Scaffold everything a repo needs to use the task-workflow:

1. Create directory structure:
   ```
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/out-of-scope
   mkdir -p docs/bugs
   mkdir -p docs/bugs/archive
   mkdir -p docs/adr
   mkdir -p docs/agents
   ```
   Empty directories get a `.gitkeep`.

2. Write `docs/tasks/state.yaml` (the v4 shape: two real-null pointers plus
   the stamp):
   ```yaml
   schema_version: 4
   map: null
   task: null
   ```

3. Write `docs/tasks/index.md` carrying `okf_version: "0.2"` and a listing of
   the tree. The migration regenerates it; wayfinder refreshes it on map
   create and finalize-task refreshes it on archive.

4. Write `docs/tasks/CHANGELOG.md` with conformant frontmatter:
   ```markdown
   ---
   type: changelog
   title: Task Changelog
   ---

   # Task Changelog
   ```

5. Write `docs/testing.md` with a template (framework, run commands, mock
   conventions).

6. Write `docs/dev-env.md` with a template describing how to start the dev
   environment, how reproduction should work, or an explicit "do not attempt
   AI reproduction" placeholder. If `docs/dev-env.md` already exists, do not
   clobber it; leave the existing file in place.

7. Write `CONTEXT.md` at repo root (the project's domain glossary; see the
   domain-modeling skill for the format). For repos that ARE the workflow
   package itself (like this one), the glossary holds the workflow's
   ubiquitous language. For downstream repos, it holds the project's domain
   terms.

8. Write `AGENTS.md` at repo root with the agent conventions (bucket layout,
   promotion rules, invocation split, no-em-dashes rule, skill-tool
   invocation convention).

9. Write `docs/agents/README.md` (per-repo config the skills read, seeded
   minimal; the skills populate it over time).

10. Write `docs/tasks/out-of-scope/index.md` (the rejected-requests KB;
    explains its purpose).

11. Commit: `chore: initialize task-workflow (schema_version 4)`.

12. Report: "Ready. Run `/skill:task-workflow-overview` to see the full flow,
    or `/skill:wayfinder` to start planning."

## Migrate (old repo)

> **Target-state spec:** the on-disk target state for schema 3 is distilled
> in `docs/migration-target.yaml` (a stable, machine-readable, versioned
> spec). The upgrade resources below are the *steps*; this spec is the
> *destination*. When an upgrade resource's steps diverge from the spec, the
> spec records the deviation as the truth.

The repo is on an older schema. Create a backup branch, then run the
migration CLI, which owns the whole any-vintage-to-4 transformation:

1. Create a backup git branch: `git checkout -b migrate/schema-${from}-to-4`.
   This is the safety net; the migration is reversible by checking out the
   previous branch.

2. Run the migration CLI from the repo root:
   ```
   node skills/engineering/setup-workflow/scripts/migrate.mjs
   ```
   The shim spawns `src/migrate-cli.ts`, which runs `migrate()` over the
   repo's own tree. It performs the effort-grouped layout reorganization,
   the frontmatter unification, the aux backfill, the archive reshape, the
   state rebuild, the legacy slice reporting, the vendored-tree relocation,
   and the root index write, as one transformation.

3. Read the printed **MigrateReport**. It lists every change and every item
   needing human eyes: normalized status/workflow_state combinations, legacy
   slice directories found (reported, never deleted), vendored trees moved
   outside the bundle, and unresolvable `blocked_by` references. Surface
   every needs-human item to the user.

4. For repos still on schema 2, also read and follow
   `resources/upgrade-2-to-3.md` first: the CLI migrates the tree, but the
   skill-bucket and repo-root-doc work of that jump is not a tree rewrite.

5. After the migration completes, run the full test suite (`npm test` +
   `npm run typecheck`) and verify it is green.

6. Commit: `chore: migrate task-workflow schema ${from} to 4`.

The ordered step list the CLI executes is encoded in
`resources/upgrade-3-to-4.md`, tracing each step to the effort spec's
Migration section.

### Dry-run mode

If the user asks for a dry run (or passes `--dry-run`), the CLI prints the
planned steps and the files each step will add, remove, or rewrite, without
writing anything. Report the full plan, then stop.

### Idempotence

Re-running on a repo whose `schema_version` is already 4 is a no-op: report
"already on schema_version 4, nothing to do." Re-running mid-migration (after
a backup branch exists but before all steps complete) resumes from the last
uncompleted step. The CLI tracks per-step completion via a
`.migration-progress` marker file (a checklist of completed step numbers) in
`docs/tasks/`; it deletes the marker when the migration finishes. Because
every step is independently idempotent, a resume that loses the marker still
converges to the same end state.

### Corruption safety

The migration verifies the YAML round-trip of every rewrite before a single
byte lands. A failure mid-migration leaves the tree untouched.

## Available upgrade resources

- [upgrade-3-to-4](resources/upgrade-3-to-4.md): the v4 hop (effort-grouped
  layout, OKF frontmatter, state rebuild, slice reporting, vendored-tree
  relocation, root index), executed by the migration CLI.
- [upgrade-2-to-3](resources/upgrade-2-to-3.md): the largely-adopt-Matt
  adoption (v2.x bucket layout, two-phase planning, 12 new skills, repo-root
  docs, changesets, no-em-dashes). Repos still on 2 run this first.

> **Feedback:** if setup or migration hits a snag, a step that didn't fit the
> repo, a resource that was wrong, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the project.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
