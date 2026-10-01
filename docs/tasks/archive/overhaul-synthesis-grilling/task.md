---
kind: task
type: grilling
slug: overhaul-synthesis-grilling
title: Fold R1 + R2 into overhaul decisions (gap matrix, keep/rework/delete, schema v4) via grilling
map: task-tools-overhaul
status: deprecated
blocked_by:
- tool-surface-inventory
- workflow-tool-usage-audit
workflow_state: done
---

## The decision to settle

Fold the tool-surface inventory (R1) and the workflow usage audit (R2)
into the concrete overhaul design decisions, through a grilling interview
with the user: the gap matrix (every registered tool vs. every workflow
step), the keep/rework/delete verdict for each tool, the slice-machinery
verdict (demote, freeze, or delete legacy slice support), the state.yaml
and state-shape design (fixing the key-wiping bug class, the map pointer
question), the artifact-format question (whether to propose schema v4 and
what it looks like), and the new-tool-support question (what the v3-era
flow is missing: spec-phase awareness, manual-mode marker, docs/evals.md).
End with a user-confirmed decision set ready for `/skill:to-spec`.

## The parent decisions it depends on

- The map's settled decisions (Q1-Q5 from grilling round 1): full-surface
  inventory, working tree as source of truth, v4 proposals allowed
  (with mandatory setup-workflow upgrade path), known-future requirements
  as inputs, three-task graph ending at the plan.
- The tool contracts from tool-surface-inventory (R1 findings).
- The usage evidence from workflow-tool-usage-audit (R2 findings):
  load-bearing tools, dead weight, contradictions, missing support.

## The choices already known

- Slice machinery: demote to documented-legacy, freeze as-is, or delete.
- state.yaml: fix key-preservation in place (keep v3 shape), or redesign
  state shape as part of v4 (with upgrade resource).
- Artifact formats: keep v3 frontmatter as-is, or evolve to v4
  (must ship the setup-workflow 3→4 upgrade resource).
- Tool surface: keep all 20, prune unused, rework drifted ones; add new
  tools for uncovered workflow steps (spec-phase awareness, marker
  enforcement) or keep those prose-only.
- task_context schema text: align with two-phase reality (confirmed
  contradiction; the open choice is only how far the rewrite goes).

## The recommended starting answer

Start from the evidence-weighted position: fix the state.yaml
key-preservation bug regardless of anything else (it is a bug, not a
design choice); align task_context's schema text with the two-phase
model; prune tools R2 shows are dead weight, keeping any tool with at
least one load-bearing invocation; redesign state shape and frontmatter
as v4 only where R2 shows the v3 flow actively fights the format, and
where proposed, always with the setup-workflow migration resource in the
same slice. Do not pre-decide the slice verdict before reading R2's
cited evidence.

## What downstream work the answer may create

- A spec (via `/skill:to-spec task-tools-overhaul`) collapsing the
  decisions into the overhaul's buildable plan, which then goes to
  `/skill:to-tickets` and `implement-task` as a separate effort consuming
  this map's output. This map ends at the confirmed decision set.

## Decisions (G1 rounds)
### Round 1, 2026-09-15

- **Q1, Slice machinery: delete end to end.** `task_slices`,
  `task_set_slices`, the state.yaml `slice` field, and all legacy
  `slices/<n>-*.md` support go away; `task_finalizable` becomes a
  status-based predicate (exact form in to-spec);
  `task_dependency_levels` keeps its map branch, drops the task branch.
  Rationale: zero live legacy slice docs in the corpus; the only
  producers are wayfinder resources its own Boundary forbids and the
  failure toolbelt's ad-hoc splits; the sanctioned v3 producer
  (to-tickets) writes a `slices:` list no tool reads; the autonomous
  pipelines vacuously "complete" any v3 ticket by filtering an empty
  `task_slices` result. Rejected: demote (delete plus dead code kept
  armed), freeze (leaves the vacuous-completion trap armed), rebase onto
  the `slices:` list (a second nested task graph inside tasks when the
  map already is that graph; the list holds bare slugs, so status,
  size, blocked_by would have to move into frontmatter to make it
  readable). Consequences: to-tickets stops emitting `slices:`;
  wayfinder's feature/bug planning resources deleted, aligning behavior
  with the Boundary (feature/bug creation is to-tickets' job, hand the
  human `/skill:to-tickets`); implement-task's feature/bug autonomous
  pipelines rebase to per-ticket chains over the map frontier
  (arch-spec and the tdd chain survive, `size` becomes optional task
  frontmatter defaulting to `m`, failure-toolbelt splits become
  sub-tickets registered in the map); land-worker loses its
  slice-archive duty. Residual risk accepted: a personal repo mid-v2-flow
  with live slice docs loses working support; the migration resource
  reports any legacy slice docs it finds.
