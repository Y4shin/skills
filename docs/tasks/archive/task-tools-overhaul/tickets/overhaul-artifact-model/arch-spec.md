---
type: arch spec
title: "Architecture spec: overhaul-artifact-model"
status: stable
---
# Architecture spec: overhaul-artifact-model

Status: awaiting user approval.
Scope: `src/core/art.ts` (the model), the resolver and the `task_get` /
`task_show` tools in `src/pi.ts`, and their tests. No other source or config
file changes.

## Scope boundary (what this ticket does NOT do)

These are other tickets of the map and must not be touched here:

- **Not** the `task_*` to `tw_*` rename (`overhaul-tw-rename`).
- **Not** the graph-tool rebuild on directory scans (`overhaul-graph-tools`).
  This ticket *produces* the anomaly data those tools consume; it does not
  rewire `task_frontier` / `task_dependency_levels` / `task_map_finalizable`.
- **Not** deleting the dead tools or the legacy slice machinery
  (`overhaul-dead-surface`). `sliceInfoFrom` / `SliceInfo` / `activeSlices`
  stay working so the live old-shape tree and the full suite keep passing.
- **Not** the v4 migration (`overhaul-v4-migration`) and **not** skill prose.

## The model (`src/core/art.ts`)

### Types

```ts
/** The OKF type values this workflow knows. Unknown values are tolerated. */
export const KNOWN_TYPES = [
  "task", "ticket", "map", "spec",
  "findings", "changelog", "out-of-scope note",
  "deviation report", "arch spec",
] as const;
export type KnownType = (typeof KNOWN_TYPES)[number];

/** Workflow category: task subtypes, then ticket subtypes. */
export const TASK_SUBTYPES = ["research", "prototype", "grilling", "manual"] as const;
export const TICKET_SUBTYPES = ["feature", "bug"] as const;

export type OkfStatus = "draft" | "stable" | "deprecated";
export type WorkflowStateValue = "todo" | "ready" | "in-progress" | "blocked" | "done";

export interface Artifact {
  type: string;                     // OKF type. v4 `type:`, or v3 `kind:` mapped.
  subtype: string | null;           // v4 `subtype:`, or v3 `type:` mapped.
  status: string | null;            // OKF status; absent means stable.
  workflow_state: string | null;    // companion field; absent on spec/map/aux.
  slug: string;                     // v4: the directory name. v3: the `slug:` field.
  title: string | null;
  mode: string | null;              // "human" or absent.
  size: string | null;              // tickets only; absent means "m".
  blocked_by: string[];             // kind-scoped, effort-scoped.
  shape: "v3" | "v4";               // which frontmatter shape was read.
  data: FrontmatterData;            // the raw frontmatter, untouched.
}
```

### Dual-shape parsing

`fromFrontmatter(data)` reads both shapes and never writes the old one:

| v4 field | v3 field | mapping |
|---|---|---|
| `type` | `kind` | v3 `kind: task` becomes `type: "task"` |
| `subtype` | `type` | v3 `type: feature` becomes `subtype: "feature"` |
| `status` | `status` | same key, new vocabulary |
| (new) | (none) | `workflow_state` has no v3 counterpart; left null |
| `slug` | `slug` | v3 keeps it; v4 derives it from the directory |
| (dropped) | `map` | recognized, not modeled; placement is the grouping |

**Required:** a non-empty `type` (or v3 `kind`). A file with neither is not an
artifact and is rejected, which is OKF conformance (§11).

**Tolerated:** an unknown `type` value. This is a deliberate behavior change:
today `fromFrontmatter({ kind: "widget" })` throws, and OKF requires consumers
to tolerate unknown values. `tests/art.test.ts`'s "throws on invalid kind" case
is replaced by "tolerates an unknown type, rejects a missing one".

`slug` resolution order: the v3 `slug:` field when present, else the artifact's
directory name (v4 Concept-ID style). The resolver supplies the directory name.

### Combination rules

`validateCombination(status, workflow_state): string | null` returns null when
valid, else a human-readable reason:

- `draft` pairs only with `todo`.
- `deprecated` pairs only with `done`.
- `stable` pairs with any `workflow_state`.
- Absent `status` means `stable` (OKF omitted-implies-stable), so any
  `workflow_state` is valid.
- Absent `workflow_state` (spec, map, changelog, aux) has no combination to
  check.

`validateArtifact(art): Anomaly[]` wraps this plus the shape checks.

### Anomalies

```ts
export interface Anomaly {
  kind: "invalid-combination" | "missing-type" | "orphan" | "missing-blocked-by-target";
  artifact: string;   // slug, or path when the slug is unknown
  detail: string;     // one sentence, actionable
}
```

- `invalid-combination`: from the rules above.
- `missing-type`: frontmatter present but no non-empty type.
- `orphan`: the artifact's `type` disagrees with its location (a `ticket.md`
  whose type is `task`, a `task.md` whose type is `ticket`), or a task/ticket
  sits in an effort directory that has neither `map.md` nor `spec.md`.
- `missing-blocked-by-target`: a `blocked_by` entry that no artifact in the
  same effort provides.

`findAnomalies(artifacts: Artifact[]): Anomaly[]` computes the last two across
a scanned set. This ticket only *produces* these; the graph tools consume them
next ticket.

## The resolver (`src/pi.ts`)

Replace the ad-hoc `resolveArt` with a scan-based index.

