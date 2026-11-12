---
name: setup-workflow
description: Initialize or migrate a repository for the task-workflow. Detects whether the repo is fresh (onboard), old (migrate), or already current (no-op) by reading docs/tasks/state.yaml's schema_version. Replaces the former onboard-workflow.
disable-model-invocation: true
---

# Setup Workflow

Every message to the operator follows the `operator-communication`
skill: load it before your first message.

If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.

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
- **`schema_version` is less than 5**: the repo is behind. Run the
  **migrate** branch (below).
- **`schema_version` equals 5**: the repo is already current. Stop and report
  "already on schema_version 5, nothing to do." This is the no-op branch.

The current schema version is **5**.

## Onboard (fresh repo)

Scaffold the tree the workflow needs, then hand the project's own documents to
a bootstrapping effort. The tree here is what the workflow reads to run; the
documents that describe the project are written by an effort that has done the
work, never by a template that guesses at it.

1. Create directory structure:
   ```
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/out-of-scope
   mkdir -p docs/adr
   mkdir -p docs/agents
   ```
   Empty directories get a `.gitkeep`. There is no bug directory to scaffold:
   `docs/bugs/` is a static archive in schema 5, so a fresh repo gets none and
   an existing archive is left exactly where it is.

   The `docs/tasks/` write lockdown exempts an unstamped tree: until
   `state.yaml` carries `schema_version`, there is no schema to protect, so the
   onboarding run may create these files directly. Write the state file in
   step 2 and every later write is locked.

2. Write `docs/tasks/state.yaml` (the v5 shape: two real-null pointers plus
   the stamp):
   ```yaml
   schema_version: 5
   map: null
   task: null
   ```

3. Write `docs/tasks/index.md` carrying `okf_version: "0.2"` and a listing of
   the tree. The migration regenerates it; wayfinder refreshes it on map
   create and the effort close refreshes it on archive.

4. Write `docs/tasks/CHANGELOG.md` with conformant frontmatter:
   ```markdown
   ---
   type: changelog
   title: Task Changelog
   ---

   # Task Changelog
   ```

5. Write the project conventions at repo root and the per-repo config:
   `AGENTS.md` with the agent conventions (bucket layout, promotion rules,
   invocation split, no-em-dashes rule, skill-tool invocation convention),
   `docs/agents/README.md` (per-repo config the skills read, seeded minimal;
   the skills populate it over time), and `docs/tasks/out-of-scope/index.md`
   (the rejected-requests KB; explains its purpose).

6. Commit: `chore: initialize task-workflow (schema_version 5)`.

7. **Ask about existing material, before offering the bootstrapping
   effort.** One question: does the project already have plans, designs,
   specifications, or notes that describe what it is meant to become? If the
   answer is yes, tell the operator to place them anywhere under `docs/`, in
   whatever form they exist, and say plainly that nothing reads them
   automatically: the bootstrapping effort reads them because the operator
   points at them when starting it.

8. **Offer the bootstrapping effort.** This step replaces the project-shaped
   templates the onboard branch used to write. A fresh repo cannot answer what
   its test commands are, what its dev environment needs, or which domain
   terms its code will speak, so those documents are written by an effort that
   does the work rather than by a template that guesses. Tell the operator to
   run `/skill:intake`, name what the project is going to be, and point at any
   material they placed in step 7. That effort's tickets write
   `docs/testing.md` with the repo's real commands, `docs/dev-env.md` with a
   real environment or an explicit do-not-attempt note, and `CONTEXT.md` with
   the project's first terms.

   Do not write those three files here, and do not seed them from a template.
   The skills that read them treat a template as an answer, so an empty
   template is worse than a missing file.

9. Report: "Ready. Run `/skill:task-workflow-overview` to see the full flow,
   or start the bootstrapping effort with `/skill:intake`."

## Migrate (old repo)

> **Target-state spec:** the on-disk target state for the current schema is
> distilled in `docs/migration-target.yaml` (a stable, machine-readable,
> versioned spec). The upgrade resources below are the *steps*; this spec is
> the *destination*. When an upgrade resource's steps diverge from the spec,
> the spec records the deviation as the truth.

The repo is on an older schema. The migration runs through the disclosed
`tw_migrate` tool, never a shell command, on its own branch: the integration
branch is touched only at the end. The branch choreography is explicit:

1. **Record the integration branch**: the branch the repo was on when the
   skill was invoked (`git branch --show-current`). The run ends there.

2. **Create the migration branch from it**:
   `git checkout -b migrate/schema-${from}-to-5` (`${from}` is the
   `schema_version` just read). This branch is the backup: the integration
   branch stays untouched until the final fast-forward, so the pre-migration
   state is one checkout away.

