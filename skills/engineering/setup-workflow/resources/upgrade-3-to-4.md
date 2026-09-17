# Upgrade 3 to 4: the effort-grouped OKF bundle

> This resource encodes the ordered step list of the schema_version 3 to 4
> hop. It traces each step to the effort spec's Migration section
> (`docs/tasks/task-tools-overhaul/spec.md`, section **Migration**). The
> **executor** is the migration CLI:
>
> ```
> node skills/engineering/setup-workflow/scripts/migrate.mjs
> ```
>
> The CLI runs `migrate()` (`src/core/migrate.ts`) over the repo's own tree
> and prints a `MigrateReport`. The steps below are what it does, in order;
> the skill reads this list to explain the run, it does not perform the steps
> by hand.
>
> **Step numbering.** The nine steps below are the *logical* transformation,
> for tracing to the effort spec. The executor groups them into six numbered
> steps (1 layout and frontmatter, 2 state, 3 reporting and vendored trees,
> 3b maps placeholders, 4 the index, 5 the changelog, 6 the dead pointer),
> and the `.migration-progress` marker records those six. The mapping is:
> resource 1-4 -> executor 1; resource 5 -> executor 2; resource 6-7 ->
> executor 3; resource 8 -> executor 4; resource 9 -> executor 6.

## Before you start

- Create a backup branch: `git checkout -b migrate/schema-3-to-4`.
- Read `docs/tasks/state.yaml` and confirm `schema_version: 3` (or no
  `schema_version` field, which means unversioned and is treated by shape).
- Run `npm test` to establish a green baseline.

## Step 1: Reorganize the layout

**Traces to:** Migration, "the layout reorganization (tasks and tickets
sorted by their old workflow category)".

Every live effort becomes `docs/tasks/<effort>/` holding `map.md`, `spec.md`,
`arch-spec.md`, `tasks/<task>/task.md`, and `tickets/<ticket>/ticket.md`.

- The v3 `maps/<map>/map.md` subtree folds into `docs/tasks/<map>/map.md`.
- The flat `docs/tasks/<task>/` sprawl folds into
  `docs/tasks/<effort>/tickets/<task>/ticket.md` (or `tasks/` for a planning
  category).
- The split is by the old workflow category: `research`, `prototype`,
  `grilling`, `manual` are decision tasks and land in `tasks/`; `feature` and
  `bug` are implementation tickets and land in `tickets/`.
- `arch-spec.md` is shared by the effort's whole ticket chain, so it lives at
  the effort root.

## Step 2: Unify frontmatter

**Traces to:** Migration, "frontmatter unification (kind to type, category to
subtype, slug and map fields dropped, status split applied with normalization
of invalid combinations)".

- `kind:` becomes `type:` (the OKF artifact kind).
- The old `type:` becomes `subtype:` (the workflow category).
- `slug:` and `map:` are dropped: the directory is the slug and the grouping.
- `status:` splits into OKF `status` (`draft` | `stable` | `deprecated`) plus
  the companion `workflow_state` (`todo` | `ready` | `in-progress` |
  `blocked` | `done`).
- Invalid combinations are normalized (draft pairs only with todo, deprecated
  only with done) and recorded in the report's needs-human list.
- The legacy `slices:`, `started_at`, `completed_at`, `bug:`, and slice-level
  `mode` fields are stripped.
- The map's `tasks:` array is deleted: the directory is the registration now.

## Step 3: Backfill aux files

**Traces to:** Migration, "spec and aux backfill".

`spec.md`, `findings.md`, `arch-spec.md`, `deviation-reports/*.md`, and
`CHANGELOG.md` gain conformant frontmatter (`type`, `title`, `status`).
`out-of-scope/README.md` becomes `out-of-scope/index.md`.

## Step 4: Reorganize the archive

**Traces to:** Migration, "archive reorganization and backfill".

The same shaping runs under `docs/tasks/archive/`, effort-grouped, with the
same frontmatter backfill. A done artifact's status becomes `deprecated`
paired with `workflow_state: done`.

## Step 5: Rebuild state.yaml

**Traces to:** Migration, "state-file rebuild (real nulls, effort pointer
seeded from the current map pointer where derivable)".

`docs/tasks/state.yaml` becomes exactly:

```yaml
schema_version: 4
map: <slug or null>
task: <slug or null>
```

The `map` pointer is seeded from the old `map` pointer (or the v1 nested
`active:` block). The legacy `slice` key is dropped. Null pointers are real
nulls, never the string `None`.

## Step 6: Report legacy slice directories

**Traces to:** Migration, "legacy slice-directory reporting (never deletion;
v4 dropped slice support)".

Every `slices/` directory found is reported in the needs-human list and left
in place. The migration never deletes a slice directory.

## Step 7: Relocate vendored trees

**Traces to:** Migration, "vendored-tree relocation with pointers".

A non-OKF vendored tree inside the bundle (this repo's instance is the
`matt-skills` snapshot) moves outside the bundle to `docs/vendored/<name>/`,
with a pointer file left behind at the old location naming the new home.

## Step 8: Write the root index

**Traces to:** Migration, "root index creation".

`docs/tasks/index.md` is written carrying `okf_version: "0.2"` and a listing
of the tree's efforts.

## Step 9: Report the dead pointer

**Traces to:** Migration, "the dead pointer fix".

The onboarding report's dead `/skill:task-overview` pointer is fixed in the
`setup-workflow` skill text itself (that is the pointer's home, and the fix
ships with this resource's release). Where the retired name survives in a
repo's own documents, the migration **reports** each occurrence as a
`dead-pointer` needs-human item rather than rewriting it: rewriting a live or
archived document's prose would silently edit artifact content the migration
does not own.

`schema_version` is stamped 4 in step 5, not here.

## After the run

- Read the printed `MigrateReport` and surface every needs-human item.
- Run the full test suite (`npm test` + `npm run typecheck`) and verify green.
- Commit: `chore: migrate task-workflow schema 3 to 4`.