```ts
interface ScanHit { path: string; art: Artifact; doc: Document }

/** Every artifact on disk, live and archived, in both shapes. */
function scanArtifacts(root: string): ScanHit[]

/** Resolve a selector, honoring the wanted type on every branch. */
function resolveArt(root: string, selector: string, want?: string): ScanHit
```

**Scan locations.** Live: `docs/tasks/<effort>/map.md`, `spec.md`,
`arch-spec.md`, `tasks/<task>/task.md`, `tickets/<ticket>/ticket.md`, and aux
files (`findings.md`, `deviation-reports/*.md`) inside task and ticket
directories. v3: `docs/tasks/maps/<map>/map.md`, `docs/tasks/<task>/task.md`,
`docs/tasks/<task>/slices/<n>-<slug>.md`. Archived: the same shapes under
`docs/tasks/archive/**`. A file that does not parse as an artifact is skipped,
not fatal.

**Resolution order.** (1) an explicit path or a path-like selector, resolved
directly; (2) a slug match against the index, where the slug is the v3 `slug:`
field or the directory name. When a directory is given, prefer `map.md`, then
`ticket.md`, then `task.md`, then `spec.md`.

**The kind-confusion fix.** Today the slug branch scans with a hardcoded
`"task"` hint and never checks `want`, so `want: "map"` can return a task. In
the new resolver every branch filters the candidate set by `want` before
matching, and a mismatch raises a clear error naming the wanted type:

```
'login' has type 'ticket', not 'map'
```

An unresolvable selector raises `no <want> matches '<selector>'`, naming the
wanted type when one was given.

**Ambiguity.** More than one hit for the same slug and type is an error naming
the colliding paths, as today.

## Existing abstractions to use

- `parse` / `dump` / `Document` / `FrontmatterData` from `core/frontmatter.ts`.
- `FrontmatterError` / `ResolutionError` from `core/err.ts`.
- `taskRoot`, `findRoot`, `listSubdirs`, `isDir`, `isFile` in `src/pi.ts`.
- Test helpers `mkTmp` / `ctx` in `tests/plugin.test.ts`; the `describe` /
  `test` style of `tests/art.test.ts`.

## Do NOT reimplement

- No new YAML or file-IO helper; `readYaml` / `writeYaml` already exist.
- Do not change `frontmatter.ts`; the model consumes it as-is.
- Do not delete `sliceInfoFrom`, `SliceInfo`, `dependencyLevels`, or
  `activeSlices`; the live tree and the full suite depend on them until
  `overhaul-dead-surface`.
- Do not rewire the graph tools; they keep their current behavior this ticket.

## Seams (need approval)

1. **Model seam:** the pure exports of `src/core/art.ts` (`fromFrontmatter`,
   `validateCombination`, `validateArtifact`, `findAnomalies`, the type
   constants), no file I/O.
2. **Tool-contract seam:** `createTools()` then `task_get` / `task_show`
   executed against scratch fixture trees in both shapes, the way skills
   invoke them.

No test imports a private helper from `src/pi.ts`.

## Interface contract for dependents

- `Artifact.type` / `.subtype` / `.status` / `.workflow_state` / `.shape` are
  the fields every downstream tool reads. `Artifact.kind` is **gone**; call
  sites that read it are updated to `.type` in this ticket, mechanically, with
  no behavior change for legacy artifacts (`kind: map` and `type: map` both
  yield `art.type === "map"`).
- `resolveArt(root, selector, want?)` where `want` is an OKF type string.
- `findAnomalies` is the seam `overhaul-graph-tools` consumes.

## Test plan

`tests/art.test.ts` (model seam):

- `fromFrontmatter` reads a v4 task, ticket, map, spec, and aux file.
- Dual shape: a v3 file (`kind` / `type` / `slug` / `map`) maps to the v4
  fields; `shape` is `"v3"`.
- Unknown `type` tolerated; missing `type` rejected.
- `validateCombination` truth table: every allowed pair clean, every forbidden
  pair reported (draft+done, draft+ready, deprecated+todo, deprecated+ready).
- Absent status means stable; absent workflow_state has no rule.
- `findAnomalies` reports a mismatched type/location, an effort with no
  map/spec, and a `blocked_by` target that does not exist.

`tests/plugin.test.ts` (tool-contract seam):

- Old-shape fixture: every existing `task_get` / `task_show` assertion still
  passes unchanged.
- New-shape fixture: an effort directory with `map.md`, `spec.md`, `tasks/`,
  and `tickets/` resolves each by slug and by path; `task_show` prints the
  frontmatter and `task_get` reads a field.
- Spec-only effort directory resolves.
- Aux files (`findings.md`, a deviation report) resolve.
- Mixed tree: both shapes coexist and both resolve.
- The kind-confusion regression: `want: "map"` against a ticket slug errors
  naming the actual type; an unresolvable slug names the wanted type.
- Empty effort directory and empty frontmatter produce clear errors, not
  crashes.

`tests/state.test.ts` and the graph-tool tests are untouched and must stay
green (the no-regression criterion).

## Constraints and dependencies

- Size `l`: chain budgets 60 turns / 600s.
- Design context: `docs/tasks/task-tools-overhaul/spec.md` sections Layout and
  artifacts, Frontmatter (OKF 0.2 unification), and the resolver paragraph
  under Tool surface; decision record
  `docs/tasks/overhaul-synthesis-grilling/task.md` rounds 3, 5, 6, 7.
- No em-dashes in any prose this workflow writes.
