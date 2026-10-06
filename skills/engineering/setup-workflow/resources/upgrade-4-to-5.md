# Upgrade 4 to 5: the schema-5 renames

> This resource encodes the ordered step list of the schema_version 4 to 5
> hop. It traces each step to the enforced-workflow-v5 effort's settled
> decisions (`docs/tasks/enforced-workflow-v5/arch-spec.md`, section
> **Vocabulary and schema 5**, and the `migrate-v4-to-v5` ticket that
> implemented them). The **executor** is the migration CLI:
>
> ```
> node skills/engineering/setup-workflow/scripts/migrate.mjs
> ```
>
> The CLI runs `migrate()` (`src/core/migrate.ts`) over the repo's own tree
> and prints a `MigrateReport` whose `to` field is `5`. The steps below are
> what it does to an already-v4 tree, in order; the skill reads this list to
> explain the run, it does not perform the steps by hand.
>
> **Step numbering.** The three steps below are the *logical* v5 delta. The
> executor groups the transformation into six numbered steps (1 layout and
> frontmatter, 2 state, 3 reporting and vendored trees, 3b maps placeholders,
> 4 the index, 5 the changelog, 6 the dead pointer). On an already-v4 tree
> the v5 delta rides executor step 1 (the renames and the map body reshape)
> and step 2 (the state stamp); the other steps detect an already-conformant
> v4 tree and stage nothing.

## Before you start

- Create a backup branch: `git checkout -b migrate/schema-4-to-5`.
- Read `docs/tasks/state.yaml` and confirm `schema_version: 4`.
- Run `npm test` to establish a green baseline.

## Step 1: Rename the architecture document

**Traces to:** "Vocabulary and schema 5", "`type: arch spec` and
`arch-spec.md` become `type: architecture` and `architecture.md` at the
effort root".

In live and archived trees alike:

- The frontmatter type `arch spec` becomes `architecture`.
- The filename `arch-spec.md` becomes `architecture.md`.
- An effort with exactly one architecture document has it hoisted to the
  effort root (`docs/tasks/<effort>/architecture.md`), where the whole
  ticket chain reads it.
- An effort holding **several** architecture documents has each
  `arch-spec.md` renamed to `architecture.md` **in place** (each beside its
  own artifact). Hoisting all of them to one root filename would silently
  lose all but one, so the one-document hoist does not apply.
- The reader stays tolerant of the legacy filename and type as a safety net;
  only new producers write the v5 names.

## Step 2: Rename the map body sections

**Traces to:** "Vocabulary and schema 5", "Map body renames".

- The map's `## Out of scope` heading becomes `## Non-goals`; the section's
  content is kept verbatim.
- `## Non-negotiable facts` is appended as an empty placeholder when the
  body lacks it, so a gate refusal names missing content, not a missing
  section. The success test line inside that section is authored later,
  never invented by the migration.
- A map body already carrying both sections is left byte for byte
  unchanged; this is what makes a second run a no-op.

## Step 3: Stamp state.yaml at schema 5

**Traces to:** "Vocabulary and schema 5", "One idempotent hop to schema 5".

`docs/tasks/state.yaml` becomes exactly:

```yaml
schema_version: 5
map: <slug or null>
task: null
```

The two pointers keep their current values; nulls stay real nulls. The stamp
is what makes the next `setup-workflow` run report the no-op.

## What the hop does not touch

- `docs/bugs/` stays exactly where it is: it is a static archive, and the
  bug substrate retires as a live part of the workflow. The migration never
  reads it into the plan, moves it, or reports it.
- An already-v4 tree keeps its effort-grouped layout, its OKF frontmatter,
  its `index.md`, its frontmattered `CHANGELOG.md`, and its out-of-scope
  index; those executor steps detect them and stage nothing (a v4 tree
  missing one of them gets it backfilled, as in the v4 hop).
- Legacy slice directories, vendored trees, unresolvable `blocked_by`
  references, and dead `/skill:task-overview` pointers are reported for
  human eyes when present, never rewritten by the migration.

## What the CLI prints

A real v4 run reports the v5 renames (this transcript is from a fixture with
a live effort and an archived one, both carrying `arch-spec.md`):

```
migrated from schema_version 4 to 5

6 change(s):
  move docs/tasks/archive/old-effort/architecture.md: moved 'docs/tasks/archive/old-effort/arch-spec.md' to 'docs/tasks/archive/old-effort/architecture.md' and applied the schema-5 reshape
  move docs/tasks/enforced-workflow-v5/architecture.md: moved 'docs/tasks/enforced-workflow-v5/arch-spec.md' to 'docs/tasks/enforced-workflow-v5/architecture.md' and applied the schema-5 reshape
  rewrite docs/tasks/enforced-workflow-v5/map.md: applied the schema-5 reshape to 'docs/tasks/enforced-workflow-v5/map.md'
  rewrite docs/tasks/state.yaml: rebuilt state.yaml at schema_version 5 (from vintage 4)
  add docs/tasks/index.md: wrote 'docs/tasks/index.md' with okf_version "0.2" and the tree listing
  add docs/tasks/CHANGELOG.md: created 'docs/tasks/CHANGELOG.md' with conformant frontmatter
```

A second run on the migrated tree is the no-op:

```
already on schema_version 5, nothing to do.
```

## After the run

- Read the printed `MigrateReport` (its `to` field is `5`) and surface every
  needs-human item.
- Run the full test suite (`npm test` + `npm run typecheck`) and verify green.
- Commit: `chore: migrate task-workflow schema 4 to 5`.
