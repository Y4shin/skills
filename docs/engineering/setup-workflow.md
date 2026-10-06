# setup-workflow

## What it does

`setup-workflow` initializes or migrates a repository for the task-workflow.
One skill, two lifecycle events, chosen by reading
`docs/tasks/state.yaml`'s `schema_version` stamp. The current schema version
is **5**.

- **Fresh repo** (no `state.yaml`, or no `schema_version`): the **onboard**
  branch scaffolds the whole tree at the v5 shape: the `docs/tasks/`,
  `docs/bugs/` (plus `archive/`), `docs/adr/`, and `docs/agents/`
  directories; a `state.yaml` carrying `schema_version: 5` with two real-null
  pointers; `docs/tasks/index.md` (`okf_version: "0.2"`); a frontmattered
  `docs/tasks/CHANGELOG.md`; templates for `docs/testing.md` and
  `docs/dev-env.md` (an existing `dev-env.md` is never clobbered); and the
  repo-root `CONTEXT.md` and `AGENTS.md`.
- **Old repo** (`schema_version` less than 5): the **migrate** branch. It
  creates a backup branch, runs the migration CLI
  (`node skills/engineering/setup-workflow/scripts/migrate.mjs`), which owns
  the whole any-vintage-to-5 transformation, then reads the printed
  **MigrateReport** and surfaces every needs-human item: normalized
  status/workflow_state pairs, legacy slice directories (reported, never
  deleted), vendored trees moved outside the bundle, unresolvable
  `blocked_by` references. Repos still on schema 2 follow
  `resources/upgrade-2-to-3.md` first; a repo on schema 4 follows
  `resources/upgrade-4-to-5.md`, the schema-5 hop (the `architecture` type
  and filename rename, the map body sections, the state stamp).
- **Current repo** (`schema_version` equals 5): the **no-op** branch.
  "Already on schema_version 5, nothing to do."

The migration is safe by construction: a dry-run mode prints the plan
without writing, every rewrite is YAML-verified before it lands, a failure
mid-migration leaves the tree untouched, re-runs resume from the last
completed step, and a run on a version-5 repo is a no-op.

## When to reach for it

Type `/skill:setup-workflow` once per repo before first use of the other
workflow skills, and again whenever a schema upgrade is released. It is
user-invoked: the model does not run it on its own.

## Common questions

**Is the migration destructive?**
It reorganizes the tree, but a backup branch (`migrate/schema-<from>-to-5`)
is created first and every rewrite is verified before a byte lands. A
mid-run failure leaves the tree untouched.

**What is in the MigrateReport?**
Every change the CLI made and every item needing human eyes. It is the
review artifact for the migration; surface its needs-human list before
committing.

**Our repo predates all of this. Where do we start?**
The same skill. It detects the vintage from `schema_version`, runs
`upgrade-2-to-3` first if needed, then the CLI's jump to 5. The target-state
spec lives in `docs/migration-target.yaml`.

**We already ran it. Should we run it again?**
It will tell you "already on schema_version 5, nothing to do". Running it
again after a partial migration resumes from the last completed step.

## It's working if

- After onboarding, `docs/tasks/state.yaml` carries `schema_version: 5`,
  the directories exist, and the repo-root `CONTEXT.md` and `AGENTS.md` are
  in place.
- After migrating, the MigrateReport's needs-human items were surfaced, the
  full test suite is green, and the migration commit exists.
- A second run on a current repo is a no-op.
- An existing `docs/dev-env.md` survived onboarding untouched.
