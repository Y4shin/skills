---
type: spec
title: Task-workflow tool-surface overhaul
status: draft
---

# Spec: task-workflow tool-surface overhaul

## Problem Statement

The task-workflow's extension tools still encode v2-era semantics that
predate the v3 two-phase skill model, and the docs/tasks tree they
operate on has grown into a shape that fights both the workflow and
any outside consumer:

- The tool surface is bloated and partially dead: of 20 registered
  tools, roughly a third have zero callers in any skill, the slice
  machinery sees only legacy slice files that no sanctioned producer
  creates anymore, and a `slices:` frontmatter list is written by a
  tool nothing reads.
- Tools lie to their callers: the schema reference denies the
  ticket-generation phase that is the heart of the v3 flow, spec
  artifacts are invisible to every graph tool (producing a real
  false-finalizable on a live map), and a task-state write silently
  deletes the very version key the setup skill keys its migration
  detection on.
- The directory layout mixes artifact kinds (a maps/ subtree, flat
  task sprawl) so an effort's documents are scattered, registration
  truth is duplicated in a map array that can drift from disk, and
  files outside the artifact conventions (findings, specs, changelogs)
  carry no self-describing metadata at all.
- The user wants the whole docs/tasks tree to be a portable,
  self-describing knowledge bundle (OKF 0.2): every file openly
  typed, lifecycle expressible, readable by any OKF consumer with no
  bespoke tooling, and the workflow's custom concepts mapped onto the
  format's counterparts instead of sitting beside them.

## Solution

Rebuild the tool surface and the tree it serves, in one coherent
version 4:

1. **Effort-grouped layout.** One directory per effort holding its
   map, spec, architecture spec, wayfinder tasks, and implementation
   tickets together. Registration truth moves out of the map's
   frontmatter array into each artifact's own frontmatter (the
   directory is the grouping, the file is the truth).
2. **A task/ticket vocabulary split.** Wayfinder decision items are
   tasks; to-tickets products are tickets; each kind lives in its own
   subdirectory with its own filename, its own dependency scope, and
   its own subtypes.
3. **OKF 0.2 compliance for the entire tree.** Every markdown file
   carries YAML frontmatter with an OKF `type`; lifecycle uses OKF
   `status` with a companion workflow field for what OKF status
   cannot express; a root index declares the bundle version; the
   archive is backfilled to the same standard; producer skills write
   conformant files from now on and a doctor symptom keeps them
   honest.
4. **A pruned, renamed, honest tool surface.** Dead tools deleted,
   drifted tools reworked to the new semantics, all tools renamed to
   a task-workflow prefix, and the schema reference rewritten to
   describe the flow as it actually exists.
5. **One safe migration.** Any repo, from any current state (fresh,
   unversioned, v1 nested state, v2, v3, any docs/tasks layout),
   arrives at the new tree through a single idempotent, resumable,
   never-corrupting migration that reports everything it does.

## User Stories

1. As a workflow user, I want one directory per effort, so that I can
   see everything about an effort (map, spec, tasks, tickets) in one
   place.
2. As a workflow user, I want wayfinder decision items called tasks
   and to-tickets products called tickets, so that the vocabulary
   matches what each phase actually produces.
3. As a workflow user, I want tasks and tickets to live in separate
   subdirectories with distinct filenames, so that I never confuse a
   decision item with an implementation unit.
4. As a workflow user, I want each task and ticket to carry its own
   blocked_by list, so that registration truth is never stored
   outside the file it concerns.
5. As a workflow user, I want the map's per-child array gone, so
   that listed-but-missing and missing-but-listed drift becomes
   impossible by construction.
6. As a workflow user, I want dependencies scoped to one effort, so
   that the graph of an effort stays readable and self-contained.
7. As a workflow user, I want feature-to-feature dependencies on the
   map, so that I can sequence whole efforts against each other.
8. As a workflow user, I want one-off efforts to still run the full
   wayfinder + to-spec/to-tickets pipeline with exactly one ticket,
   so that skipping the pipeline is never an out-of-band decision.
9. As a workflow user, I want a feature that has a spec but zero
   tickets to be non-finalizable, so that "spec written, nothing
   delivered" is caught by the tools instead of by memory.
