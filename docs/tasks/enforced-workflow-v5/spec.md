---
type: spec
title: Enforced workflow v5
status: stable
---

# Spec: enforced workflow v5

> Map `enforced-workflow-v5`. Synthesizes the map's settled decisions, ten
> planning grillings, the Pi tool-disclosure research
> (`tasks/research-pi-tool-disclosure/findings.md`), and the open/close
> gating prototype (`tasks/prototype-open-close-gating/findings.md`). The
> map's `## Decisions so far` index carries the pointers into every task
> body; this spec is the implementation-facing distillation.

## Problem Statement

The workflow this package ships states its rules in prose. `to-spec` is
supposed to wait until the map's decisions are settled, `finalize-task` is
supposed to run before a ticket is called done, and a phase is supposed to
finish before the next one starts. Nothing enforces any of it. A model that
skips a step, or a human who runs skills out of order, gets no refusal: the
tools stay free to write any field on any artifact, and the only guard is
whether the agent read the skill carefully. So the rules hold until the first
inattentive run, and then the tree is wrong in a way that is hard to see.

Around that enforcement gap, v4 has accumulated overload and drift. One
`implement-task` skill owns both planning-task execution and ticket
implementation, whose artifacts, gates, and resources differ. `finalize-task`
is a separate invocation that exists only because landing a ticket and
closing it out were once different skills, which adds a seam where the agent
waits for the human to type another command. `triage` and bug reports form a
parallel substrate to `docs/tasks/`, so a bug can enter the workflow without
ever becoming an effort. The specification still runs a seam and architecture
interview that `to-tickets` then asks about a second time. Every workflow
tool is declared to the model at all times, so the tool descriptions of a
phase nobody is running consume context. And there is no holistic close: an
effort can finish all its tickets and never get the one whole-effort pass
that would catch what the tickets missed.

The human cost is concrete. Completion reports arrive as a wall of run ids,
step receipts, and chain internals, so the human cannot tell what changed,
what needs a decision, or what to run next. And a repo owner has no way to
know that the workflow their agent is running is the workflow they agreed
to, rather than the path the model happened to improvise.

## Solution

A v5 of the package where every effort travels one visible path and the path
is mechanically enforced.

A single front door, `intake`, always creates an effort and a wayfinder map.
Every phase transition (intake to wayfinder to spec to tickets to
implementation to finalize to archive) is authorized by a tool precondition
instead of prose, so a model that ignores the skill text still cannot perform
the illegal action: the action's tool is either not available, or it refuses
and names the legal next call. Workflow tools are disclosed only while the
skill that needs them is open, so the declared tool set matches the phase in
flight. An effort closes with one holistic `finalize-effort` pass and an
archive. The rules the workflow already states become impossible to violate
by accident.

The schema and the fundamental two-phase flow stay. The changes are additive
and the migration is one idempotent hop, so v3 and v4 trees remain readable
while the transition completes.

## User Stories

1. As a repo owner, I want every new idea, bug, or request to enter through
   one front door that always creates an effort and a map, so that no work
   begins without a visible destination.
2. As a repo owner, I want a workflow rule that is broken to be refused by
   the tool I had to call anyway, so that correctness does not depend on the
   agent having read the prose.
3. As a repo owner, I want an effort to be impossible to archive while a
   finding is undispositioned, so that review knowledge is never stranded in
   an archive nobody reads again.
4. As a repo owner, I want a model that skips the planning reconcile pass to
   be told to run Wayfinder, rather than silently producing a spec, so that
   the gate reports the real mistake at the phase that owns it.
5. As a repo owner, I want `docs/tasks/**` to be writable only through the
   named workflow tools, so that no run can reshape the tree outside the
   state machine.
6. As a repo owner, I want schema 5 to arrive through one idempotent,
   resumable migration that leaves the tree untouched on failure, so that
   upgrading is safe to re-run and safe to interrupt.
7. As a repo owner, I want v3 and v4 trees to stay readable during the
   transition, so that I can migrate my repos on my own schedule.
8. As a repo owner, I want the workflow to keep working in the work-repo
   gate exactly as it does in a personal repo, so that the enforcement
   change does not disturb the existing gate behavior.
9. As a human operator, I want to type `intake` and answer a short, fixed set
   of questions, so that starting an effort is quick and low-ceremony.
10. As a human operator, I want intake to record my raw request verbatim
    plus a one-line destination, the actor, the classification, and three to
    five stories, so that the effort keeps my own words.
