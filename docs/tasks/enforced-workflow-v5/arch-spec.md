---
type: arch spec
title: Enforced workflow v5 architecture
status: stable
---

# Architecture: enforced workflow v5

> Effort `enforced-workflow-v5`. Produced at `to-tickets`. This is the
> living architecture document; `spec.md` remains the decision record and
> its architecture content is archival once this document exists (nothing
> is deleted from `spec.md`).
>
> This document is written in the v4 shape (`type: arch spec`,
> `arch-spec.md`) so that the current tools and skills read it during
> implementation. The schema-5 migration ticket renames it to
> `type: architecture`, `architecture.md`; that rename is one of the
> migration's obligations, not an implementation step for the tickets
> below.

## Purpose

The specification settles what v5 is. This document settles how it is
built: which existing abstractions to stand on, which seams the tickets
share, what each ticket owns, and what the tickets promise each other so
they can be implemented in dependency order without re-deriving the
design. It inlines the specification's architecture content in full, then
adds the implementation-facing material.

## Settled architecture decisions (inlined from `spec.md`)

The decisions below were settled during planning. They are grouped by
pillar; each traces to a task body via the map's `## Decisions so far`.

### Front door and effort model

- **`intake` is the single front door**, the phase and the skill, replacing
  `triage`. It always creates an effort with a map and a non-negotiables
  grilling task. It is user-invoked, because starting an effort is a
  deliberate human act and it is where the raw request and the stories enter.
- **Intake's round is its own short round, not a grilling.** It runs bounded
  sanity checks (active and archived efforts for a duplicate or fold-in
  target, related efforts for links, feature versus bug classification) and
  asks only the facts it cannot derive. It records the raw request verbatim,
  a one-line destination, the actor, the classification, three to five
  stories (or, for a bug, steps, expected versus actual, and impact), and
  optional constraints. "Don't know" is a valid constraint answer.
- **Every bug report becomes an effort.** The defect is a `subtype: bug`
  implementation ticket inside it. `docs/bugs/` retires as a live substrate
  and survives only as an archive and for the migration layer; it drops out
  of the write-guard scope.
- **Every effort is the full arc**: map, planning tasks, specification, at
  least one ticket, implementation, finalize. There is no simple map. A small
  request is a regular effort whose map carries exactly one planning task,
  the grilling that determines its non-goals and its non-negotiable facts.
- **The map carries the non-goals and the non-negotiable facts as body
  sections.** `## Non-goals` absorbs `## Out of scope`. `## Non-negotiable
  facts` opens with a single bolded effort-level success test line, then the
  facts. Both are short map-level anchors with pointers into the task files,
  never an inlined specification. Intake seeds the sections as empty
  placeholders so a gate refusal names missing content, not a missing
  section.
- **Every planning task writes its own results back to the map** as the final
  step of its run, before it marks itself done, through the map-section
  writer. Wayfinder never re-synthesizes decisions from task bodies.

### Wayfinder and the spec gate

- **`wayfinder` is the single planning-phase skill.** It creates the map and
  the planning tasks, works the planning frontier (delegating `research` and
  `prototype`, running `grilling` and `manual` itself), writes results back,
  and runs the reconcile pass. There is no `plan-task`; the planning half of
  `implement-task` is folded in.
- **Wayfinder stays user-invoked** (`disable-model-invocation: true`). The
  human types `/skill:wayfinder` for each pass.
- **A pass is bounded to one frontier snapshot and at most one grilling.**
  It works the non-grilling ready tasks, runs exactly one grilling, then
  releases. It never rolls into the next frontier. When the ready frontier is
  empty, the pass runs the reconcile step and releases.
- **Planning work is serialized per kind.** Never two grillings at once.
  Research and prototype may run concurrently when they do not collide.
- **The reconcile pass verifies and flags.** It reads each done planning
  task's recorded results against the map, fixes what is missing through the
  writer, then sets `ready_for_spec: true` on the map through a dedicated
  checking tool. That tool runs every precondition: the planning frontier is
  empty, `## Non-goals` exists and is non-empty, and `## Non-negotiable
  facts` exists, is non-empty, and names the success test. If any check
  fails, the tool refuses and reports exactly what is missing.
