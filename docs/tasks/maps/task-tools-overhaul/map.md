---
kind: map
slug: task-tools-overhaul
title: Research the task-workflow end to end and overhaul its extension tools
status: active
tasks:
- slug: tool-surface-inventory
  blocked_by: []
  done: true
- slug: workflow-tool-usage-audit
  blocked_by: []
  done: true
- slug: overhaul-synthesis-grilling
  blocked_by:
  - tool-surface-inventory
  - workflow-tool-usage-audit
  done: true
- slug: overhaul-state-module
  blocked_by: []
  done: true
- slug: overhaul-artifact-model
  blocked_by:
  - overhaul-state-module
  done: true
- slug: overhaul-v4-migration
  blocked_by:
  - overhaul-artifact-model
  done: true
- slug: overhaul-graph-tools
  blocked_by:
  - overhaul-v4-migration
  done: true
- slug: overhaul-tw-rename
  blocked_by:
  - overhaul-graph-tools
  done: true
- slug: overhaul-planning-skills
  blocked_by:
  - overhaul-tw-rename
  done: false
- slug: overhaul-execution-skills
  blocked_by:
  - overhaul-tw-rename
  done: false
- slug: overhaul-dead-surface
  blocked_by:
  - overhaul-planning-skills
  - overhaul-execution-skills
  done: false
---

## Destination

The task-workflow's extension tools are made to actually fit the workflow
they serve, end to end: every tool and hook the extension registers is
documented at contract level, every step of the main flow (wayfinder →
to-spec → to-tickets → implement-task, plus all supporting skills) has its
tool interactions mapped, every contradiction between skill prose and tool
behavior is surfaced, and the result is a user-confirmed overhaul plan
(spec) for the extension's tool surface. The plan is this map's deliverable;
implementing it is out of scope.

This effort grew out of the confirmed drift findings of 2026-09-12: the v3
adoption deliberately left `src/pi.ts` untouched, and the tools still encode
v2-era semantics (state.yaml key-wiping, legacy-slice-only machinery,
schema text that denies the ticket-generation phase, spec-only directories
invisible to the graph). The overhaul must not re-argue that drift exists;
it designs the way out.

## Constraints

- The deliverable is a decision-complete plan handed to `/skill:to-spec`,
  not implementation. No production code changes land from this map.
- Research runs against the working tree as the source of truth; in-flight
  uncommitted changes (repo-gate refactor, handoff rewrite, eval-review
  skill) are labeled as such in the findings, not treated as provisional.
- Scope: everything the workflow uses from wayfinder through
  implement-task and supporting skills. Tools/behaviors outside that flow
  are inventoried (R1) but not audited at depth (R2).
- Schema changes (v4) may be proposed, but any accepted proposal must ship
  with a `setup-workflow` upgrade path: `schema_version` 3 → 4 with an
  upgrade resource, because `setup-workflow` keys its fresh/migrate/no-op
  detection on that field.
- No em-dashes anywhere in prose.
- User decisions happen in the synthesis grilling (G1), not smuggled into
  research tasks.
- Known-future requirements are design inputs, not new work: the
  two-phase to-spec/to-tickets model, and the pi-harness-evals map's
  manual-mode marker (implement-task must hard-refuse autonomous dispatch
  for a marked task/slice). The eval-creator build itself is not absorbed.
- The destination demands honest findings: the audit names tools the
  workflow never uses, tools whose behavior contradicts skill prose, and
  workflow steps with no tool support at all, even where uncomfortable.

## Decisions so far

- **Audit scope (grilling round 1, Q1).** Cover the extension's full
  registered surface in the inventory, because we do not know yet what the
  workflow uses; depth is reserved for the workflow-facing slice (tw_* at
  depth, everything else shallow). R1 catalogues all of it; R2 audits at
  depth only what the flow from wayfinder to implement-task (and
  supporting skills) actually touches.
- **Schema latitude (grilling round 1, Q2).** v4 schema proposals are
  allowed. Any accepted proposal must include a `setup-workflow` migration
  path from the current schema (schema_version 3) to the new one; no
  format change lands without its upgrade resource.
- **Audit target (grilling round 1, Q3).** The working tree is the source
  of truth. In-flight uncommitted changes are labeled in the findings.
- **Known-future requirements as design input (grilling round 1, Q4).**
  The two-phase model and the manual-mode marker are recorded requirements
  the new tool surface must accommodate. The eval-creator build is not
  absorbed into this effort.
- **Task graph (grilling round 1, Q5).** Three planning tasks: R1
  tool-surface-inventory (research), R2 workflow-tool-usage-audit
  (research), R3-style synthesis grilling G1 overhaul-synthesis-grilling,
  blocked by R1 and R2. The map ends at the plan; implementing it is out
  of scope.
