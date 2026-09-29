# Architecture spec: overhaul-planning-skills

Status: approved by the user (2026-09-29). Three decisions were taken in the
approval conversation: (1) the `tw_list` v4 rework is IN this ticket (it was
a gap no ticket owned); (2) no docs pages here, a follow-up task owns the
docs-page backfill; (3) newly created tasks and tickets carry
`workflow_state: ready` (matches the migration's v3-to-v4 mapping).

Scope: prose of the five planning-side skills, the `tw_list` tool rework,
and the structure tests. NOT touched: implement-task, finalize-task, tdd,
code-review (ticket overhaul-execution-skills owns those), any other
extension code, the repo's own docs/tasks tree (still v3 until the user
runs the migration).

## The v4 conventions producers write

Single source for both the prose and the tests. These match the migration's
target shapes exactly (see `shapeFrontmatter` in `src/core/migrate.ts` and
the v4 fixtures in `tests/plugin.test.ts`).

### Map, `docs/tasks/<effort>/map.md`

```yaml
---
type: map
title: <title>
status: stable
blocked_by: []   # optional; effort-to-effort edges
---
```

No `kind`, no `slug`, no `tasks:` array, no `status: active`. The body keeps
the canonical sections (Destination, Constraints, Decisions so far, Fog,
Out of scope). The effort slug is the directory name.

### Decision task, `docs/tasks/<effort>/tasks/<task>/task.md`

```yaml
---
type: task
subtype: research   # or prototype | grilling | manual
title: <title>
status: stable
workflow_state: ready
blocked_by: [<task-slug>, ...]
mode: human   # optional; omit unless the human must implement it
---
```

No `kind`, `slug`, `map`, or `slices` fields. The four planning resources
(research, prototype, grilling, manual) each carry this template with their
subtype. `feature.md` and `bug.md` are deleted: feature and bug creation is
to-tickets' job.

### Spec, `docs/tasks/<effort>/spec.md`

```yaml
---
type: spec
title: <title>
status: draft   # stable once the user approves the spec
---
```

No workflow_state. `draft` while synthesizing, `stable` on approval.

### Ticket, `docs/tasks/<effort>/tickets/<ticket>/ticket.md`

```yaml
---
type: ticket
subtype: feature   # or bug
title: <title>
status: stable
workflow_state: ready
blocked_by: [<ticket-slug>, ...]
size: m   # optional; s | m | l | xl; absent means m
mode: human   # optional; omit unless the human must implement it
---
```

No `kind`, `slug`, `map`, or `slices` fields. The `tickets/` directory is
the registration: there is no array write. The advertised contract tells
the truth: the ticket files are written by hand (by the agent following the
skill), and the tw_* tools make the resulting graph queryable.

## Per-skill changes

### Wayfinder (`skills/engineering/wayfinder/`)

- Map at the effort root `docs/tasks/<effort>/map.md` (the `maps/` subtree
  is gone from the target layout).
- Tasks at `docs/tasks/<effort>/tasks/<task>/task.md`; the four planning
  resources' templates updated to the v4 frontmatter; feature.md and
  bug.md deleted; the prose points feature and bug creation to
  `/skill:to-tickets` (Boundary alignment).
- State pointers: on map creation run `tw_state_set map <effort-slug>` and
  clear a stale task pointer (`tw_state_set task null`); on resume set the
  map pointer again and set the task pointer to the focused task
  (`tw_state_set task <task-slug>`).
- Root index: on map creation add the effort to the `## Live` list in
  `docs/tasks/index.md`, keeping the list sorted. The index format matches
  the migration's writer (`writeIndex` in `src/core/migrate.ts`):
  frontmatter `type: index`, `okf_version: "0.2"`, `title: docs/tasks`;
  body `# docs/tasks`, `## Live` (sorted effort list), `## Archived`.
- Frontier prose: `tw_frontier <effort-slug>`; a task is ready when every
  task in its `blocked_by` list is done.
- Telemetry blurb: the map slug is the effort directory name (drop the
  `docs/tasks/maps/` phrasing).
- The stale sentence "It replaces `create-task`, `to-spec`, and
  `to-tickets`" is rewritten: wayfinder hands off to to-spec and to-tickets
  (the two-phase model), it does not replace them.

### To-spec (`skills/engineering/to-spec/SKILL.md`)

