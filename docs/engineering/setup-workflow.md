# setup-workflow

## What it does

`setup-workflow` initializes or migrates a repository for the task-workflow.
One skill, two lifecycle events, chosen by reading
`docs/tasks/state.yaml`'s `schema_version` stamp. The current schema version
is **5**.

- **Fresh repo** (no `state.yaml`, or no `schema_version`): the **onboard**
  branch scaffolds the whole tree at the v5 shape: the `docs/tasks/` tree,
  the `docs/adr/` and `docs/agents/` directories; a `state.yaml` carrying
  `schema_version: 5` with two real-null
  pointers; `docs/tasks/index.md` (`okf_version: "0.2"`); a frontmattered
  `docs/tasks/CHANGELOG.md`; templates for `docs/testing.md` and
  `docs/dev-env.md` (an existing `dev-env.md` is never clobbered); and the
  repo-root `CONTEXT.md` and `AGENTS.md`.
- **Old repo** (`schema_version` less than 5): the **migrate** branch. It
  records the integration branch (the branch the repo was on when the skill
  was invoked), creates the migration branch `migrate/schema-<from>-to-5`
  from it, and on that branch runs the migration through the disclosed
  `tw_migrate` tool, which owns the whole any-vintage-to-5 transformation,
  then the full test suite and the migration commit. It reads the returned
  **MigrateReport** and surfaces every needs-human item: normalized
  status/workflow_state pairs, legacy slice directories (reported, never
  deleted), vendored trees moved outside the bundle, unresolvable
  `blocked_by` references. The integration branch then fast-forwards to the
  branch tip, with explicit user approval asked for first when the
  integration branch is not `main` or `master`; the migration branch is
  deleted after the fast-forward (it is dangling, no history is lost), and
  the run ends on the integration branch. A
  `docs/bugs/` archive is left exactly where it
  is: schema 5 makes it a static archive, never a substrate and never moved.
  Repos still on schema 2 follow
  `resources/upgrade-2-to-3.md` first; a repo on schema 4 follows
  `resources/upgrade-4-to-5.md`, the schema-5 hop (the `architecture` type
  and filename rename, the map body sections, the state stamp).
- **Current repo** (`schema_version` equals 5): the **no-op** branch.
  "Already on schema_version 5, nothing to do."

The onboarding branch is the one legal direct writer of `docs/tasks/`: the
write lockdown applies once `state.yaml` carries `schema_version`, so before
the stamp exists there is no schema to protect. Write the state file first
and every later write goes through the named `tw_*` tools.

The migration is safe by construction: a dry run (the tool's `dryRun`
parameter) computes the report without writing, every rewrite is YAML-verified
before it lands, a failure mid-migration leaves the tree untouched, re-runs
resume from the last completed step, and a run on a version-5 repo is a no-op.

## When to reach for it

Type `/skill:setup-workflow` once per repo before first use of the other
workflow skills, and again whenever a schema upgrade is released. It is
user-invoked: the model does not run it on its own.

## Common questions

**Why does onboarding not use a named writer?**
Because it runs before there is a named tree. The lockdown's rule is "an
initialized tree has named writers"; an unstamped tree has nothing to
protect, so the guard exempts it and setup writes the scaffold directly. Once
the stamp lands, the same session's later writes are refused unless they use
a `tw_*` tool.

**Is the migration destructive?**
It reorganizes the tree, but the migration branch
(`migrate/schema-<from>-to-5`) is created from the integration branch first,
and every rewrite is verified before a byte lands. A mid-run failure leaves
the tree untouched, and the integration branch was never touched: it
fast-forwards to the branch tip only after the migration commit, with the
user's approval when it is not `main` or `master`.

**What is in the MigrateReport?**
Every change the tool made and every item needing human eyes. It is the
review artifact for the migration; surface its needs-human list before
committing.

**Our repo predates all of this. Where do we start?**
The same skill. It detects the vintage from `schema_version`, runs
`upgrade-2-to-3` first if needed, then the tool's jump to 5. The target-state
spec lives in `docs/migration-target.yaml`.

**We already ran it. Should we run it again?**
It will tell you "already on schema_version 5, nothing to do". Running it
again after a partial migration resumes from the last completed step.

## It's working if

- After onboarding, `docs/tasks/state.yaml` carries `schema_version: 5`,
  the directories exist, and the repo-root `CONTEXT.md` and `AGENTS.md` are
  in place.
- After migrating, the MigrateReport's needs-human items were surfaced, the
  full test suite is green, and the migration commit exists on the migration
  branch; the integration branch was fast-forwarded to it, the migration
  branch is gone, and the run ended on the integration branch.
- A second run on a current repo is a no-op.
- An existing `docs/dev-env.md` survived onboarding untouched.
- The run ends with the completion report from the skill's
  `resources/report.md`; a failed migration reports the untouched tree.