- **Facts established before the map (session of 2026-09-12, to be folded
  into R1 as verified facts, not re-derived).**
  - The extension registers 20 tools: 17 tw_* tools, notify_user,
    get_guidelines, list_guidelines (plus the repo-gate and guidelines
    hooks). Current implementation: `src/pi.ts` (one file, ~1070 lines),
    core modules `src/core/{art,err,frontmatter,repo-gate,state}.ts`.
  - The v3 adoption arch-spec (adopt-mp-skills-way, slice
    changesets-prose-finalize) deliberately left src/pi.ts untouched
    ("foundational and untouched, keep-as-ours, Q11").
  - Confirmed bug: `tw_state_set` rewrites state.yaml through
    toObject/fromObject, silently dropping unknown keys including
    `schema_version`, which setup-workflow keys its fresh/migrate/no-op
    detection on. Demonstrated live 2026-09-12 (and restored).
  - `tw_context`'s schema text ends "there is no separate
    ticket-generation phase", contradicting the v3 two-phase main flow.
  - Slice machinery (tw_slices, tw_finalizable, tw_state_set slice,
    activeSlices, SLICE_RE) sees only legacy slices/<n>-*.md files, never
    the `slices:` frontmatter list; tw_set_slices writes that list but
    nothing reads it.
- **Naming (grilling round 1).** Map slug `task-tools-overhaul`.
- **G1 round 1 (2026-09-15), slice machinery deleted; map pointer in;
  tool verdicts in.** (a) Legacy slice machinery is **deleted end to
  end**: `tw_slices`, `tw_set_slices`, the state.yaml `slice` field,
  and all `slices/<n>-*.md` support go; `tw_finalizable` becomes a
  status-based predicate; `tw_dependency_levels` keeps its map
  branch, drops the task branch; to-tickets stops emitting `slices:`;
  wayfinder's feature/bug planning resources are deleted (feature/bug
  creation is to-tickets' job); implement-task's feature/bug pipelines
  rebase to per-ticket chains over the map frontier (arch-spec and the
  tdd chain survive, `size` becomes optional task frontmatter defaulting
  to `m`, failure-toolbelt splits become sub-tickets). Rejected: demote
  (dead code kept armed), freeze (vacuous-completion trap stays armed),
  rebase onto the `slices:` list (second nested graph; bare-slug list
  unreadable without moving status/size/blocked_by into frontmatter).
  (b) state.yaml gains a first-class **`map`** pointer
  (`tw_state_set`/`tw_state` support it; wayfinder sets on create
  and resume, implement-task when invoked with a map, finalize-task
  clears on map finalization). (c) Deleted tools: `tw_resolve`,
  `tw_assert_kind`, `tw_map_tasks` (zero callers; paths
  convention-derived; kind confusion is a resolver bug to fix in the
  rework, not an assert tool's job; raw-array view superseded by
  spec-visibility work). Kept: `notify_user` untouched,
  workflow-external. (d) **The entire guidelines feature is deleted**:
  `get_guidelines` and `list_guidelines` plus the `before_agent_start`
  guidelines injection and discovery machinery; a later map revamps
  repo-standards delivery. Downstream re-pointing: code-review's
  standards-sources step and tdd-worker prompts read standards files
  directly.
- **G1 round 2 (2026-09-15).** (a) state.yaml v4 shape is
  `{schema_version: 4, map, task}`: `schema_version` stays in
  state.yaml, `tw_state_set` accepts exactly `map` and `task`,
  toObject/fromObject become lossless round-trips preserving unknown
  keys (the key-wipe fix), and the string-`None` wart dies with the
  3→4 migration rewrite. (b) spec becomes a first-class artifact
  kind: spec.md gains frontmatter (kind, slug, title, map, status;
  to-spec template updated), resolveArt resolves spec-only
  directories, mapChildInfos reports every listed child with
  best-known truth (task.md, else spec.md, else listed-but-missing as
  unfinished), tw_list also scans spec.md so unregistered spec-only
  efforts are visible, map-side done/blocked_by overrides apply to
  spec children unchanged. (c) Manual-mode marker named now:
  `mode: human` optional task frontmatter, enforced in
  implement-task's router prose (hard-refuse autonomous dispatch,
  hand off with the `/skill:` name), documented in tw_context's
- **G1 round 3 (2026-09-15).** (a) Task frontmatter v4: keep `kind,
  slug, title, type, map, status, blocked_by`; add optional `mode:
  human` and `size` (moved from slice docs to the ticket, default `m`);
  kill `slices:`, `started_at`/`completed_at`, slice-level
  `mode: hitl|afk`, and `bug:` (never read by any tool; the bug doc
  reference moves to the task body). (b) spec.md frontmatter:
  `kind, slug, title, map, status`, same vocabulary as tasks plus
  `draft`; a spec-only child counts as unfinished until `done`, with
  equal blocking semantics, so the false-finalizable class dies by
  design. (c) tw_context kept, full schema-text rewrite to v4
  (slice section and ticket-phase denial deleted, killed fields
  gone, profile.md stays an optional append, finalize-task's CI-gate
  prose repointed at repo tooling). (d) Migration: the user's
  constraint is "properly migrates everything no matter the current
  version": any repo state (fresh, unversioned, v1 nested, v2, v3)
  ends at v4 (state.yaml `{schema_version: 4, map, task}`, killed
  fields stripped, spec.md frontmatter added, legacy slice dirs
  reported); never corrupt (round-trip verified before write,
  untouched on failure), idempotent, resumable, with a report;
  implementation shape free for to-spec; the dead
  `/skill:task-overview` pointer fixed in the same effort.
  (e) docs/evals.md: prose-only, no tool support; owned by the
  pi-harness-evals map.