- **`ready_for_spec` is the only thing `to-spec` checks.** The check lives in
  the `to-spec` phase's opener, never in the skill's prose. A run that
  finishes every task and skips reconciliation is refused with a pointer back
  to Wayfinder. The producer of the flag owns the check; the consumer owns
  only the flag.
- **`ready_for_spec` auto-clears** when a planning task is added, reopened,
  or moved out of done, or when the map is edited through the section writer
  or a plan write. The flag-setting tool is the only setter, and it sets it
  last. Any post-reconcile plan change forces one more Wayfinder pass.
- **`to-spec` no longer runs a seam or architecture interview.** It
  synthesizes the specification from the settled record.
- **`to-tickets` produces `architecture.md`** alongside the ticket graph. It
  consumes the architecture content already recorded in `spec.md` and
  inlines it in full, then adds per-ticket exports, existing abstractions to
  use, do-not-reimplement, seams, and interface contracts between tickets.
  The architecture is the living document; the specification's architecture
  content becomes archival once `architecture.md` exists, with a note added
  to `spec.md` pointing at the architecture. Nothing is deleted from the
  specification.
- **Bug-only efforts have no architecture document.** `spec.md` is always
  present; `architecture.md` exists exactly when the ticket graph needs
  interface contracts.

### Vocabulary and schema 5

- **`task` and `ticket` are two graph kinds.** `tasks/<slug>/task.md`
  (subtype `research`, `prototype`, `grilling`, or `manual`) and
  `tickets/<slug>/ticket.md` (subtype `feature` or `bug`). `blocked_by` is
  kind-scoped and effort-scoped: a planning task blocks only planning tasks,
  and an implementation ticket blocks only tickets. `spec.md` is the handoff
  between them. The frontier is computed per kind.
- **Canonical long forms are "planning task" and "implementation ticket".**
  The short forms are allowed only where the context already makes the kind
  unambiguous. A discipline never uses the bare `task` for a ticket.
- **Schema 5 is a small additive delta.** Map frontmatter gains
  `ready_for_spec` (boolean, absent reads as false) and optional
  `origin_effort`. There is no `simple` field. `type: arch spec` and
  `arch-spec.md` become `type: architecture` and `architecture.md` at the
  effort root. A new auxiliary `type: review` covers `review.md` at the effort
  root, with no `workflow_state`.
- **Map body renames.** `## Out of scope` becomes `## Non-goals`, and
  `## Non-negotiable facts` is added, as described above.
- **One idempotent hop to schema 5**, reusing `src/migrate-cli.ts` and
  `src/core/migrate.ts`. `detectVintage` gains a version-5 branch and
  `migrate()` gains the v4-to-5 reshape. Any vintage (unversioned, v1 to v4)
  migrates in one idempotent hop over the existing `TreePort` staging and
  undo journal. `state.yaml` carries `schema_version: 5`. v3 and v4
  frontmatter stay readable in `fromFrontmatter` during the transition; new
  producers write v5 only.
- **The renames cover archives.** `arch-spec.md`, `type: arch spec`, and
  `## Out of scope` are rewritten in live and archived trees alike, because
  tools read archives. The reader stays tolerant of the legacy filename and
  type as a safety net. `docs/bugs/` stays in place as a static archive and
  stops being a live substrate.
- **This effort also updates `docs/migration-target.yaml`** for schema 5 and
  adds `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md`.
  Running the migration on a downstream repo stays a human `setup-workflow`
  action after v5 lands.
- **Legacy terms are retired from the live language**: `slice` and
  `slices/`, maps under `docs/tasks/maps/`, `mode: hitl/afk`, and the broad
  legacy `type:` value set. The only place a retired word may appear is the
  compatibility layer: the upgrade resources, the migration prose, the
  migration module (including its legacy tables), and any tool that reads an
  old shape.

### Skill surface and invocation

- **Added**: `intake` (replaces `triage`), `finalize-effort`,
  `implement-ticket`.
- **Retired**: `triage`, `finalize-task`, `implement-task`.
- **Re-scoped**: `wayfinder` (absorbs the planning frontier and bounded
  passes), `to-spec` (loses the seam interview, gates on `ready_for_spec`),
  `to-tickets` (produces `architecture.md` plus the ticket graph),
  `task-workflow-overview` (layered explainer plus `tw_next` fast track),
  and every workflow skill's prose (meaning and craft only, since the tools
  own the rules).
