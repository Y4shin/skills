---
type: arch spec
title: "Architecture spec: overhaul-v4-migration"
status: stable
---
# Architecture spec: overhaul-v4-migration

Status: awaiting user approval.
Scope: `src/core/migrate.ts` (new), `src/migrate-cli.ts` (new),
`skills/engineering/setup-workflow/` (SKILL.md + the CLI shim + the v4
resource), and their tests. No other source or config file changes.

## Scope boundary (what this ticket does NOT do)

Other tickets of the map own these; do not touch them here:

- **Not** the `task_*` to `tw_*` rename (`overhaul-tw-rename`).
- **Not** the graph-tool rebuild (`overhaul-graph-tools`).
- **Not** deleting the legacy slice machinery or the dead tools
  (`overhaul-dead-surface`).
- **Not** the planning/execution skill prose beyond `setup-workflow`
  (`overhaul-planning-skills`, `overhaul-execution-skills`).
- **Not** running the migration against this repo's own live tree. The tests
  run against fixture trees only; flipping the live tree is a user call at
  run time.

## Shape (user-approved)

```
src/core/migrate.ts          the transformation, pure over a TreePort
src/migrate-cli.ts           thin argv wrapper around it
skills/engineering/setup-workflow/scripts/migrate.mjs
                             shim that spawns the CLI
tests/migrate.test.ts        the migration seam
tests/setup-workflow-scripts.test.ts
                             the CLI seam (spawnSync, skill-creator pattern)
```

`src/core/migrate.ts` **imports the real v4 model** (`fromFrontmatter`,
`validateCombination`, `TYPE_LEAVES`, `TYPE_LEAF` from `core/art.ts`;
`fromObject` / `toObject` from `core/state.ts`). The layout and type tables
stay in one place, so the migration cannot drift from the tools.

## The filesystem port

The transformation never touches `node:fs` directly. It reads and writes
through a port, which is what makes failure injection and in-memory fixture
tests possible:

```ts
export interface TreePort {
  /** Every file under the tree root, as repo-relative POSIX paths. */
  list(): string[];
  read(path: string): string;
  /** Stage a write. Nothing reaches disk until commit(). */
  stageWrite(path: string, content: string): void;
  /** Stage a move (git mv semantics: history-preserving where possible). */
  stageMove(from: string, to: string): void;
  /** Apply every staged change atomically. Throws before writing anything. */
  commit(): void;
  /** Discard staged changes. */
  rollback(): void;
}

export interface MigrateOptions {
  /** Simulate: compute and report, stage nothing. */
  dryRun?: boolean;
  /** Resume marker path; absent means start fresh. */
  progressPath?: string;
  /** Test hook: throw when the Nth staged write would commit. */
  failAfterWrites?: number;
}

export interface MigrateReport {
  from: number;             // detected schema_version (0 = unversioned)
  to: 4;
  changes: Change[];        // every file added, moved, rewritten
  needsHuman: HumanItem[];  // slice dirs found, vendored trees, unresolvable refs
  noop: boolean;            // true when already v4 (idempotence)
}
```

`commit()` is the atomicity boundary: it validates that every staged write
round-trips through YAML **before** writing a single byte, and throws if any
fails. That is how "on any failure leave the tree untouched" is guaranteed
rather than promised.

## The transformation

`migrate(tree, opts): MigrateReport`, in this order. Every step is
idempotent: it detects its own already-applied state and skips.

1. **Detect the vintage.** Read `docs/tasks/state.yaml` when present:
   `schema_version` 1 (nested `active:` block), 2, 3, or absent
   (unversioned). Also detect a fresh repo (no `docs/tasks`).

   **Division of labor on a fresh repo.** `migrate()` owns the *bundle*:
   `docs/tasks/state.yaml`, `index.md`, and `CHANGELOG.md`. The repo-root
   scaffold (`CONTEXT.md`, `AGENTS.md`, `docs/testing.md`, `docs/dev-env.md`,
   `docs/bugs/`, `docs/adr/`, `docs/agents/`, `out-of-scope/index.md`) belongs
   to `setup-workflow`'s onboard branch, which is prose the human runs once.
   A fresh repo therefore reaches the v4 bundle via the migration and the full
   repo scaffold via the skill; the two are complementary, not two competing
   "v4 scaffolds".
2. **Reorganize the layout.** For each live effort, create
   `docs/tasks/<effort>/` holding `map.md`, `spec.md`, `arch-spec.md`, and
   `tasks/<task>/task.md` / `tickets/<ticket>/ticket.md`. Sort each artifact
   into `tasks/` or `tickets/` by its old workflow category (planning types
   to tasks, `feature`/`bug` to tickets). The v3 `maps/<map>/map.md` subtree
   and the flat `docs/tasks/<task>/` sprawl both fold in.
3. **Unify frontmatter.** `kind` to `type`, the old `type` to `subtype`,
   `slug` and `map` dropped (the directory is the slug and the grouping),
   `status` split into OKF `status` + `workflow_state` with invalid
   combinations normalized (and recorded in `needsHuman`). `slices:`,
   `started_at`, `completed_at`, `bug:`, and slice-level `mode` are stripped.
4. **Backfill aux files.** `spec.md`, `findings.md`, `arch-spec.md`,
   `deviation-reports/*.md`, and `CHANGELOG.md` gain conformant frontmatter
   (`type`, `title`, `status`). `out-of-scope/README.md` becomes
   `out-of-scope/index.md`.
5. **Reorganize the archive.** The same shaping under
   `docs/tasks/archive/`, effort-grouped, with the same backfill.
6. **Rebuild `state.yaml`.** `{schema_version: 4, map, task}` with real
   nulls; the `map` pointer seeded from the old `map` pointer or the current
   map pointer where derivable; the legacy `slice` key dropped.