11. As a human operator, I want intake to check for duplicate and related
    efforts with a bounded, time-boxed reach, so that it stays fast but still
    catches an existing effort.
12. As a human operator, I want every effort, including a one-line bug, to
    carry a non-negotiables grilling task, so that no effort skips deciding
    its non-goals and its success test.
13. As a human operator, I want every bug report to become an effort with a
    `subtype: bug` implementation ticket, so that bugs use the same graph as
    features instead of a parallel substrate.
14. As a human operator, I want to type `/skill:wayfinder` to work one
    frontier pass, so that I decide when a pass runs and see every cut.
15. As a human operator, I want a Wayfinder pass to work the current
    frontier snapshot and one grilling at most, then release, so that each
    grilling and each frontier is a visible stopping point.
16. As a human operator, I want Wayfinder to never roll into the next
    frontier, so that I can step away between passes without the run
    continuing behind me.
17. As a human operator, I want Wayfinder to run the reconcile pass only
    when the planning frontier is empty, so that the map is verified against
    every settled task before the spec handoff.
18. As a human operator, I want the reconcile pass to set a
    `ready_for_spec` flag through a checking tool, so that it is impossible
    to flip the flag without the checks passing.
19. As a human operator, I want `ready_for_spec` to auto-clear when the plan
    or the map changes, so that a post-reconcile edit forces one more
    Wayfinder pass rather than letting a stale flag through.
20. As a human operator, I want `/skill:to-spec` to be refused when the map
    is not reconciled, so that I am sent back to Wayfinder with a clear
    reason.
21. As a human operator, I want the specification to carry the problem, the
    solution, the stories, the settled decisions, the testing decisions, and
    out of scope, so that it is the handoff from planning to implementation.
22. As a human operator, I want the specification to stop running a seam and
    architecture interview, so that I am not asked the same question twice.
23. As a human operator, I want `/skill:to-tickets` to produce the
    architecture document plus the ticket graph, so that the interface and
    seam contract has one producer and one owner.
24. As a human operator, I want the architecture document to inline the
    specification's architecture content and then become the living
    document, so that an implementation-time change has one place to land.
25. As a human operator, I want the implementation phase to read the
    architecture rather than draft it, so that the double seam interview is
    gone for good.
26. As a human operator, I want `implement-ticket` to work the ticket
    frontier in dependency levels, so that concurrent tickets inside a level
    and serial barriers across levels are supervised by one owner.
27. As a human operator, I want each landed ticket to be closed out in the
    same autonomous run (CI gate, knowledge harvest, changelog, done mark,
    merge to main), so that I never wait to type `/skill:finalize-task`.
28. As a human operator, I want ticket concurrency inside a level and
    serialization across levels by default, so that the shared repo working
    directory is never corrupted by cross-level writes.
29. As a human operator, I want the announcement of one settled grilling to
    end a Wayfinder pass, so that two grillings can never blur together.
30. As a human operator, I want to see only the tools the current phase
    needs, so that the context window is spent on the work rather than on
    descriptions of tools I cannot use yet.
31. As a human operator, I want a phase to be disclosed by an opener that
    gates the phase and activates its toolset in one call, so that the
    refusal and the disclosure cannot disagree.
32. As a human operator, I want the opener to refuse an illegal target and
    name the legal next calls, so that a blocked run tells me exactly what to
    do instead.
33. As a human operator, I want phase skills to be pairwise exclusive and
    duplicates refused, so that two phases can never run at once.
34. As a human operator, I want a discipline (`skill-creator`) to nest inside
    a phase, so that a skill with a real tooling surface can open its tools
    without closing the phase.
35. As a human operator, I want the object of an open or close named
    explicitly, so that closing a nested discipline leaves the phase intact.
36. As a human operator, I want `tw_next` declared in every state and
    answering in short prose, so that the router always has a read path.
37. As a human operator, I want `tw_next` called mid-skill to say "finish
    what you are doing", never "close the skill now", so that a stray call
    cannot make the agent abandon its run.
38. As a human operator, I want `finalize-effort` to run a holistic review,
    triage every finding, and engage me when it finds anything, so that an
    in-scope finding becomes a ticket and a large one a proposed follow-up.
39. As a human operator, I want a follow-up effort created only after I say
    yes, so that the workflow does not spawn efforts on its own.
40. As a human operator, I want the review artifact moved into the follow-up
    effort, so that the findings live where the skills that act on them look.
41. As a human operator, I want the follow-up effort linked by an
    `origin_effort` field, so that the trail is readable without inventing a
    cross-effort graph edge.