- **Q2, Map pointer: add `map` to state.yaml.** `task_state_set` gains
  the field, `task_state` shows it; wayfinder sets it on map create and
  resume, implement-task when invoked with a map, finalize-task clears
  it when the map finalizes. The v3 flow is map-first and the overview's
  "Where am I?" answer gains its map half; finalize-task's map steps
  stop depending on invocation prose. Key preservation is settled
  separately as a bug fix (never re-asked).
- **Q3, Gap matrix verdicts.** `task_resolve`, `task_assert_kind`, and
  `task_map_tasks` are **deleted** (zero skill callers; artifact paths
  convention-derived; every tool already takes slug-or-path; the kind
  confusion the audit found is a resolver bug to fix in the rework, not
  a reason to keep an assert tool; `task_map_tasks`' unique raw-array
  view is superseded by spec-visibility work and its drift class).
  `notify_user` is **kept** untouched (workflow-external,
  user-push surface, companion of long async chains; not wired into
  skills by this overhaul). The **entire guidelines feature goes**:
  `get_guidelines` and `list_guidelines` are both deleted along with
  the `before_agent_start` guidelines injection and the discovery
  machinery behind them; a later map/feature revamps repo-standards
  delivery. User decision (2026-09-15): the feature is deprecated in
  this overhaul, not redesigned. Downstream: code-review's "discover
  repo standards through `get_guidelines`" step and the tdd-worker
  prompts' "Call get_guidelines" line must be re-pointed at direct
  file reads (AGENTS.md, CONTEXT.md, docs/standards.md) by the
  implementation, per the R2 evidence.

### Round 2, 2026-09-15 (all four settled)

- **state.yaml v4 shape: `{schema_version: 4, map, task}`.**
  `schema_version` stays in state.yaml (it is setup-workflow's single
  detection point); `task_state_set` accepts exactly `map` and `task`;
  `toObject`/`fromObject` become lossless round-trips preserving unknown
  keys (the key-wipe fix, settled as a bug fix, not a design choice);
  the string-`None` encoding wart dies with the migration rewrite.
  `task_state` shows both pointers. Rejected: moving `schema_version`
  elsewhere (touches detection, doctor symptom, and every reader to
  fix what lossless round-tripping fixes in place).
- **Spec becomes a first-class artifact kind.** `spec.md` gains
  frontmatter (`kind: spec`, slug, title, map, status; to-spec template
  updated); `resolveArt` resolves spec-only directories; `mapChildInfos`
  reports every child the map lists with best-known truth (task.md,
  else spec.md, else listed-but-missing as an unfinished item), so
  frontier, dependency levels, and map finalizable see the same
  children; `task_list` also scans spec.md so unregistered spec-only
  efforts are visible; map-side done/blocked_by overrides apply to spec
  children unchanged. Rejected: registered-children fix only (leaves
  the live unregistered-spec failure invisible), discipline-only
  prose (leaves the drift class armed).
- **Creation/registration primitives: rescind the claim, no new
  tools.** (Re-asked in plain terms after the first pass was unclear.)
  to-tickets' description (and the router's echo of it, "using the
  `task_*` tools for the graph") is corrected to what actually happens:
  tickets and maps are written as files, and the task_* tools make the
  resulting graph queryable (frontier, dependency levels, ticks,
  state). Creation and map registration stay file-based; no creation
  or registration tool is added. Rationale: R2 found zero observed
  registration failures; the one real failure instance (the
  unticketed spec) was never a hand-edit error, it never went through
  to-tickets at all, and the spec-visibility decision fixes that
  class. Rejected: `task_map_register` (a typed writer against a
  failure mode never observed), full creation primitives (surface
  creep the audit showed the flow does not need).