10. As an OKF consumer (human or agent) unfamiliar with this
    workflow, I want every file in docs/tasks to declare its type in
    frontmatter, so that I can route, filter, and present the corpus
    without bespoke knowledge.
11. As an OKF consumer, I want lifecycle expressed with OKF status
    values (draft, stable, deprecated), so that my generic tooling
    understands freshness and deprecation natively.
12. As a workflow user, I want a workflow_state field alongside OKF
    status, so that todo/ready/in-progress/blocked/done semantics the
    graph needs survive the OKF unification.
13. As a workflow user, I want status and workflow_state combinations
    constrained (draft only with todo, deprecated only with done), so
    that contradictory states cannot be written or trusted.
14. As a workflow user, I want graph tools to treat invalid
    combinations as reportable anomalies rather than silent data, so
    that corruption surfaces instead of propagating.
15. As a workflow user, I want the state file to survive every
    workflow state write, so that the schema version key the setup
    skill keys on is never silently deleted again.
16. As a workflow user, I want a current-effort pointer in the state
    file, so that "where am I" answers with both the effort and the
    task/ticket.
17. As a workflow user, I want the workflow's current-item writes to
    preserve unknown keys, so that future or external state fields
    are never data loss.
18. As a workflow user, I want the null value in the state file to be
    a real null, so that downstream consumers never read the string
    "None" as a slug.
19. As a workflow user, I want the schema reference to describe the
    two-phase flow including the ticket-generation phase, so that any
    agent asking "what does a task look like" gets the truth.
20. As a workflow user, I want the schema reference to document
    every current artifact type including spec, so that the contract
    matches the tree.
21. As a workflow user, I want the schema reference to stop
    documenting the deleted slice and killed fields, so that no
    agent writes dead formats on the tool's authority.
22. As a workflow user, I want the effort frontier tool to compute
   the frontier from a scan of the effort's tasks, so that every
   task file on disk is visible, not just array-registered ones.
23. As a workflow user, I want dependency levels computed per kind
   within an effort, so that task chains and ticket chains are
   leveled independently and correctly.
24. As a workflow user, I want effort finalizability derived from
   the actual statuses of the effort's tasks and tickets, so that a
   map can never report ready while real work is unfinished or
   invisible.
25. As a workflow user, I want a task or ticket on disk that is
   orphaned (referenced by nothing, mismatched to its directory) to
   be reported, so that filesystem and frontmatter never drift
   apart silently.
26. As a workflow user, I want the human-mode marker to hard-refuse
   autonomous dispatch, so that a task meant for human
   implementation can never be picked up by an agent chain by
   accident.
27. As a workflow user, I want the human-mode marker to be an
   optional field with today's routing when absent, so that existing
   flows keep working unchanged.
28. As a workflow user, I want the size field on tickets with a
   default, so that per-ticket chain budgets keep working after the
   slice machinery dies.
29. As a workflow user, I want failure splits to become sub-tickets
   registered in the effort, so that the graph absorbs mid-flight
   decomposition instead of a parallel ad-hoc file convention.
30. As a workflow user, I want dead tools (resolve, assert-kind,
   map-tasks, slices enumeration, slice-list writer) deleted, so
   that the surface carries nothing the flow does not use.
31. As a workflow user, I want the guidelines feature (both tools,
   the injection hook, the discovery machinery) deleted, so that the
   package stops shipping a feature the flow has replaced with direct
   standards-file reads.
32. As a workflow user, I want the standards-consumers (code review,
   tdd workers) to read standards files directly, so that they keep
   working after the guidelines deletion.
33. As a workflow user, I want the ui-noter dispatch and its
   never-firing note check removed, so that the pipeline carries no
   dead agent references.
34. As a workflow user, I want every remaining tool renamed to the
   task-workflow prefix, so that the tool family is self-describing
   in any tool listing.
35. As a workflow user, I want to-tickets' advertised contract
   corrected, so that no skill claims tool support for creation that
   is actually file-based.
36. As a workflow user, I want the finalizable check to be
   status-based rather than slice-file-based, so that done-ness is
   judged from real lifecycle state, not from the absence of files.
37. As a repo owner with an old tree, I want a single migration that
   takes my repo from any vintage to the new layout, so that I never
   chain upgrades manually.