- **Unchanged in scope**: the discipline and vocabulary skills (`grilling`,
  `tdd`, `code-review`, `domain-modeling`, `codebase-design`,
  `diagnosing-bugs`, `research`, `prototype`, `skill-creator`, `skill-review`,
  `eval-review`, `resolving-merge-conflicts`, `wizard`, `setup-workflow`),
  the productivity skills, the 11 agents, and the chain internals.
- **Invocation model.** User-invoked (`disable-model-invocation: true`):
  `intake`, `wayfinder`, `to-spec`, `to-tickets`, `setup-workflow`.
  Model-invoked: `implement-ticket`, `finalize-effort`,
  `task-workflow-overview`, `task-workflow-doctor`.
- **`implement-ticket` owns the implementation phase.** It reads
  `architecture.md` (missing or unstable is an opener refusal, never a draft
  step), owns the ticket frontier, the dependency-level loop, the per-ticket
  chain dispatch, the end-of-effort pass, the failure toolbelt, and the
  inlined per-ticket close-out (CI gate, knowledge harvest, changelog,
  done-marking, close-out, merge to main).
- **`finalize-task` is retired.** Its per-ticket close-out runs inline in
  `implement-ticket`, in the same autonomous run that lands the ticket. The
  one-owner rule holds: that closing phase is still the only thing that sets
  a ticket's `workflow_state: done`.
- **Ticket concurrency.** Tickets within one dependency level may run
  concurrently; tickets across levels serialize on the level boundary.
  Running tickets from different levels at once is out of scope unless the
  human asks for it explicitly.
- **`task-workflow-overview` stays**, model-invoked, as a progressively
  disclosed explainer of the workflow plus a fast track that points at
  `tw_next` for the live answer.
- **`task-workflow-doctor` stays**, model-invoked, narrowed to what the tools
  cannot self-diagnose: a legacy or unversioned tree, missing `CONTEXT.md` or
  `docs/tasks/`, a failed migration, and routing when an opener refuses.
- **Resources consolidate under their owning skill.** Ticket resources and
  the chain scripts move under `implement-ticket/`. Planning resources
  consolidate under `wayfinder/resources/`; the duplicate planning files
  under `implement-task/resources/` are deleted. There is no shared resources
  directory.
- **`skill-creator` gains a disclosed toolset** from its bundled scripts
  (`validate_skill.mjs`, `scaffold_skill.mjs`, `discover_skill.mjs`). It is
  the one tool-owning discipline and the concrete justification for
  nested opens.
- **Every grilling session delegates to the `grilling` skill.** The
  per-subtype resources that restate the method become thin pointers or are
  removed, and the router that denies grilling has a standalone skill
  (`implement-task/SKILL.md`) is corrected. `wayfinder/resources/grilling.md`
  keeps creating the task document and stops describing how questions are
  asked.
- **The effort's final ticket is the documentation re-sync.** It audits
  `CONTEXT.md`, the top-level `README.md`, the bucket `README.md`s,
  `package.json`'s `pi.skills` array, and the `docs/<bucket>/<skill>.md`
  pages against the implemented v5 and fixes what drifted. It is blocked by
  every other ticket. `task-workflow-overview` is re-synced whenever a
  user-reachable skill is added, renamed, or re-scoped.
- **Phase skills are pairwise mutually exclusive**: `intake`,
  `setup-workflow`, `wayfinder`, `to-spec`, `to-tickets`, `implement-ticket`,
  `finalize-effort`. `improve-codebase-architecture` is a pre-intake survey
  with no tools and is unlisted.

### Gate model and write lockdown

- **Gate preconditions live in the extension tools only**, computed from the
  real artifact tree through the existing `src/core/graph.ts` path. They are
  the single source of truth. Host `gate:` commands stay where they already
  are, guarding real execution boundaries in the chain, and are not
  duplicated at skill entry.
- **The opener is the gate.** A phase skill's first instruction is to call
  its opener with the phase target. The opener checks that phase's
  preconditions, refuses and names the legal next calls when they fail, and
  activates the toolset only when they pass. A refused opener leaves the
  toolset closed. `gate`, `precondition`, and `opener` name the same
  mechanism from three sides.