42. As a human operator, I want a skill's completion report in a fixed,
    short order (what is now true, what needs me, what to run next, what is
    broken, one pointer), so that I can act without reading anything else.
43. As a human operator, I want the report in simplified technical English
    with no run ids, step receipts, or chain JSON inline, so that it reads
    like a status update, not a machine dump.
44. As a human operator, I want the report to offer more context on request,
    so that the detail exists when I want it and never by default.
45. As a human operator, I want a refusal, failure, or escalation report to
    follow the same shape, so that the worst moments are the clearest.
46. As a human operator, I want the workflow vocabulary settled once
    (effort, map, planning task, implementation ticket, specification,
    architecture) and written into `CONTEXT.md`, so that every skill and
    report uses the same words.
47. As a human operator, I want the qualified nouns used even when I speak
    loosely, so that a planning task is never confused with an implemented
    ticket.
48. As a human operator, I want legacy words (`slice`, `docs/tasks/maps/`,
    `mode: hitl/afk`, the broad `type:` set) retired from the live language
    and kept only in the migration layer, so that the overloading does not
    return.
49. As a human operator, I want `task-workflow-overview` to stay a layered
    explainer with a fast track to `tw_next`, so that I can ask what to do
    next and get either the story or the live answer.
50. As a human operator, I want `task-workflow-doctor` narrowed to legacy
    trees, missing scaffolding, failed migrations, and opener-refusal
    routing, so that it diagnoses what the tools cannot self-diagnose.
51. As a human operator, I want every workflow skill to delegate a grilling
    session to the `grilling` skill, so that the round-based method has one
    home and cannot drift again.
52. As a human operator, I want the effort to end with a documentation
    re-sync ticket that audits `CONTEXT.md`, the READMEs, the package
    manifest, and the docs pages, so that the shipped documentation matches
    the shipped v5.
53. As a skill author, I want the gated workflow tools registered with
    `exposure: "direct"` and `defaultActive: false`, so that no path
    (`tool_search` or codemode) can reach them without the opener.
54. As a skill author, I want the opener's parameter contract to be a
    discriminated union on the skill, so that a wayfinder open carries only
    the effort and a ticket open carries the effort and the target.
55. As a skill author, I want the built-in `write` and `edit` blocked on
    `docs/tasks/**`, so that the named tools are the only writers.
56. As a skill author, I want the `bash` mutation scan dropped and every
    mutating step moved into a tool, so that no heuristic pretends to gate a
    shell command.
57. As a skill author, I want `tw_set` removed and every transition carried
    by a named tool, so that a field write cannot perform an illegal
    transition.
58. As a skill author, I want the escape hatches (`tw_resolve_uncertainty`,
    `tw_split_ticket`, `tw_record_out_of_scope`) to stay tool-mediated, so
    that uncertainty, splitting, and deferral still work under the lockdown.
59. As a skill author, I want the opener to absorb the explicit
    `telemetry_skill_context` calls, so that telemetry is recorded without
    the model remembering to call it.
60. As a skill author, I want `submit_feedback` to stay model-available, so
    that an anomaly can still be reported.
61. As a skill author, I want each skill's report template in its own
    `resources/report.md`, so that report detail is progressively disclosed
    like any other step.
62. As a skill author, I want the dependency bumped to
    `@earendil-works/pi-coding-agent` 1.0.0, so that `exposure`,
    `defaultActive`, `setActiveTools`, and `tool_search` exist.
63. As a skill author, I want `skill-creator`'s bundled scripts turned into a
    disclosed toolset, so that the nested-open capability has a real user and
    the scripts stop being called through the shell.
64. As a migration author, I want `src/migrate-cli.ts` and
    `src/core/migrate.ts` to gain a version-5 branch and a v4-to-5 reshape, so
    that the renames cover live and archived trees alike.
65. As a migration author, I want `docs/migration-target.yaml` updated for
    schema 5 and an `upgrade-4-to-5.md` resource added, so that
    `setup-workflow` can carry a downstream repo forward.

## Implementation Decisions

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

## Testing Decisions

- **A good test here asserts external behavior**, not implementation detail.
  For the tool layer that means: given a tree state, does the opener refuse
  or open, does the guard block or allow, is a gated tool declared or not,
  and does the migration produce byte-stable output on a second run. It does
  not mean asserting the internal shape of a helper.