- **Manual-mode marker: `mode: human`, named now, enforced in
  router prose.** Optional task frontmatter field; absent means today's
  prose-driven routing unchanged; present means implement-task's router
  hard-refuses autonomous subagent dispatch and hands off to the human
  with the `/skill:` name (the pi-harness-evals requirement). The
  refusing behavior lives in the router resource where the dispatch
  decision lives; documented in task_context's schema text. Rejected:
  `human: true` / `manual: true` (clash with `type: manual` semantics,
  which stays a distinct concept: tasks blocked on human/environment
  work), deferring the name to to-spec (v4 is being designed now), and
  a refusing tool (recreates the deleted task_assert_kind pattern:
  enforcement with zero callers).

### Round 3, 2026-09-15 (all five settled)

- **Task frontmatter v4.** Keep: `kind`, `slug`, `title`, `type`
  (feature, bug, research, prototype, grilling, manual), `map`,
  `status` (todo, ready, blocked, done), `blocked_by`. Add optional:
  `mode: human` (the round 2 marker), `size` (moved from slice docs to
  the ticket; absent defaults to `m`; per-ticket chain budgets keep
  working). Kill: `slices:` (nothing reads it), `started_at` /
  `completed_at` (never written by the flow), slice-level
  `mode: hitl|afk` (superseded by the task-level marker), `bug:` (never
  read by any tool; the bug doc reference moves to the task body, bug
  closure stays a prose step). Migration strips killed fields so disk
  matches the schema text.
- **spec.md frontmatter and semantics.** Fields: `kind: spec`,
  `slug`, `title`, `map`, `status`, same vocabulary as tasks (`ready`,
  `done`, plus `draft` for mid-writing states); written by to-spec's
  updated template. Semantics: a spec-only child counts as unfinished
  until its status is `done`; `task_map_finalizable` refuses while
  any listed child (task or spec) is unfinished; equal blocking
  semantics for tasks and specs. The pi-harness-evals
  false-finalizable class dies by design (spec child becomes visible,
  unfinished, and blocking).
- **task_context: kept, full schema-text rewrite.** v4 blocks for
  task (with `mode`/`size`), spec, and map; Legacy Slice section
  deleted; the "there is no separate ticket-generation phase" sentence
  deleted; killed fields gone. `profile.md` stays an optional append
  when present; finalize-task's CI-gate prose is repointed at real
  sources (detect from repo tooling). Rejected: minimal lie-fix only
  (leaves v2 residue), deletion (removes the package's only
  always-available schema contract).