- **Named transition tools encode the state machine.** `tw_set` is removed.
  Named tools such as `tw_mark_done`, `tw_add_ticket`, `tw_split_ticket`,
  `tw_write_spec`, `tw_write_section`, and `tw_finalize_map` carry the
  preconditions and become the only writers of `docs/tasks/**`. The surface
  must cover every workflow write: task and ticket creation, map sections,
  the specification, the architecture, the changelog, out-of-scope notes, and
  the archive move. `tw_state_set` survives, because it is a named tool for
  the one state file.
- **The built-in `write` and `edit` are blocked on `docs/tasks/**`** by a
  `tool_call` handler. `docs/bugs/**` is out of scope because the bug
  substrate retires. The handler is independent of the active set, so it
  blocks in every phase, including while a toolset is open.
- **The `bash` mutation scan is dropped.** It is a bypassable heuristic. Every
  mutating operation that needs `bash` (the archive move, the `git mv`, the
  changelog write) moves into a `tw_*` tool, so no legitimate step needs the
  shell on the tree. Reading the tree with `bash` or `read` stays allowed, and
  the human's editor is unaffected.
- **The residual risk is accepted and documented**: a model that insists can
  still mutate the tree through `bash` (`rm`, `git`, `python -c`, and so on),
  because a command string cannot be gated soundly. The protection is that no
  legitimate path needs it, not that the shell is blocked.
- **Escape hatches stay tool-mediated.** `tw_resolve_uncertainty` (exists),
  a new `tw_split_ticket` (creates the sub-tickets, supersedes the original
  as deprecated plus done), and `tw_record_out_of_scope` (writes the global
  `out-of-scope note` KB at `docs/tasks/out-of-scope/` and updates its
  index). The in-effort version of deferral stays the map's `## Non-goals`;
  in-scope deferred work becomes a ticket or a follow-up effort through
  `finalize-effort`, not a KB note.

### Progressive disclosure

- **Gated workflow tools are `exposure: "direct"` with `defaultActive:
  false`.** This is the bypass-free choice, verified by the prototype. `hidden`
  cannot be activated at all. `deferred` and `codemode` are reachable through
  `tool_search` and codemode scripts without the opener, which the prototype's
  decoy demonstrated.
- **The declared set is two-state.** Idle (no skill open): `tw_open` and
  `tw_next`. Working (a skill is open): the open skills' toolsets plus
  `tw_open`, `tw_next`, and `tw_close`. The opener discloses the closer, so
  `tw_close` is not declared while idle.
- **One dispatcher, `tw_open`, with a discriminated union on `skill`.** A
  Wayfinder open carries only the effort; a planning-task or ticket open
  carries the effort and the target. No phase passes a meaningless target and
  no phase omits one it needs. The union was verified with a throwaway probe
  run in both shapes, with runtime validation as the backstop for a provider
  that flattens the union.
- **`tw_close` names the skill it closes** and removes only the tools no
  other open skill still needs. It refuses if the named skill is not open.
- **Nested opens are supported.** The open set is a set closed by name, not a
  stack. `tw_open` refuses for exactly two reasons: the skill is already open
  (no duplicates), or it conflicts with a currently open skill.
- **Exclusivity is a symmetric data table**: a map from skill to its
  conflicting skills, with the relation symmetric, so the check is
  order-independent and adding a skill is a table entry.
- **`tw_next` stays declared in every state and never errors.** Outside a
  skill it returns short prose describing what to do next. Inside a skill it
  returns prose saying to finish the current work first, and it must not
  suggest closing the skill now. It never returns a structured frontier.
- **Skills do not declare `allowed-tools`.** Activation alone is the
  disclosure mechanism, and the field is inert in this build.
- **Subagents never open.** They run as separate processes and rely on their
  declared `tools:` allowlists. Activation is per-agent and never leaks
  between parent and child. In-process forks inherit the branch's loadout.
- **Persistence comes from the transcript.** `setActiveTools` changes are
  recorded and restored across resume, `/tree`, and fork on the branch. The
  prototype observed the open state surviving `/tree` and resume.
- **The opener absorbs the explicit `telemetry_skill_context` calls** and
  records the skill, effort, and target automatically, so the per-skill
  telemetry prose is removed and the model no longer calls that tool.
  `submit_feedback` stays model-available for anomalies. The telemetry
  backend stays out of scope.