- Saves at `docs/tasks/<effort>/spec.md` (the effort root; the effort comes
  from the invocation's map slug or the conversation). The description
  frontmatter's `docs/tasks/spec.md` path is corrected too.
- Writes the v4 frontmatter; flips `status` to `stable` when the user
  approves the spec.
- Everything else unchanged (no interview, seams check with the user, the
  template body).

### To-tickets (`skills/engineering/to-tickets/SKILL.md`)

- Reads the spec at `docs/tasks/<effort>/spec.md`; writes tickets under
  `docs/tasks/<effort>/tickets/<ticket>/ticket.md` with the v4 ticket
  frontmatter (subtype feature or bug, workflow_state ready, optional size
  defaulting to m when absent, optional mode: human).
- The `slices:` field is gone from the template and the prose; the
  map-array registration step is gone (the directory is the registration).
- Step 5 rewritten to the honest contract: write the files by hand, then
  query the graph via `tw_dependency_levels <effort-slug>` and
  `tw_frontier <effort-slug>`. No claim of tool support for creation.
- Keeps: the vertical-slice rules, the wide-refactor expand-contract
  exception, the user quiz, the ticket body template (What to build /
  Acceptance criteria / Blocked by). One-ticket efforts are fine: a
  one-off is an effort whose tickets directory holds exactly one ticket.

### Doctor (`skills/engineering/task-workflow-doctor/`)

- New symptom row in the SKILL.md table plus a new resource
  `resources/okf-conformance-failure.md`:
  - Symptom: files under `docs/tasks/` fail OKF conformance (missing
    frontmatter, missing or empty `type`, invalid status/workflow_state
    pairs); the graph tools report anomalies.
  - Detection: (1) read `docs/tasks/state.yaml`; a missing `schema_version`
    below 4 means the tree is pre-v4; (2) run `tw_frontier docs/tasks` and
    read the Anomalies blocks (invalid combinations, orphans, missing
    blocked_by targets); (3) a compact bash sweep for frontmatter presence
    and non-empty `type` (the scan silently skips those files);
    `index.md` and `log.md` are reserved filenames, exempt.
  - Routing: a pre-v4 tree goes to `/skill:setup-workflow` (migrate
    branch); v4 drift goes to the responsible producer by file: `map.md`
    or `tasks/<t>/task.md` to `/skill:wayfinder`,
    `tickets/<t>/ticket.md` to `/skill:to-tickets`, `spec.md` to
    `/skill:to-spec`, archived shapes to `/skill:finalize-task`.
- `resources/missing-tasks-tree.md` updated to the v4 tree shape (no
  `maps/` subtree; effort dirs holding map.md, tasks/, tickets/; archive,
  out-of-scope, state.yaml, index.md, CHANGELOG.md at the root).
- The new prose references only surviving tools.

### Router (`skills/engineering/task-workflow-overview/SKILL.md`)

- Intro tells the v4 truth: `docs/tasks/` is an OKF bundle; one directory
  per effort holding `map.md`, an optional `spec.md`, a `tasks/` subdirectory
  of decision tasks, and a `tickets/` subdirectory of implementation
  tickets.
- Main flow unchanged in shape (grilling, wayfinder, to-spec, to-tickets,
  implement-task per ticket, finalize), vocabulary updated to tasks and
  tickets.
- Read-only queries: the `tw_slices` row is gone ("What's left on effort
  X?" answers with `tw_dependency_levels <effort>` / `tw_frontier
  <effort>`); "List efforts / tasks / tickets" stays `tw_list` (reworked
  below); "Where am I?" stays `tw_state` (both pointers).
- Actions table gains a doctor row (Diagnose a broken workflow,
  `/skill:task-workflow-doctor`).
- `PHASE-BOUNDARIES.md` unchanged.

## The tw_list rework (src/pi.ts, src/core/graph.ts, tests/plugin.test.ts)

`tw_list` still scans the v3 layout (`maps/` subtree plus flat `task.md`
directories) and finds nothing on a v4 tree. Rework it onto the scan
layer, keeping v3 trees working (the scan reads both shapes):

- Implementation: filter `scanMemo(root)()` hits, excluding any path with
  an `archive/` segment. Output rows show `slug (type/subtype)` plus the
  workflow_state (falling back to status for v3 artifacts); the json flag
  returns slug, type, subtype, status, workflow_state, effort, path.
- Parameters:
  - `kind`: optional, enum widened to `["map", "task", "ticket", "spec"]`,
    filters `art.type`.
  - `status`: optional, filters `art.status` (OKF status on v4 trees; on
    v3 trees the field holds the legacy values, still matched verbatim).
  - `workflow_state`: optional, new, filters `art.workflow_state`.
  - `effort`: optional, replaces the old `map` param, filters by the
    artifact's effort group using the same grouping the graph tools use.
- `src/core/graph.ts` exports the grouping helper (promote `groupKeyOf` /
  `slugFromKey` or one combined `effortGroupOf(art)`), so the filter
  cannot drift from the graph semantics. This mirrors the landed
  graph-tools deviation of promoting exports rather than duplicating
  rules.
- Tests: the existing v3 seedTree tests keep passing (list all, kind
  filter, status filter, effort filter, json flag); add v4-fixture tests
  (tickets listed, effort filter, workflow_state filter, archived
  excluded).

## Tests (tests/skills.test.ts, tests/plugin.test.ts)

Flips of existing assertions invalidated by the changes:

- "wayfinder has one planning resource per task type": only research,
  prototype, grilling, manual exist; `feature.md` and `bug.md` are
  asserted absent.
- "wayfinder owns planning task creation and direct handoff": the
  `create-task`, `to-spec`, and `to-tickets` phrase assertion is replaced
  by the v4 planning surface (wayfinder creates planning tasks only;
  to-tickets owns feature and bug creation).

New structure tests (the existing pattern):

- Wayfinder: map template carries the v4 fields and no killed keys
  (`kind`, `slug`, `tasks`); tasks at `<effort>/tasks/<slug>/task.md`;
  `tw_state_set` on create and resume; the index regeneration step.
- Each planning resource: the v4 frontmatter with its subtype.
- To-spec: the spec.md template with type, title, status; the effort-root
  path.
- To-tickets: the ticket.md template with type, subtype, workflow_state,
  optional size and mode; no `slices:` anywhere; no map-array registration
  language; the honest contract wording.
- Doctor: the conformance symptom row and resource exist; the resource
  names the migration route and the producer routes; only surviving tool
  names appear.
- Router: describes the effort-grouped tree (tasks/ and tickets/), the
  wayfinder to to-spec to to-tickets handoff; no `tw_slices`; the doctor
  row.

New template-conformance seam (the impossible-by-construction check):

- Extract every YAML frontmatter template from the five skills' prose,
  substitute the placeholders, and run each through the repo's own
  `parse()` plus `fromFrontmatter()` plus `validateArtifact()` plus
  `findAnomalies()` (no new conformance code): zero anomalies, and no
  killed fields (`kind`, `slug`, `map`, `slices`) in any template.
- Planted failure: assemble a fixture effort from the extracted templates
  under a temp dir, plant one file with an invalid pair (`status: draft`
  with `workflow_state: done`) and one with no `type`; `findAnomalies`
  reports the planted pair (the same engine the doctor's symptom reads),
  and the sweep predicate flags the type-less file.

## Existing abstractions to use

- `src/core/frontmatter.ts` (`parse`), `src/core/art.ts`
  (`fromFrontmatter`, `validateCombination`, `findAnomalies`): the
  conformance engine the tests reuse.
- The scan layer in `src/pi.ts` (`scanMemo`, `scanIndex`) for the tw_list
  rework; the v4 fixture builders in `tests/plugin.test.ts`.
- The structure-test pattern in `tests/skills.test.ts`.

## Do NOT reimplement

- No new conformance engine: the doctor's prose leans on the graph tools'
  Anomalies reporting plus a bash sweep in the resource.
- No changes to implement-task, finalize-task, tdd, or code-review prose
  (the parallel ticket owns them).
- No migration of this repo's own tree; the live tree stays v3 until the
  user runs `/skill:setup-workflow`.
- No docs pages for the five skills here (follow-up task records the
  backfill).

## Interface contract for dependents

- overhaul-dead-surface depends on zero-references: the new prose
  references only surviving tools (`tw_show`, `tw_get`, `tw_set`,
  `tw_list`, `tw_frontier`, `tw_dependency_levels`, `tw_finalizable`,
  `tw_map_finalizable`, `tw_state`, `tw_state_set`, `tw_context`). No
  `tw_slices`, `tw_set_slices`, `tw_resolve`, `tw_assert_kind`,
  `tw_map_tasks`, `tw_map_tick`, `get_guidelines`, or `list_guidelines`
  in the new prose.
- overhaul-execution-skills consumes the ticket frontmatter (subtype,
  size, mode) and the effort paths (tickets under `tickets/`, the spec at
  the effort root) defined here.
- The doctor's producer-routing table names wayfinder, to-spec, and
  to-tickets, which this ticket makes conformant producers.