38. As a repo owner with an old tree, I want the migration to verify
   every rewrite before writing and leave the tree untouched on any
   failure, so that a crashed migration can never corrupt my history.
39. As a repo owner with an old tree, I want the migration idempotent
   and resumable, so that re-running after an interruption is safe
   and expected.
40. As a repo owner with an old tree, I want the migration to report
   everything it changed plus anything needing human eyes, so that I
   can review the transformation it performed on my repo.
41. As a repo owner, I want the migration to report legacy slice
   directories it finds, so that I know what pre-v4 in-flight work
   lost support.
42. As a repo owner, I want the migration to reorganize the archive
   into the same effort-grouped, typed shape, so that history stays
   readable and conformant, not frozen in a dead format.
43. As a repo owner, I want the migration to backfill frontmatter on
   auxiliary files (findings, specs, architecture specs, deviation
   reports, changelog), so that the whole tree passes conformance,
   not just the artifact files.
44. As a repo owner, I want vendored non-OKF trees inside docs/tasks
   moved out with a pointer left behind, so that the bundle boundary
   stays clean without losing evidence links.
45. As a workflow user, I want a root index that declares the OKF
   version and lists the tree, so that any consumer gets progressive
   disclosure before opening a single file.
46. As a workflow user, I want the root index regenerated on map
   creation and on archiving, so that it stays current without manual
   upkeep.
47. As a workflow user, I want producer skills (wayfinder, to-spec,
   to-tickets, implement-task, finalize-task) to write conformant
   files by construction, so that compliance is a forever property,
   not a one-time sweep.
48. As a workflow user, I want a doctor symptom that checks OKF
   conformance, so that drift in producer output is caught by the
   existing repair flow.
49. As a workflow user, I want the doctor to route conformance
   failures to the migration or the responsible skill, so that a
   symptom has an actionable remedy.
50. As a workflow user, I want the onboarding report's dead skill
   pointer fixed, so that a fresh repo's first command works.
51. As an agent following implement-task, I want the task router to
   read the artifact's subtype and mode fields from frontmatter, so
   that dispatch decisions come from the artifact, not from
   invocation prose alone.
52. As an agent following implement-task, I want per-ticket chains
   that read their ticket file and the feature architecture spec, so
   that the pipeline works on the effort-grouped tree.
53. As an agent following finalize-task, I want finalization to mark
   the artifact's own workflow state and gate archiving on the scan
   tools, so that the closing flow uses the same truth as the graph
   tools.
54. As a workflow user, I want the notification tool untouched, so
   that user-push behavior outside the workflow survives the
   overhaul unchanged.

## Implementation Decisions

### Layout and artifacts

- One directory per effort under docs/tasks, holding the map, the
  optional spec, the optional shared architecture spec, a tasks
  subdirectory of wayfinder decision tasks, and a tickets
  subdirectory of implementation tickets. Tasks are one file per
  directory named for the task; tickets likewise with their own
  filename. Auxiliary files (findings, deviation reports) live as
  siblings inside the owning task or ticket directory.
- The maps subtree and the flat task sprawl are gone. The archive
  mirrors the live layout, effort-grouped. No map-less efforts exist:
  every effort has a map, and a one-off is an effort whose tickets
  directory holds exactly one ticket.
- Artifact frontmatter drops the slug and map fields: the directory
  name is the slug (OKF concept-ID style), placement is the grouping.
  The state file's effort pointer stays (session state, not artifact
  metadata).

### Frontmatter (OKF 0.2 unification)

- Every markdown file in the tree carries YAML frontmatter with a
  non-empty OKF type. Type values name the real artifact kinds:
  task, ticket, map, spec, findings, architecture spec, deviation
  report, changelog, out-of-scope note. The workflow's old kind
  field dies corpus-wide; the workflow-category field renames to a
  subtype field (task subtypes: research, prototype, grilling,
  manual; ticket subtypes: feature, bug).
- Lifecycle uses OKF status (draft, stable, deprecated) plus a
  companion workflow_state (todo, ready, in-progress, blocked,
  done). Done-ness gates on workflow_state. The status key is
  omitted-implies-stable per OKF, though producers write it
  explicitly. Allowed combinations are enforced: draft pairs only
  with todo; deprecated pairs only with done; stable pairs with any
  workflow_state. The changelog, aux files, and spec carry status
  but no workflow_state; a spec uses draft until published and
  stable after.