- **One integration test proves the nested-open path**: open a phase, nest
  `skill-creator`, assert the declared set is the union of both toolsets,
  close `skill-creator`, assert the phase is still open with its own tools
  intact. This is an acceptance criterion.
- **The dependency is bumped to `@earendil-works/pi-coding-agent` 1.0.0.**
  The repo currently resolves 0.80.10, which has no `exposure`,
  `defaultActive`, or `tool_search` API. The research and prototype confirmed
  the API at 1.0.0.

### finalize-effort

- **`finalize-effort` absorbs the whole-effort review and owns the archive.**
  It is read-only toward the code it reviews. It runs one holistic pass per
  effort, so there is no second advisory review.
- **It triages every finding.** An in-scope finding becomes an implementation
  ticket in the current effort, which stays unarchived and returns to the
  frontier. An out-of-scope or large finding becomes a proposed follow-up
  effort. A purely informational finding stays in the review artifact.
- **An effort does not archive while a finding is undispositioned.** Every
  finding must be resolved into tickets, turned into a follow-up effort the
  user accepted and that now exists, or explicitly accepted by the user as
  informational. This archive precondition is a gate, so it lives in the
  finalize-effort tooling.
- **A follow-up effort is created only after a human yes.** It is linked by
  an additive `origin_effort` field on its map frontmatter, a field on the
  child, not a graph edge, so it never enters frontier or `blocked_by`
  semantics.
- **The review artifact is moved, not copied, into the follow-up effort's
  directory**, so the findings live where the skills that act on them look.
  The origin's review artifact still records the disposition, including the
  follow-up effort's slug, so the trail reads in both directions.
- **A living-architecture change that contradicts a settled planning
  decision is recorded in full in `architecture.md`**, with a note naming the
  superseded decision. The map's `## Decisions so far` gets a one-line
  pointer, and an ADR is written when the change is ADR-worthy under
  `domain-modeling`'s rules. There is no automatic ADR mechanism.
- **Bug reports enter as efforts, so intake may reject nothing.** The
  out-of-scope KB's producers become Wayfinder and the skills that defer
  work.

### Reports

- **Every workflow skill ends its run with one shared completion report
  shape**, in a fixed order: (1) what is now true, (2) what needs the human,
  (3) what to run next, (4) what is broken or blocked, (5) one pointer to the
  detail. A skill may add at most one skill-specific line inside that order;
  it may not reorder or add sections.
- **The language is simplified technical English**: compact, no yapping, and
  written for someone who did not watch the run.
- **Never inline**: subagent run ids, per-step receipts, output references,
  harness counts, tool-call detail, raw chain JSON, and workflow-internal
  terms the human did not introduce. The chain's `step` receipt and its
  `refs` are the concrete offenders. All of it is reachable only through the
  single pointer.
- **The report offers to expand.** It states the compact cause and offers
  more context on request. The offer is an offer, never a dump.
- **The pointer targets durable artifacts that already exist**: for a landed
  ticket, the ticket doc, the changelog entry, and the commit; for a planning
  task, its task file; for an effort, the map and the review artifact. There
  is no new per-run report artifact.
- **The shape applies to completion, refusal, failure, and escalation alike.**
  In a failure, part 1 becomes "the ticket did not land and the tree is
  unchanged", and the escalation question is part 2.
- **No shared report skill and no shared contract file.** The rules are
  shared; the template is tuned per skill and lives in a per-skill
  `resources/report.md`, for progressive disclosure. The drift risk is
  accepted.
- **Enforcement is prose discipline only.** A final chat message cannot be
  gated the way a tool call can.
- **The chain and end-of-effort return shapes do not change.** The chain
  keeps returning `ok`, `failed`, `error`, `step`, and `refs`, because the
  failure toolbelt needs `step` and `refs` for diagnosis and the retry
  pointer. The report contract is what keeps them out of the human-facing
  message.
- **The vocabulary qualifiers apply to reports.** Compactness limits sentence
  count, not terminology.

## Existing abstractions to use

The tickets build on what is already here. Do not invent parallel versions
of any of these.