- **The nested-open integration test is the acceptance criterion** for the
  progressive-disclosure work: open a phase, nest `skill-creator`, assert the
  declared set is the union of both toolsets, close `skill-creator`, assert
  the phase is still open with its own tools intact. This follows the
  prototype's harness pattern (an in-process `AgentSession` with no model
  call, inspecting `getActiveToolNames()`).
- **The disclosure flip gets the prototype's three-way assertion**: before
  open the gated tools are absent and unsearchable, after open they are
  declared and callable, after close they are absent and unsearchable again.
  The prototype's `direct`-versus-`deferred` decoy is the prior art for the
  unsearchability half.
- **The opener-as-gate refusals are tested at the tool level**: missing
  target, blocked target, done target, not-ready target, unknown effort,
  effort with a spec and no tickets, and effort with every ticket done. Each
  refusal must leave the toolset closed and name the legal next calls. The
  prototype's observable refusal table is the model.
- **The write guard is tested independently of the active set**, because the
  prototype showed it is orthogonal to disclosure: `write` and `edit` under
  `docs/tasks/**` blocked, absolute and relative paths both matched, and the
  same calls outside the tree allowed. `docs/bugs/**` is no longer guarded.
- **The migration is tested for the four non-negotiables** already covered by
  the existing migration suite: every rewrite is YAML-verified before it
  lands, a failure leaves the tree untouched, a second run is a no-op, and an
  interrupted run resumes. The v4-to-5 reshape adds cases for the body
  rename, the filename and type rename, and the archive coverage.
- **The gate factory tests extend the existing pattern** in
  `tests/gate-factory.test.ts`: drive the real extension factory with a stub
  `ExtensionAPI` and assert that gated tools, the opener, the closer, and the
  guard are registered and behave, in both the gated and ungated repo states.
- **The structure tests in `tests/skills.test.ts` remain the seam for the
  skill surface.** The skill-list assertions and the manifest assertions
  update as the inventory changes; they are list-driven, so a renamed or
  added skill is caught by the existing test rather than a new one.
- **The skill-rewire tests are the seam for the grilling-drift fix**: the
  resources that restate the one-question-at-a-time method are asserted to
  point at the `grilling` skill instead.
- **The integration harness is the seam for end-to-end phase behavior.** It
  spins up a real `AgentSession` on the `faux` provider with no network, so a
  phase flow (open, act, close) can be driven and asserted on tool calls and
  filesystem state.
- **The reflection test for the CLI is out of scope.** The migration CLI
  keeps its existing direct tests; v5 does not add a CLI surface.

## Out of Scope

- Rewriting the chain internals (`ticket-chain.js`, `end-of-effort.js`, the
  verdict and host-gate mechanics).
- Changing the 11 agent definitions.
- Repo gating.
- The telemetry and feedback backend (storage, schema, dashboards). Absorbing
  the existing `telemetry_skill_context` calls into the opener is in scope.
- Running the schema migration on a downstream repo, which stays a
  human-driven `setup-workflow` action after v5 lands.
- Any change to the shape of the two-phase planning model.
- Running tickets from different dependency levels at once.
- Reaching the `bash` shell with a sound mutation gate. The scan is dropped
  and the residual risk is accepted.
- A shared report skill, a shared report file, or a runtime report gate.

## Further Notes

- **The success test.** A fresh effort taken through `intake`, `wayfinder`,
  `to-spec`, `to-tickets`, `implement-ticket`, and `finalize-effort` reaches
  archive with every phase transition performed by a gated tool, and an
  attempt to skip a phase is refused by that tool with the legal next call,
  not by prose alone.
- **This effort's own spec runs in v4 mode.** The v5 gates and openers do not
  exist until the v5 tickets land, so `to-spec`, `to-tickets`, and the ticket
  pipeline run in v4 mode during this effort. The tool-side refusals are not
  active yet and must not be assumed.
- **The map is reference-oriented.** The full reasoning lives in the ten task
  bodies and the two findings files; this spec distills the implementation
  decisions and does not restate the rejected options.
- **Factual grounding comes from the evidence artifacts**, not from
  re-derivation: the exposure semantics, the transcript-restore path, and the
  `tool_search` bypass come from the research findings; the `direct` plus
  `defaultActive: false` gate, the opener-as-gate refusal shape, and the
  guard's independence from the active set come from the prototype findings.
- **The map retrofit is already applied** (rename to `## Non-goals`, add
  `## Non-negotiable facts`), and `ready_for_spec` was set by hand as a
  documented bridge, because the checking tool does not exist yet. The v5
  migration will rewrite the tree properly.
- **No em-dashes** in repo prose.