- Task and ticket frontmatter: type, title, subtype, status,
  workflow_state, blocked_by (kind-scoped, effort-scoped slugs),
  optional mode (human), tickets optionally size (default m).
  Map frontmatter: type, title, status, blocked_by holding
  feature-to-feature edges. Spec frontmatter: type, title, status.
- The human-mode marker (mode: human) on tasks and tickets makes the
  implement-task router hard-refuse autonomous subagent dispatch and
  hand off to the human with the skill invocation; absent means
  today's prose-driven routing.

### Graph semantics

- Dependencies are kind-scoped (tasks to tasks, tickets to tickets)
  and effort-scoped (no cross-effort task or ticket edges). The map
  carries feature-to-feature edges; no task-to-feature or
  ticket-to-feature edges exist. Ordering between an effort's tasks
  and its tickets is a flow property (wayfinder, then to-spec, then
  to-tickets), not a graph edge.
- The frontier, dependency-level, and finalizable tools rebuild on
  directory scans reading each artifact's own frontmatter. The map
  holds no per-child state. Frontiers and levels are computed per
  kind within an effort; an effort's readiness at the feature level
  derives from its blocking features' statuses plus the scan of its
  own tasks and tickets. An effort is finalizable only when every
  task and ticket is done and, if a spec exists, at least one
  ticket exists.
- The graph tools report anomalies instead of silently dropping
  them: orphaned artifacts (on disk, referenced by nothing),
  missing targets of blocked_by references, invalid
  status/workflow_state combinations, and deprecated artifacts
  treated as done (out of the graph). The finalizable tool is
  status-based, not slice-file-based.

### Tool surface

- Surviving tools, renamed to the task-workflow prefix: show, get,
  set, list, frontier, dependency_levels, map_finalizable, state,
  state_set, context. Deleted: resolve, assert_kind, map_tasks,
  map_tick, slices, set_slices, get_guidelines, list_guidelines;
  the guidelines injection hook and discovery machinery; the
  notification tool stays untouched.
- The context tool's schema reference is rewritten in full: current
  artifact types with their fields, the two-phase flow including
  ticket generation, no slice block, no killed fields, the
  conformance rules, mode and size documented; the optional profile
  appendix stays. The finalizable gate in finalize prose reads from
  real sources (repo tooling detection), not from the dormant
  profile claim.
- The state file shape is version 4: schema_version, map, task.
  Setters accept exactly map and task. The serializer round-trips
  losslessly, preserving unknown keys; nulls are real nulls; the
  state tool shows both pointers. The wayfinder sets both on create
  and resume; implement-task sets the current item; finalize clears
  the current item and the effort pointer when the effort
  finalizes.
- The slug-resolution behavior is unchanged (path or slug accepted);
  the kind-confusion cases the audit found (a wanted-kind ignored
  on the slug branch) are fixed in the resolver as part of the
  rework, not by reintroducing an assert tool.

### Skill-prose consequences

- Wayfinder's feature and bug planning resources are deleted;
  feature and bug creation belongs to to-tickets. Wayfinder regenerates
  the root index on map creation.
- To-tickets' advertised contract is corrected: files are written
  by hand, the tools make the resulting graph queryable. It stops
  emitting the killed slice-list field. Its template writes ticket
  files with the new frontmatter.
- Implement-task's router reads subtype (and mode) from frontmatter.
  The feature and bug pipelines rebase to per-ticket chains over
  the effort frontier: architecture spec at the effort root shared
  by chains, per-ticket budgets from the size field (default m),
  failure splits become sub-tickets registered in the effort, the
  dead ui-noter dispatch is removed. The land-worker agent loses its
  slice-archive duty.
- Finalize-task marks artifact state via the set tool, gates
  archiving on the scan tools (no tick), clears the state pointers,
  regenerates the root index on archive, and drops the note check.
  The onboarding report's dead skill pointer is fixed in the same
  effort.
- Code review and the tdd workers read standards files directly
  (repo root instruction files, standards and testing docs) with no
  guidelines tool in the middle.
- The doctor gains a conformance symptom (frontmatter presence,
  non-empty type, combination rules) routing to the migration or
  the responsible producer skill.