- **`src/core/art.ts`** is the artifact model: `Artifact`, `KNOWN_TYPES`,
  `TYPE_LEAVES`/`TYPE_LEAF`, `fromFrontmatter`, `validateArtifact`,
  `findAnomalies`, `effortKeyOf`, `effortDirOf`, `dependencyLevels`. Schema 5
  extends this module; it does not fork it.
- **`src/core/graph.ts`** is the pure graph layer: `effortGraphs`,
  `effortFrontier`, `effortLevels`, `effortFinalizable`, `liveFrontier`,
  `itemFinalizable`. The gate preconditions about frontiers, levels,
  finalizability, and blockers are computed here.
- **`src/core/frontmatter.ts`** is `parse`/`dump` plus `Document`; every
  frontmatter write goes through it so a rewrite stays YAML-verified.
- **`src/core/state.ts`** models `docs/tasks/state.yaml` (the two pointers,
  unmodeled keys preserved). `tw_state_set` is the named writer that
  survives.
- **`src/core/migrate.ts`** is the tested migration unit: `detectVintage`,
  `migrate()`, `TreePort`, the staging area, the undo journal, and the
  legacy tables. Version 5 is a new vintage branch plus a new reshape step.
- **`src/migrate-cli.ts`** is the CLI wrapper `setup-workflow` calls; the
  version-5 work reuses it unchanged in shape.
- **`src/core/fs-port.ts`** is the file-system port the migration and its
  tests share; no direct `fs` in `core/`.
- **`src/pi.ts`** is the single extension entry: `createTools()` builds the
  `tw_*` surface, the default export registers tools and hooks. All file I/O
  and all `pi.registerTool` calls live here. The new opener, closer, named
  transition tools, guard, and pack/unpack helpers extend this file (or
  modules it imports under `src/`), never a second extension entry.
- **`tests/gate-factory.test.ts`** drives the real extension factory with a
  stub `ExtensionAPI`; extend it, do not replace it.
- **`tests/skills.test.ts`** is the list-driven skill-surface seam.
- **`tests/skill-rewire.test.ts`** is the grep seam for skill prose drift.
- **`tests/integration/harness.ts`** spins up a real `AgentSession` on the
  `faux` provider; the nested-open integration test extends it.
- **`tests/migrate.test.ts`** carries the migration non-negotiables.
- **The `grilling` skill** is the one canonical grilling method. Every other
  skill delegates to it.
- **`docs/migration-target.yaml`** is the setup-workflow target-state source
  the migration and its upgrade resources are versioned against.

## Do not reimplement

- **Frontier, level, and finalizability computation.** Use
  `effortFrontier`, `effortLevels`, `effortFinalizable`, `itemFinalizable`.
- **Artifact parsing and anomaly detection.** Use `fromFrontmatter`,
  `validateArtifact`, `findAnomalies`.
- **Frontmatter parse and dump.** Use `src/core/frontmatter.ts`.
- **Migration machinery.** Reuse `detectVintage`, `migrate()`, `TreePort`,
  the staging area, the undo journal, and the YAML-verify-before-lands rule.
  Version 5 is a branch, not a second migration engine.
- **State file modeling.** Use `toObject`/`fromObject` and the pointer
  validation.
- **The chain internals** (`ticket-chain.js`, `end-of-effort.js`, the verdict
  and host-gate mechanics) and **the 11 agent definitions**. Out of scope.
- **Telemetry storage, schema, and dashboards.** Only the `tw_open`
  absorption of `telemetry_skill_context` is in scope.
- **A second report artifact, a shared report skill, or a runtime report
  gate.** Reports are prose discipline with per-skill templates.
- **A cross-effort graph edge for follow-ups.** `origin_effort` is a field
  on the child map, not an edge.
- **A shell mutation gate.** The `bash` scan is dropped; no replacement.

## Seams

- **Artifact tree seam.** Every tool reads the tree through `scanArtifacts`
  plus `scanMemo` (one scan per invocation, no invalidation machinery) and
  the pure `art.ts`/`graph.ts` layers. Gate preconditions read this seam.
- **Frontmatter write seam.** Every mutating `tw_*` tool writes through
  `parse`/`dump`; the only writer of `docs/tasks/**`.
- **Opener seam.** `tw_open(skill, effort, target?)` is the single entry that
  both checks the phase precondition and activates the phase toolset. The
  gate and the disclosure cannot disagree because they are the same call.