7. **Report the rest.** Legacy `slices/` directories found (reported, never
   deleted), vendored non-OKF trees inside the bundle (moved out with a
   pointer file left behind), unresolvable `blocked_by` references.
8. **Write `docs/tasks/index.md`** carrying `okf_version: "0.2"` and a
   listing of the tree.
9. **Fix the dead pointer** in the onboarding report
   (`/skill:task-overview` becomes `/skill:task-workflow-overview`).

## Resumability

Progress is recorded in `docs/tasks/.migration-progress` as a list of
completed step numbers, written after each step's commit. A re-run reads it
and skips completed steps. The file is deleted on success. Because every step
is independently idempotent, a resume that loses the marker still converges
to the same end state; the marker is an optimization, not the correctness
mechanism.

## setup-workflow v4

`skills/engineering/setup-workflow/SKILL.md`:

- Detection keys on `schema_version: 4` as current. Fresh (no
  `state.yaml`), migrate (any lower or absent), no-op (4).
- The **onboard** branch writes the v4 scaffold: `state.yaml` with
  `{map: null, task: null, schema_version: 4}`, the effort-grouped
  directories, `index.md` with `okf_version: "0.2"`, and the existing
  repo-root docs.
- The **migrate** branch invokes the CLI and reports its `MigrateReport`.
  A dry run passes `--dry-run`.
- `resources/upgrade-3-to-4.md` encodes the ordered step list tracing to the
  effort spec's Migration section, and names the CLI as the executor. The
  existing `upgrade-2-to-3.md` stays for repos still on 2.
- The dead `/skill:task-overview` pointer in the onboarding report is fixed.

The CLI shim `scripts/migrate.mjs` spawns
`node --experimental-strip-types src/migrate-cli.ts` with the repo root as
argv, and exits with the CLI's code. Node 22.6+ strips types; the shim
reports a clear error naming the required Node version when the spawn fails.

## Existing abstractions to use

- `core/art.ts`: `fromFrontmatter`, `validateCombination`, `TYPE_LEAVES`,
  `TYPE_LEAF`. Do not re-encode the type or layout tables.
- `core/state.ts`: `fromObject`, `toObject`, `freshState` for the state
  rebuild, so the migration and the tools agree on the shape.
- `core/frontmatter.ts`: `parse` / `dump` for every rewrite.
- Test helpers: `mkTmp` / `ctx` in `tests/plugin.test.ts`; the `spawnSync`
  CLI pattern in `tests/skill-creator-scripts.test.ts`.

## Do NOT reimplement

- No new YAML parser or serializer; `frontmatter.ts` owns that.
- No second copy of the layout or type tables; import them from `art.ts`.
- No migration tool in the registered tool surface. The spec's surviving
  list is exactly ten tools and a `migrate` tool would contradict it; the
  CLI is the invocation path.
- No deletion of legacy slice directories. Report them.

## Seams (need approval)

1. **Migration seam:** `migrate(tree, opts)` against an in-memory `TreePort`
   seeded with one fixture per vintage. Asserts the end state, idempotence,
   resumability, and corruption safety. This is the spec's approved seam.
2. **CLI seam:** `scripts/migrate.mjs` spawned via `spawnSync` against a real
   fixture directory on disk, asserting exit code and stdout report.
3. **setup-workflow detection seam:** the SKILL.md's branch selection, tested
   as prose structure (the existing `tests/skills.test.ts` pattern), not
   behaviorally.

## Interface contract for dependents

- `MigrateReport` is the seam `setup-workflow` renders and the doctor's
  conformance symptom can consume.
- `TreePort` is the seam any future migration step uses for I/O.
- The migration is the only writer of `schema_version: 4`; the state module
  never stamps it.

## Test plan

`tests/migrate.test.ts` (migration seam), one fixture per vintage:

- **fresh:** no `docs/tasks`; the end state is the v4 scaffold.
- **unversioned:** a tree with no `schema_version`; treated as v2/v3 by
  shape and migrated.
- **v1:** a nested `active:` state block; pointers read, block dropped.
- **v2 / v3:** flat task dirs and the `maps/` subtree; both fold into the
  effort-grouped layout.
- **archived:** old-shape archive trees reshape and backfill.
- **live-corpus patterns:** a spec-only directory, an aux file with no
  frontmatter, the vendored `matt-skills` snapshot, a `state.yaml` with
  unknown keys.
- **idempotence:** a second `migrate` over the migrated tree returns
  `noop: true` and stages zero changes.
- **corruption safety:** `failAfterWrites: N` for several N; assert the tree
  is byte-identical to its pre-run state.
- **resumability:** run with a marker, interrupt, re-run, assert the same
  end state as an uninterrupted run.
- **reporting:** slice directories are reported and still present; a
  vendored tree is moved with a pointer; an unresolvable `blocked_by` is
  reported; a normalized combination appears in `needsHuman`.
- **index:** `docs/tasks/index.md` carries `okf_version: "0.2"`.

`tests/setup-workflow-scripts.test.ts` (CLI seam):

- `--dry-run` writes nothing and prints the plan.
- A real run on a fixture exits 0 and prints the report.
- A failure exits non-zero with the reason.

`tests/skills.test.ts`: the setup-workflow structure assertions update to the
v4 detection vocabulary and the new resource.

## Constraints and dependencies

- Size `xl`: chain budgets 90 turns / 1200s.
- Design context: `docs/tasks/task-tools-overhaul/spec.md`, section Migration;
  `docs/tasks/overhaul-synthesis-grilling/task.md`, round 3 (migration scope)
  and round 5 (layout, vendored trees, index).
- The v4 model from `overhaul-artifact-model` is the target; this ticket
  consumes it and must not duplicate it.
- No em-dashes in any prose this workflow writes.