- **Migration: any-version-to-v4, properly, always (user's
  constraint).** The acceptance criterion, in the user's words:
  "properly migrates everything no matter the current version". Any
  repo state (fresh, unversioned, v1 nested state, v2, v3) must end at
  v4 with correct state.yaml (`schema_version: 4, map, task`), killed
  fields stripped, spec.md frontmatter added, legacy slice dirs
  reported. Implementation shape (one resource vs chained upgrade
  resources) is free for to-spec/implementation. Non-negotiables:
  never corrupt (verify round-trip before writing; leave untouched on
  failure), idempotent, resumable, with a report of what was changed
  and anything needing human eyes. The dead `/skill:task-overview`
  pointer in setup-workflow's report is fixed in the same effort
  (vehicle at implementation's discretion).
- **docs/evals.md: prose-only, no tool support.** It is
  eval-creator's private contract with its target repos, owned by the
  pi-harness-evals map; if it ever needs a tool, that map adds it. The
  spec-visibility half was already settled in round 2.

### Round 4, 2026-09-15 (frontier empty)

- **ui-noter pathway: deleted.** The feature pipeline's reworked
  chains drop the `agent: "ui-noter"` dispatch (no `agents/ui-noter.md`
  ever existed), and finalize-task's Step 2 impeccable-note check is
  dropped with it (its producer can never run; the check silently
  no-ops every time; zero notes were ever produced). The `impeccable`
  skill stays what it is: user-invoked, outside the pipeline. If UI
  polish notes during autonomous chains become a real want, a new
  map owns that addition, same pattern as the guidelines revamp.
  Rejected: wiring `agents/ui-noter.md` now (building a producer for
  a consumer nobody has ever seen fire).

### Round 5, 2026-09-15 (reorg + OKF 0.2)

User observation driving this round: re-organize docs/tasks into
`#/<feature>/{map,spec}.md` and `#/<feature>/tickets/<ticket>/task.md`,
with `#/state.yaml`; the entire docs/tasks tree must be OKF 0.2
compliant. OKF facts grounded from the primary spec
(GoogleCloudPlatform/open-knowledge-format SPEC.md v0.2): conformance
(§11) needs parseable YAML frontmatter with a non-empty `type` on every
non-reserved `.md`; `index.md`/`log.md` are reserved; all trust,
provenance, and lifecycle families are optional; unknown values and keys
must never be rejected.

- **Layout: effort-grouped.** `docs/tasks/<feature>/` holds `map.md`,
  `spec.md`, and `tickets/<ticket>/task.md` (one nesting level; sibling
  files like findings.md and arch-spec.md stay in the ticket dir).
  `docs/tasks/state.yaml` stays. Map-less one-off efforts are
  feature dirs without map.md. Filenames stay `task.md` (no ticket.md
  rename; Q3 user answer: vocabulary sweep "maybe later", not now).
  The `maps/` subtree dies; migration reorganizes archive/ into
  effort-shaped dirs and backfills frontmatter on all archived files.
- **Registration truth moves into each task's own frontmatter (Q4,
  user-decided, reversing the round 5 recommendation).** The map's
  `tasks:` array is deleted. Every task carries its own `map:` and
  `blocked_by:` (map-scoped slugs), and done-ness is read from each
  task's own `status`. Principle, in the user's words: avoid metadata
  that concerns a file but is stored outside that file. Consequences:
  the graph tools (task_frontier, task_dependency_levels,
  task_map_finalizable) rebuild on directory scans of
  `<feature>/tickets/*/task.md` plus per-task frontmatter, not on the
  map array; the map holds no per-child state; listed-in-array vs
  fileless-child drift class dies with the array (the directory is the
  registration now); mapChildInfos' override semantics are deleted
  (nothing to override); task_map_tick's array write disappears
  (finalize marks the task file itself, task_map_tick dies);
  task_map_finalizable becomes a scan of the effort dir's tasks'
  statuses.
- **OKF frontmatter unification (Q6).** OKF-native `type` is the
  artifact kind: `type: task | map | spec | findings | changelog |
  out-of-scope note | deviation report | arch spec` (values are
  unregistered strings; consumers tolerate unknowns). The workflow
  category moves to `subtype: feature | bug | research | prototype |
  grilling | manual`. `kind:` dies corpus-wide. Router reads `subtype`.
- **Status: OKF status plus a workflow field (Q7, user-decided,
  rejecting the documented-deviation route).** `status` uses OKF's
  vocabulary (draft | stable | deprecated) and a companion field
  carries what OKF status cannot express, so the frontmatter carries
  the same information as before, just OKF-compliant. Exact split
  (blocked/ready semantics, which field carries done-ness) is the
  next round's question.
- **Aux files + root (Q8).** Backfill frontmatter with `type` on
  findings/arch-spec/deviation reports; CHANGELOG.md gets
  `type: changelog`; out-of-scope README.md becomes out-of-scope
  index.md; a root `docs/tasks/index.md` carries `okf_version: "0.2"`
  plus a listing, regenerated by wayfinder on create and by
  finalize-task on archive. Producer skills write conformant files
  going forward (compliance is a forever property). Doctor gains a
  conformance symptom.
- **Bundle hygiene (Q9).** The matt-skills vendored snapshot inside
  docs/tasks is this repo's migration detail (the map governs all
  repos' docs/tasks trees): it moves outside the bundle with a pointer
  left behind; no other-repo equivalents may live inside the bundle.