- **Active-tool seam.** The declared set is driven by `setActiveTools`; the
  transcript is the persistence source. The write guard is a separate
  `tool_call` handler, independent of the active set.
- **Skill-surface seam.** `package.json` `pi.skills` plus `tests/skills.test.ts`
  are list-driven; adding or renaming a skill is caught by editing the list.
- **Prose seam.** `tests/skill-rewire.test.ts` and the docs pages assert
  skill prose; they are updated with each skill rewrite.
- **Migration seam.** `tests/migrate.test.ts` drives `migrate()` over
  fixture trees; the version-5 cases extend it.
- **Integration seam.** `tests/integration/harness.ts` on the `faux`
  provider drives phase flows end to end.

## Module and file map

- `src/core/art.ts`: schema-5 types, legacy tolerance, map-section names.
- `src/core/graph.ts`: `ready_for_spec` awareness (frontier, finalizability).
- `src/core/migrate.ts`, `src/migrate-cli.ts`: v5 branch and reshape.
- `src/pi.ts`: named transition tools; opener/closer/next; toolset registry;
  guard; telemetry absorption; pack/unpack for archive and changelog.
- `docs/migration-target.yaml`, `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md`:
  schema-5 target and upgrade guide.
- `skills/engineering/intake/`: new front door.
- `skills/engineering/implement-ticket/`: ticket phase and resources.
- `skills/engineering/finalize-effort/`: effort close and archive.
- `skills/engineering/wayfinder/`: absorbed planning frontier, passes,
  reconcile, consolidated resources.
- `skills/engineering/to-spec/`, `to-tickets/`: re-scoped.
- `skills/engineering/task-workflow-overview/`, `task-workflow-doctor/`:
  re-scoped.
- `skills/engineering/skill-creator/`: disclosed nested toolset.
- `skills/engineering/setup-workflow/`: version table plus `upgrade-4-to-5`.
- `skills/deprecated/`: retired `triage`, `finalize-task`, `implement-task`
  land here (content preserved, replacement named).
- `package.json`, top-level `README.md`, bucket `README.md`s, `CONTEXT.md`,
  `docs/<bucket>/*.md`: re-synced.

## Per-ticket exports and interface contracts

The tickets are ordered by dependency. Each entry names what the ticket
exports to the tickets that depend on it.

1. **`bump-dependencies`** exports a 1.0.0-capable toolchain and a smoke test
   for `exposure`, `defaultActive`, `setActiveTools`, `tool_search`. No
   downstream API of its own.
2. **`schema5-artifact-model`** exports: `architecture` and `review` in
   `KNOWN_TYPES`; `TYPE_LEAVES` entries for `architecture.md` and
   `review.md`; `fromFrontmatter` reading `ready_for_spec` and
   `origin_effort`; map-section-name helpers for `## Non-goals` and
   `## Non-negotiable facts`; legacy `arch spec`/`arch-spec.md` tolerance.
   Contract: v4 artifacts still parse; new producers write v5 only.
3. **`planning-transition-tools`** exports `tw_write_section`,
   `tw_finalize_map`, and planning `tw_mark_done`, and removes `tw_set`.
   Contract: `tw_finalize_map` sets `ready_for_spec: true` only when the
   planning frontier is empty and both map sections are present and
   non-empty with a success test; it is the only setter; plan edits clear the
   flag.
4. **`write-lockdown-guard`** exports a `tool_call` guard for `write`/`edit`
   under `docs/tasks/**`. Contract: independent of the active set; relative
   and absolute paths matched; `docs/bugs/**` and everything else allowed.
5. **`migrate-v4-to-v5`** exports the v5 `detectVintage` branch and the
   v4-to-5 reshape. Contract: idempotent, YAML-verified, failure leaves the
   tree untouched, interrupted run resumes, archives covered, `state.yaml`
   stamped `schema_version: 5`.
6. **`migration-target-and-upgrade-resource`** exports the schema-5
   `docs/migration-target.yaml` and `upgrade-4-to-5.md`. Contract:
   `setup-workflow` routes a v4 repo to the new guide.