- **G1 round 5 (2026-09-15): effort-grouped layout + OKF 0.2.** The
  docs/tasks tree reorganizes into `docs/tasks/<feature>/` holding
  `map.md`, `spec.md`, and `tickets/<ticket>/task.md` (one nesting
  level; sibling files stay in the ticket dir; filenames stay
  `task.md`; vocabulary sweep deferred, "maybe later"). state.yaml
  stays at `docs/tasks/state.yaml`. The `maps/` subtree and the map's
  `tasks:` registration array are deleted: every task carries its own
  `map:` and `blocked_by:` frontmatter, done-ness reads from each
  task's own status, the graph tools rebuild on directory scans, and
  mapChildInfos' override semantics and tw_map_tick die with the
  array (user principle: avoid metadata that concerns a file but is
  stored outside that file). OKF 0.2 compliance for the entire
  directory: `type` is the artifact kind (task, map, spec, findings,
  changelog, out-of-scope note, deviation report, arch spec), the
  workflow category moves to `subtype`, `kind:` dies corpus-wide,
  `status` uses OKF's draft/stable/deprecated with a companion
  workflow field (split defined in round 6), aux files and archive
  are backfilled, out-of-scope README becomes index.md, a root
  index.md carries `okf_version: "0.2"`, producer skills write
  conformant files forever, doctor gains a conformance symptom, and
  vendored non-OKF trees (this repo's matt-skills snapshot) move
  outside the bundle with a pointer. OKF optional families: prefer
  OKF counterparts over custom fields; adoption proposal comes with
  the landed schema. Migration: one v4 hop from any state (fresh,
  unversioned, v1, v2, v3, any layout) to the new tree.
- **G1 rounds 6-7 (2026-09-15): task/ticket split, status split,
  tw_* rename.** Wayfinder decision items are tasks (`tasks/<task>/
  task.md`), to-tickets products are tickets (`tickets/<ticket>/
  ticket.md`); a feature dir holds both plus map.md, spec.md, and
  arch-spec.md at its root. `status` is OKF's draft/stable/deprecated,
  `workflow_state` is todo/ready/in-progress/blocked/done with
  enforced consistency combos (draft+todo, stable+any,
  deprecated+done); done-ness gates on workflow_state. The `map:` and
  `slug` fields on tasks and tickets are dropped (directory placement
  is the grouping; slug is the dir name). `blocked_by` is kind-scoped
  and feature-scoped; feature-to-feature deps live on the map's own
  `blocked_by`. Map frontmatter is type/title/status/blocked_by only,
  derived done-ness, tw_map_tick dead. Every effort goes through
  wayfinder + to-spec/to-tickets: no map-less one-offs; a one-off is
  a feature with a single ticket (spec+zero-tickets features are not
  finalizable). Tool prefix renames task_* to tw_* (tw_show, tw_get,
  tw_set, tw_list, tw_frontier, tw_dependency_levels,
  tw_map_finalizable, tw_state, tw_state_set, tw_context).
- **G1 round 4 (2026-09-15): ui-noter pathway deleted.** The
  reworked chains drop the `agent: "ui-noter"` dispatch (the agent
  never existed) and finalize-task's Step 2 impeccable-note check
  (its consumer silently no-ops; zero notes were ever produced);
  `impeccable` stays user-invoked, outside the pipeline; a future
  ui-note feature is a new map, same as the guidelines revamp.
- **Slice verdict settled, fog entries 1-4 retired (G1 rounds 1-3).**
  G1 is decision-complete; the map hands off to `/skill:to-spec
  task-tools-overhaul`.

## Fog

None. All decision areas are settled by G1 rounds 1-7: slice
machinery, tool verdicts, guidelines feature, state shape, map
pointer, spec visibility, creation/registration, manual-mode marker,
frontmatter v4 (with the task/ticket split, status split, OKF
unification), effort-grouped layout, OKF 0.2 compliance, tw_* tool
rename, ui-noter, migration scope. Open proposals deliberately
deferred to later maps: guidelines revamp, ui-note feature,
OKF trust/provenance family adoption beyond `status` (round 5 Q10
user direction: prefer OKF counterparts, revisit on the landed
schema), full vocabulary sweep beyond the tool prefix. The map hands
off to `/skill:to-spec task-tools-overhaul`.

## Out of scope

- Implementing the overhaul (the to-spec/to-tickets and implement-task
  that follow are separate flows consuming this map's plan).
- The eval-creator skill build itself (owned by the pi-harness-evals map;
  its recorded decisions are input only).
- The repo-gate refactor itself (in-flight in the working tree; only
  audited, never finished or reverted here).
- Post-hoc telemetry analysis (owned by the telemetry-eval skills).
- Migrating skills of other harnesses or packages.