- **OKF optional families (Q10, user direction).** Prefer OKF
  counterparts over custom fields wherever sensible; which families
  (generated/verified/sources/stale_after/attestation) the workflow
  adopts is proposed in round 6 from the landed schema.
- **Migration: one v4 hop (Q11).** A single migration takes any repo
  from any current state (fresh, unversioned, v1, v2, v3, and any
  docs/tasks layout) to the new tree: effort-grouped layout, OKF
  frontmatter, state.yaml `{schema_version: 4, map, task}`, spec
  frontmatter, slice reporting, dead pointer fix. Never corrupts,
  idempotent, resumable, reports everything.

### Round 6, 2026-09-15 (status split, task/ticket split)

- **Status split (Q1, with user's consistency-rules addition).**
  `status` is OKF's `draft | stable | deprecated`; `workflow_state`
  carries what OKF status cannot: `todo | ready | in-progress |
  blocked | done`. Done-ness gates on `workflow_state: done`. draft is
  only for mid-authoring; stable is the steady state; deprecated is
  real deprecation. Consistency rules (user addition, enforced by
  migration, doctor, and graph tools): draft+todo only; stable+any
  workflow_state; deprecated+done only. No draft+done. task_set stays
  schema-dumb; validation is doctor + graph tools, not every write
  path.
- **Task/ticket split (Q2, user's design).** Wayfinder decision items
  are tasks; to-tickets products are tickets. A feature dir holds
  `tasks/<task>/task.md` and `tickets/<ticket>/ticket.md` (filename
  ticket.md now, amending round 5 Q2: the split makes task.md inside
  tickets/ confusing). `map:` frontmatter on tasks and tickets is
  dropped; directory placement is the grouping. `blocked_by` is
  kind-scoped (tasks to tasks, tickets to tickets) and feature-scoped
  (no cross-feature task/ticket edges). Feature-to-feature deps live
  on the map as `blocked_by: [<feature-slug>, ...]` (a coarse second
  DAG; no task-to-feature or ticket-to-feature edges).
- **Map frontmatter: derived only (Q3, lgtm).** `type: map, title,
  status, blocked_by`. No workflow_state on the map; effort
  done-ness is derived by scanning the feature's tasks and tickets;
  archived-ness is the location fact after finalize-task's git mv.
  task_map_tick confirmed dead (nothing left to write; finalize marks
  the task/ticket files, task_map_finalizable gates the archive mv).
- **slug field dropped.** The slug is the directory name (OKF Concept
  ID style); one less field to drift.

### Round 7, 2026-09-15 (consolidated layout + renames)

- **Final layout.** `docs/tasks/<feature>/{map.md, spec.md,
  arch-spec.md, tasks/<task>/task.md, tickets/<ticket>/ticket.md}`;
  `docs/tasks/{index.md, state.yaml}`;
  `archive/<feature>/...` effort-grouped and backfilled. spec.md
  keeps status only (draft/stable, no workflow_state). A feature with
  a spec.md and zero tickets is not finalizable (the
  pi-harness-evals class, visible by scan). arch-spec.md at feature
  root, shared by the feature's ticket chains.
- **Map-less efforts eliminated (user ruling).** Every effort goes
  through wayfinder (map) and to-spec/to-tickets; deciding to have
  one ticket is not an out-of-band decision. One-off work becomes a
  feature dir whose tickets/ holds exactly one ticket (and tasks/
  may be empty). No special case in the scan paths.
- **Tool prefix rename: `task_*` to `tw_*` (user ruling).** The
  registered tools rename to the task-workflow prefix: tw_show,
  tw_get, tw_set, tw_list, tw_frontier, tw_dependency_levels,
  tw_map_finalizable, tw_state, tw_state_set, tw_context. All skill
  prose updated. (The vocabulary sweep beyond the prefix stays
  "maybe later".)

### Completion gate, 2026-09-15

User confirmed the shared understanding (lgtm on the full decision
set, rounds 1-7). Frontier empty; all three map children done.
Handoff: `/skill:to-spec task-tools-overhaul`.