3. **Run the migration on the migration branch.** Open the phase first: call
   `tw_open` with `{ skill: "setup-workflow", effort: "setup-workflow" }` (the
   phase is not effort-scoped, so the effort argument is only the non-empty
   label the opener requires; it names nothing and creates nothing), then
   call `tw_migrate`. The tool performs the whole any-vintage-to-5
   transformation in-process over the repo's own tree: the effort-grouped
   layout reorganization, the frontmatter unification, the aux backfill, the
   archive reshape, the state rebuild, the legacy slice reporting, the
   vendored-tree relocation, the schema-5 renames (`arch-spec.md` to
   `architecture.md`, `type: arch spec` to `type: architecture`), the map
   body reshape (`## Out of scope` to `## Non-goals`, a
   `## Non-negotiable facts` placeholder when missing), and the root index
   write, as one transformation.

   Read the returned **MigrateReport**. It lists every change and every item
   needing human eyes: normalized status/workflow_state combinations, legacy
   slice directories found (reported, never deleted), vendored trees moved
   outside the bundle, and unresolvable `blocked_by` references. Surface
   every needs-human item to the user.

   Route the repo to its hop's resource, and read it before explaining the
   run:
   - A repo still on schema 2 reads `resources/upgrade-2-to-3.md` first: the
     skill-bucket and repo-root-doc work of that jump is not a tree rewrite.
   - A repo on schema 3 reads `resources/upgrade-3-to-4.md`, which encodes
     the bulk reshape the tool performs over a v3 tree.
   - A repo on schema_version 4 reads `resources/upgrade-4-to-5.md`, the
     schema-5 hop this run performs.

   After the migration completes, run the full test suite (`npm test` +
   `npm run typecheck`) and verify it is green. Then commit:
   `chore: migrate task-workflow schema ${from} to 5`.

   The ordered step lists the tool executes are encoded in
   `resources/upgrade-3-to-4.md` and `resources/upgrade-4-to-5.md`, tracing
   each step to the owning effort's spec.

4. **Fast-forward the integration branch** to the migration branch's tip:
   `git checkout <integration-branch>`, then
   `git merge --ff-only migrate/schema-${from}-to-5`. When the integration
   branch is not `main` or `master`, ask for explicit user approval before
   the fast-forward, and proceed only on a yes.

   If `git merge --ff-only` refuses, the integration branch moved while the
   migration ran (a commit landed on it mid-run). The refusal is the safety
   working: nothing is merged, and both branches survive (the migration
   branch holds the migrated tree, the integration branch the mid-run
   work). Surface the refusal to the user, then recover by re-deriving the
   migration on the moved tip: delete the superseded migration branch
   (`git branch -D migrate/schema-${from}-to-5`, the one place `-D` is
   correct, because the re-run re-derives its work), create a fresh
   migration branch from the moved integration-branch tip, and repeat from
   step 3 (the phase is already open; the migration is idempotent, so the
   re-run migrates the moved tree and converges to the same end state),
   then repeat this step's fast-forward. The merge is never forced and
   never bridged with a merge commit.

5. **Delete the migration branch**:
   `git branch -d migrate/schema-${from}-to-5`. After the fast-forward the
   branch is dangling, and no history is lost.

6. **End the run on the integration branch**, and close the phase with
   `tw_close setup-workflow`.

### Dry-run mode

If the user asks for a dry run, call `tw_migrate` with the `dryRun` parameter
set (`{ dryRun: true }`): the tool computes the report (the plan, every
change with its action, path, and detail, and every item needing human
attention) and writes nothing. Report the full plan, then stop.

### Idempotence

Re-running on a repo whose `schema_version` is already 5 is a no-op: report
"already on schema_version 5, nothing to do." Re-running mid-migration (after
the migration branch exists but before all steps complete) resumes from the
last uncompleted step. The tool tracks per-step completion via a
`.migration-progress` marker file (a checklist of completed step numbers) in
`docs/tasks/`; it deletes the marker when the migration finishes. Because
every step is independently idempotent, a resume that loses the marker still
converges to the same end state.

### Corruption safety

The migration verifies the YAML round-trip of every rewrite before a single
byte lands. A failure mid-migration leaves the tree untouched.

## Available upgrade resources

- [upgrade-4-to-5](resources/upgrade-4-to-5.md): the v5 hop (the
  `architecture` type and filename rename, the map body sections, the
  schema-5 state stamp), executed by the disclosed tool `tw_migrate`.
- [upgrade-3-to-4](resources/upgrade-3-to-4.md): the v4 hop (effort-grouped
  layout, OKF frontmatter, state rebuild, slice reporting, vendored-tree
  relocation, root index), executed by the disclosed tool `tw_migrate`.
- [upgrade-2-to-3](resources/upgrade-2-to-3.md): the largely-adopt-Matt
  adoption (v2.x bucket layout, two-phase planning, 12 new skills, repo-root
  docs, changesets, no-em-dashes). Repos still on 2 run this first.

## Report

End the run with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.

> **Feedback:** if setup or migration hits a snag, a step that didn't fit the
> repo, a resource that was wrong, or something that worked notably well, call
> `tw_feedback({ kind, data })` autonomously to record it. `kind` is one of
> `good`, `bad`, `friction`, `architecture`; `data` is one or two specific,
> actionable sentences about the *workflow*, not the project. Requires the
> `pi-telemetry` extension.
