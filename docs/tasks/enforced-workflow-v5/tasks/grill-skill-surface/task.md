---
type: task
subtype: grilling
title: Skill surface after the tool layer owns the rules
status: stable
workflow_state: done
blocked_by:
- grill-front-door-and-triage
- grill-simple-map-and-spec-gate
- grill-disclosure-mechanics
- grill-gate-model-and-write-lockdown
- grill-finalize-effort
- grill-workflow-vocabulary
- grill-implement-task-split
---

# Skill surface after the tool layer owns the rules

## Decision to settle

Which skills are added, merged, re-scoped, or shrunk once the tools own the
state machine, and how much prose remains in each.

## Parent decisions it depends on

Every other grilling task in this effort, because the skill boundaries follow
the decided tool boundaries.

## Choices already known

- Add `intake` (front door) and `finalize-effort` (holistic pass plus
  archive).
- Shrink each workflow skill to "what the allowed action means and how to do
  it well", since the gate is no longer prose.
- Whether `task-workflow-overview` becomes a thin table over the `tw_next`
  oracle, and whether `task-workflow-doctor` is still needed.
- Whether any planning-subtype resources move or merge.

## Recommended starting answer

Add `intake` and `finalize-effort`. Shrink every workflow skill's prose to the
meaning and craft of its allowed action. Keep `task-workflow-overview` as the
model-invoked router over `tw_next`, and keep the vocabulary skills
(`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`)
unchanged. Leave the chain internals and the 11 agents untouched.

## Downstream work it may create

The spec's skill inventory, the eventual tickets, and the documentation
re-sync ticket that closes the effort.

## Decisions already taken (inputs from the user)

### `finalize-task` retires; the ticket close-out is inlined

- `finalize-task` is retired as a skill. Separating implementation from
  finalization buys nothing: the implementation run already owns review work,
  and the separate invocation is a seam where the agent waits for the human to
  invoke a second skill.
- Its per-ticket steps (the CI gate, the knowledge harvest, the changelog, the
  done-marking through the set tool, the per-ticket close-out, the merge to
  main) become the closing phase of the ticket-execution skill, in the same
  autonomous run that landed the ticket.
- `finalize-effort` stays: the effort-level holistic pass plus archive.
- The one-owner rule is preserved. The inlined closing phase is still the only
  thing that sets a ticket's `workflow_state: done`.
- Ripples: the skill inventory loses `finalize-task`; `package.json`'s
  `pi.skills` array, the top-level `README.md`, `skills/engineering/README.md`,
  the docs page under `docs/engineering/`, and `task-workflow-overview`
  follow; every instruction that says to run `/skill:finalize-task` goes away.
- Downstream interaction: the planned split of `implement-task` into planning
  and ticket execution must place this closing phase on the ticket-execution
  side. See `grill-implement-task-split`.

### Grilling execution drift (found in the simple-map and spec-gate grilling)

- The `grilling` skill is the canonical, round-based discipline: ask the whole
  frontier in one round, numbered, each question with a recommended answer,
  then wait for the answers before the next round.