7. **`implementation-transition-tools`** exports `tw_write_spec`,
   `tw_add_ticket`, `tw_split_ticket`, ticket `tw_mark_done`, the changelog
   writer, `tw_record_out_of_scope`, and the archive move. Contract: every
   remaining workflow write is covered; no legitimate step needs `bash` on
   the tree.
8. **`disclosure-open-close-core`** exports `tw_open`, `tw_close`, `tw_next`,
   the gated registration (`exposure: "direct"`, `defaultActive: false`), the
   discriminated union, the symmetric exclusivity table, the two-state
   declared set, the nested-open integration test, and telemetry absorption.
   Contract: `tw_open` refuses duplicates and conflicts; `tw_close` names its
   skill and removes only unneeded tools; `tw_next` is always declared.
9. **`opener-gate-and-toolsets`** exports the per-phase preconditions and
   per-skill toolsets. Contract: a refused open activates nothing and returns
   `legal_next`; the phase-to-toolset table is the single registry.
10. **`wayfinder-reconcile-and-passes`** exports the absorbed planning phase.
    Contract: one frontier snapshot, at most one grilling, reconcile through
    `tw_finalize_map`, resources under `wayfinder/resources`.
11. **`to-tickets-architecture`** exports the architecture-plus-tickets
    phase. Contract: `arch-spec.md`/`architecture.md` is produced from the
    spec's architecture content plus exports, seams, and contracts.
12. **`grilling-delegation-fix`** exports the single grilling-method home.
    Contract: every pointer resolves to the `grilling` skill; no resource
    restates the method.
13. **`skill-report-resources`** exports a per-skill `resources/report.md`.
    Contract: fixed five-part order; no shared report artifact or runtime
    gate.
14. **`skill-creator-nested-toolset`** exports the disclosed nested toolset.
    Contract: opens inside a phase without closing it.
15. **`intake-skill`** exports the front door. Contract: always creates an
    effort with a map and one non-negotiables grilling task through the named
    tools; retires `triage`.
16. **`to-spec-rescope`** exports the gated spec phase. Contract: checks only
    `ready_for_spec`; no seam or architecture interview.
17. **`implement-ticket-skill`** exports the implementation phase. Contract:
    reads the architecture, owns the ticket frontier and levels, dispatches
    chains, closes each ticket out inline; retires `implement-task` and
    `finalize-task`.
18. **`finalize-effort-skill`** exports the effort close. Contract: holistic
    review, finding triage, follow-up only after a human yes, archive gate.
19. **`overview-doctor-rescope`** exports the explainer and the narrowed
    doctor. Contract: overview points at `tw_next`; doctor owns only what the
    tools cannot self-diagnose.
20. **`docs-resync`** exports the shipped documentation. Contract: shipped
    prose matches shipped v5.

## Testing seams

- **Unit/model:** `tests/art.test.ts`, `tests/graph.test.ts`,
  `tests/frontmatter.test.ts`, `tests/state.test.ts`.
- **Tool contracts:** `tests/gate-factory.test.ts` (real factory, stub API),
  `tests/plugin.test.ts` (registered-tool interface).
- **Disclosure and gate:** the three-way flip test and the opener refusal
  table, plus the nested-open integration test.
- **Migration:** `tests/migrate.test.ts` with the four non-negotiables and
  the new v5 cases.
- **Skill surface:** `tests/skills.test.ts` (list-driven),
  `tests/skill-rewire.test.ts` (prose drift).
- **End to end:** `tests/integration/harness.ts` on the `faux` provider.

A good test asserts external behavior: given a tree state, does the opener
refuse or open, does the guard block or allow, is a gated tool declared or
not, and does a second migration run produce byte-stable output. It does not
assert the internal shape of a helper.

## Open risks recorded here

- **The disclosure work depends on 1.0.0.** If the bump exposes API drift
  beyond `exposure`/`defaultActive`, that drift lands in ticket 1, not in
  the disclosure ticket.
- **The write guard is best-effort against a determined shell.** The residual
  risk is accepted and documented; no ticket attempts a sound shell gate.
- **`ready_for_spec` auto-clear must cover every plan writer.** The
  transition-tool tickets own that list; a missed writer is a stale flag.
- **This effort runs in v4 mode.** The v5 openers and gates do not exist
  during implementation, so the ticket pipeline and the current skills run
  against the v4 tree until the relevant tickets land.