### Migration

- One migration, version 4, from any current state: fresh,
  unversioned, v1 nested state, v2, v3, flat or maps-subtree
  layouts, archived trees. It performs the layout reorganization
  (tasks and tickets sorted by their old workflow category),
  frontmatter unification (kind to type, category to subtype, slug
  and map fields dropped, status split applied with normalization
  of invalid combinations), spec and aux backfill, archive
  reorganization and backfill, state-file rebuild (real nulls,
  effort pointer seeded from the current map pointer where
  derivable), legacy slice-directory reporting, vendored-tree
  relocation with pointers, root index creation, and the dead
  pointer fix.
- Non-negotiables: verify the YAML round-trip of every rewrite
  before writing; on any failure leave the tree untouched;
  idempotent (re-running produces no changes); resumable (an
  interrupted run resumes cleanly); a final report of every change
  plus every item needing human eyes (invalid combinations
  normalized, slice directories found, vendored trees moved,
  unresolvable references).

## Testing Decisions

- Good tests exercise external behavior only: a tool invoked the
  way a skill invokes it, against a fixture docs/tasks tree,
  asserting on outputs, side effects on the tree, and error
  reporting. No test reaches into private helpers; the pure edges
  (cycle handling, YAML fidelity) are covered through the same
  public calls plus the existing unit level where the public seam
  cannot reach them.
- Seams (user-approved): (1) the tool-contract seam: every surviving
  tool tested through the registered-tool interface against scratch
  fixture trees, extending the existing plugin test pattern;
  covers directory-scan graph, combination validation and anomaly
  reporting, lossless state round-trip, spec resolution, the
  spec+zero-tickets rule, the feature DAG; (2) the migration seam:
  the transformation tested as a unit against fixture trees for
  each vintage, asserting end state, idempotence, resumability,
  and corruption-safety.
- Modules tested: the tool layer (all survivors), the resolver, the
  state module, the migration unit, the doctor conformance check.
  Skill prose is not behaviorally tested; the structure tests cover
  skill registration facts (tool names in prose, manifest entries)
  where they already do.
- Prior art: the existing plugin tests (tool behavior against
  fixture trees, the gate tests' truth-table style), the state and
  frontmatter round-trip tests, and the manifest/structure tests.

## Out of Scope

- Implementing the overhaul beyond this spec's plan (the ticket
  breakdown and the build are the consuming flow's job).
- The guidelines revamp (a later map owns repo-standards delivery
  design).
- OKF trust, provenance, and attestation families (generated,
  verified, sources, stale_after, attested computations): deferred;
  the landed schema is the basis for a later adoption proposal that
  prefers OKF counterparts over custom fields.
- A ui-note producer feature (the deleted pathway's successor, if
  ever wanted).
- The full vocabulary sweep beyond the tool prefix (skill names,
  prose-wide ticket/effort renaming): maybe later.
- The eval-creator skill build (owned by its own map; this spec
  only accommodates its manual-mode marker requirement).
- Telemetry analysis tooling, other harnesses' packages, the
  repo-gate refactor (in-flight, audited only).
- CI integration and serving/query infrastructure for the OKF
  bundle beyond the workflow's own tools.

## Further Notes

- Decision provenance: every decision above is the user-confirmed
  G1 outcome recorded in the overhaul map (rounds 1-7) and the
  grilling task doc; rejected alternatives and rationale live
  there, not here.
- The live false-finalizable that motivated the spec-visibility
  work: a real map whose largest deliverable existed only as an
  unregistered spec directory; the effort reported ready to
  finalize. The scan-based finalizable with the spec+zero-tickets
  rule kills this class by construction.
- The state-key deletion bug demonstrated itself live twice during
  the grilling sessions (the version key survived only because it
  was hand-restored each time); the lossless round-trip is the
  recorded fix.
- Deferred with an explicit revisit trigger: OKF family adoption
  (user direction: prefer OKF counterparts where a custom field
  has one, revisit on the landed schema).
- The matt-skills vendored snapshot inside this repo's docs/tasks
  is this repo's migration instance of the vendored-tree rule; the
  rule itself governs all repos.
- No em-dashes in any prose this workflow writes (repo rule,
  applies to the implementation too).