- Four files still teach or imply the superseded one-question-at-a-time method,
  and one of them fails to route to the skill at all:
  - `implement-task/resources/grilling.md` step 2 ("Ask exactly one focused
    question at a time"), which is the resource actually executed for a
    `subtype: grilling` planning task;
  - `wayfinder/resources/grilling.md` ("The execution resource will ask one
    question at a time");
  - `improve-codebase-architecture/SKILL.md` ("Grilling uses its established
    one question at a time ...");
  - `implement-task/SKILL.md`, which says `subtype: grilling` has "no standalone
    skill" and to run the inline resource, even though the `grilling` skill
    exists and is model-invoked.
- This belongs to the skill-surface decision: a resource that duplicates a
  skill which now exists should defer to the skill, not restate a stale method
  that the skill has since replaced.
- This drift made the earlier grilling sessions ask one question at a time even
  though the skill says rounds. The user confirmed rounds are the intended
  method.

### Every grilling session delegates to the `grilling` skill

- Every skill that runs a grilling session stops restating the method and
  instead points at the `grilling` skill and instructs the agent to invoke it.
- The per-subtype resources that restate the method
  (`implement-task/resources/grilling.md`, `wayfinder/resources/grilling.md`)
  become thin pointers or are removed, and the router that claims grilling has
  no standalone skill is corrected (`implement-task/SKILL.md`).
- `wayfinder/resources/grilling.md` keeps its job of creating the task document;
  it stops describing how the questions are asked.
  `improve-codebase-architecture` calls the skill after the candidate is picked.
- The user's ruling: this is a real bug and v5 fixes it. A resource that
  duplicates a skill which already exists is the overload this effort removes.

## Settled decisions

### Q1 - The final inventory (settled)

- Added: `intake` (replaces `triage`), `finalize-effort`, `implement-ticket`.
- Retired: `triage`, `finalize-task`, `implement-task`.
- Re-scoped: `wayfinder` (absorbs the planning frontier and bounded passes,
  delegates grilling), `to-spec` (loses the seam interview, its opener gates on
  `ready_for_spec`), `to-tickets` (produces `architecture.md` plus the ticket
  graph), `task-workflow-overview` (see Q3), and every workflow skill's prose
  (meaning and craft only, since the tools own the rules).
- Unchanged in scope: the discipline and vocabulary skills (`grilling`, `tdd`,
  `code-review`, `domain-modeling`, `codebase-design`, `diagnosing-bugs`,
  `research`, `prototype`, `skill-creator`, `skill-review`, `eval-review`,
  `resolving-merge-conflicts`, `wizard`, `setup-workflow`) and the productivity
  skills. The 11 agents and the chain internals stay untouched.
- Rationale: it is the smallest inventory that keeps one owner per action, and
  every entry is the roll-up of an already settled decision.

### Q2 - Invocation model (settled)

- User-invoked (`disable-model-invocation: true`): `intake`, `wayfinder`,
  `to-spec`, `to-tickets`, `setup-workflow`, as today.
- Model-invoked: `implement-ticket`, `finalize-effort`, `task-workflow-overview`,
  `task-workflow-doctor`.
- `intake` stays user-invoked because starting an effort is a deliberate human
  act and it is where the raw request and the stories are supplied.
- `finalize-effort` becomes model-invoked so the effort can close in the same
  flow that lands the last ticket, with the human engaged only when findings
  need triage. This keeps out the seam that killed `finalize-task`.
- `to-spec` and `to-tickets` stay user-invoked, matching the two-phase handoff
  the human drives.

### Q3 - `task-workflow-overview` and `task-workflow-doctor` both stay (settled)

- `task-workflow-overview` survives, model-invoked. Amendment from the user: it
  still explains the workflow, because it is also the thing an agent reads to
  explain the workflow to the user, but the explanation is progressively
  disclosed rather than inlined in full, and it offers the fast track of
  pointing at `tw_next` for the live answer. So it is a layered explainer plus a
  router, not a thin table alone.
- `task-workflow-doctor` survives, model-invoked, narrowed to what the tools
  cannot self-diagnose: a legacy or unversioned tree, a missing `CONTEXT.md` or
  `docs/tasks/`, a failed migration, and routing when an opener refuses.
- Both lose the prose the tools now enforce.

### Q4 - Resources consolidate under their owning skill (settled)

- Ticket resources (`feature.md`, `bug.md`, the `feature/` and `bug/`
  subdirectories) and the scripts (`ticket-chain.js`, `end-of-effort.js`) move
  under `implement-ticket/`.
- Planning resources consolidate under `wayfinder/resources/`, which already
  holds `research`, `prototype`, `grilling`, and `manual`.
  `wayfinder/resources/research.md` and `prototype.md` become pointers to the
  standalone skills.
- `wayfinder/resources/grilling.md` keeps only task-document creation and
  points at the `grilling` skill for the method.
- The duplicate `implement-task/resources/*` planning files are deleted, not
  kept as a second copy. No shared resources directory.

### Q5 - `skill-creator` gets a disclosed toolset (settled)

- This effort turns `skill-creator`'s bundled scripts (`validate_skill.mjs`,
  `scaffold_skill.mjs`, `discover_skill.mjs`) into a toolset the opener
  discloses for that skill.
- It is the one tool-owning discipline and the concrete justification for the
  nested-open capability, so it may nest inside a phase.

### Q6 - The symmetric exclusivity table (settled)

- Phase skills, pairwise conflicting: `intake`, `setup-workflow`, `wayfinder`,
  `to-spec`, `to-tickets`, `implement-ticket`, `finalize-effort`. `tw_open`
  refuses a second phase skill while one is open.
- Everything else is tool-less procedure and is unlisted, except
  `skill-creator`, which may nest inside a phase.
- `improve-codebase-architecture` is a pre-intake survey, not a phase, and owns
  no tools, so it is unlisted.

## Frontier empty

Q1 to Q6 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q6 summary as the shared understanding, with the
  Q3 amendment that `task-workflow-overview` keeps a progressively disclosed
  explanation of the workflow and offers the `tw_next` fast track. The planning
  task is done on that basis.
