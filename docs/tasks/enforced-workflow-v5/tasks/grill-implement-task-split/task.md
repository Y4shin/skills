---
type: task
subtype: grilling
title: Split implement-task into planning and ticket execution
status: stable
workflow_state: done
blocked_by:
- grill-workflow-vocabulary
- grill-disclosure-mechanics
- grill-gate-model-and-write-lockdown
---

# Split implement-task into planning and ticket execution

## Decision to settle

Whether to split the overloaded `implement-task` skill into one skill that
works the wayfinder decision-task frontier (research, prototype, grilling,
manual) and another that implements feature and bug tickets, and where exactly
the boundary sits.

## Parent decisions it depends on

- `grill-workflow-vocabulary`, because the split follows from what a task is
  versus what a ticket is.
- `grill-disclosure-mechanics`, because each skill opens its own toolset, so
  the split changes the opener surface.
- `grill-gate-model-and-write-lockdown`, because dispatch and landing gates
  differ between planning tasks and tickets.

## Choices already known

- Split versus keeping one routing skill.
- Names: `implement-task` for planning plus `implement-ticket` for tickets, or
  `plan-task` and `implement-ticket`, or `resolve-task` and `implement-ticket`.
- Where the effort-level machinery lives: the arch-spec, the dependency-level
  loop, and the end-of-effort workflow are all ticket concepts, so which skill
  owns them.
- Whether `implement-ticket` stays effort-scoped (works the frontier) or
  becomes strictly per-ticket, with a separate thin orchestrator for levels.
- How the failure toolbelt attaches (tickets only) versus the planning
  resources (tasks only).
- The invocation model for each: per decision task, per ticket, or per effort.

## Recommended starting answer

Split. `implement-task` (model-invoked) works the effort's decision-task
frontier and routes research, prototype, grilling, and manual, delegating
research and prototype to their standalone skills. `implement-ticket`
(model-invoked) implements feature and bug tickets, owns the arch-spec, the
dependency-level loop, the per-ticket `ticket-chain.js` dispatch, the
end-of-effort workflow, and the failure toolbelt. Effort-level machinery stays
with `implement-ticket`, because levels and the arch-spec are ticket concepts.
Each skill is disclosed through its own opener toolset.

## Decisions already taken (inputs from the user)

- `finalize-task` is retired and its per-ticket close-out is inlined into the
  ticket-execution skill, so the split must place the closing phase (CI gate,
  knowledge harvest, changelog, done-marking through the set tool,
  per-ticket close-out, merge to main) on the ticket-execution side, in the
  same run that lands the ticket. See `grill-skill-surface`.

## Downstream work it may create

The skill surface, the disclosure openers, the gate model, and the prose each
skill keeps once the tools own the rules.

## Settled decisions

### Q1 - The overloaded skill is split (settled)

- Split confirmed. The planning half works the effort's planning-task frontier
  (research, prototype, grilling, manual); the ticket half implements feature
  and bug tickets.
- The user reopened one part of the split: whether the planning half is its own
  skill (`plan-task`) or is absorbed into `wayfinder`, so there is no separate
  planning-worker skill at all. That is the open question below, not a settled
  decision.
- Rationale for the split itself: the two halves have different artifacts
  (`task` versus `ticket`), different resources, different gates, and, under v5,
  different opener toolsets.

### Q2 - Names (settled, conditional on Q5)

- The ticket half is `implement-ticket`.
- If the planning half stays its own skill, it is `plan-task`. If Q6 folds it
  into `wayfinder`, no `plan-task` is created.
- Rejected: keeping `implement-task` re-scoped to planning (in v5 tasks are not
  implemented, so the name misdescribes the skill); `resolve-task` (jargon).
- Accepted cost: the rename ripple through the top-level `README.md`, the
  bucket `README.md`, `package.json`, the docs page, `task-workflow-overview`,
  and `CONTEXT.md`, the same way `triage` became `intake`.

### Q3 - The boundary and ownership (settled)

- The planning half owns the effort's planning-task frontier and the planning
  resources: `grilling` and `manual` run inline, `research` and `prototype` are
  delegated to their standalone skills. It writes its results back to the map
  through the map-section writer. It owns no tickets, no chain dispatch, and no
  failure toolbelt.
- `implement-ticket` owns the ticket frontier (feature and bug), reads
  `architecture.md` (missing or unstable is an opener refusal, never a draft
  step), owns the dependency-level loop, the per-ticket `ticket-chain.js`
  dispatch, the `end-of-effort.js` workflow, the failure toolbelt, and the
  inlined per-ticket close-out (CI gate, knowledge harvest, changelog,
  done-marking, close-out, merge to main).
- Effort-level machinery (levels, end-of-effort) stays with
  `implement-ticket`, because levels and the whole-effort pass are ticket
  concepts.

### Q4 - Scope, invocation, and exclusivity (settled)

- Both halves are invoked per effort to work their frontier, and each also
  accepts a single target as the same path with a narrower edge.
- `implement-ticket` owns the level loop. A separate thin level orchestrator is
  rejected because it adds a seam for no new capability.
- Exclusivity: both are phase-owning skills. Each conflicts with the other and
  with every other phase skill (`intake`, `wayfinder`, `to-spec`,
  `to-tickets`, `finalize-effort`). Discipline skills stay nestable. The full
  symmetric table is finalized in `grill-skill-surface`.

### Q5 - Planning work is serialized per kind: grillings one at a time (settled constraint)

- The planning skill (or `wayfinder`, if Q6 folds it in) MUST NOT run more than
  one grilling at a time. Grilling is the human decision loop, and two at once
  make it harder for both the human and the agent to reason about the task at
  hand.
- Multiple `research` and `prototype` tasks MAY run concurrently, as long as
  they do not get in each other's way.
- This is a hard rule for the skill prose and for `grill-skill-surface`; it is
  also the rule that produced the correction in this task's own round 1, where
  two grilling tasks were put to the user in one round and the user answered
  only the first.

## Frontier for round 2

Q6 (does the planning half fold into `wayfinder`, removing `plan-task`?). The
schema-5 grilling is deliberately parked until this task is settled, because it
is a second grilling and planning grillings run one at a time.

### Q6 - The planning half folds into `wayfinder`; there is no `plan-task` (settled)

- Fold confirmed. `plan-task` is not created. `wayfinder` is the single
  planning-phase skill: it creates the map and the planning tasks, works the
  planning frontier, writes results back to the map, and runs the final
  reconcile pass. The split's only new skill is `implement-ticket`.
- Rationale: `wayfinder` already owns the map, the task graph, the frontier,
  the planning-subtype resources, and the reconcile pass; frontier execution
  was the only piece living elsewhere. `intake` creates the mandatory
  non-negotiables grilling task, and folding means the skill that creates it
  also runs it. It removes a skill, a docs page, an opener, and an exclusivity
  entry, and it matches the skill's own boundary statement that it is the
  planning and discovery phase.
- Accepted cost: `wayfinder` grows. Mitigated because execution routes to the
  per-subtype resources it already has and the standalone `research` and
  `prototype` skills carry the heavy work.

### Q6 amendment - A frontier pass is bounded; `wayfinder` never rolls into the next frontier (settled)

- One `wayfinder` invocation works the current frontier snapshot and then
  relinquishes control. It MUST NOT keep working successive frontiers in the
  same run. The human re-invokes `/skill:wayfinder` to work the next frontier.
- Rationale (the user's): continuous frontier work makes it hard to see a spot
  where the human can take a break and hard to make a cut when they want one.
  Each frontier is an explicit, visible stopping point.
- Consequence: when the ready frontier is empty, a `wayfinder` invocation runs
  the reconcile pass (the empty-frontier pass), then releases; reconcile is not
  silently appended to the last work pass.
- This closes the loop cleanly with the close step: a pass ends with
  `tw_close` for `wayfinder`, and the next frontier is a fresh open.

### Q7 - Concurrency across planning and tickets (settled)

- Planning side: multiple `research` and `prototype` tasks may run concurrently
  when they do not collide; `grilling` tasks are serialized, never two in
  flight at once.
- Ticket side: tickets within one dependency level may run concurrently, which
  is what the level loop exists for; tickets across levels serialize on the
  level boundary.
- Running tickets from different levels at once is a deliberate change that
  breaks the level invariant and is not decided here; it is out of scope unless
  the user asks for it explicitly.

## Frontier for round 3

Q8 (the invocation model for `wayfinder`: user-invoked or model-invoked) and
Q9 (does a pass stop after each grilling, or work every ready task in the
frontier before releasing). Both follow from Q6 and its amendment.

### Q8 - `wayfinder` stays user-invoked (settled)

- `wayfinder` keeps `disable-model-invocation: true`. The human types
  `/skill:wayfinder` to work a frontier pass.
- Rationale: the human decides when a pass runs and sees each cut, which is the
  control Q6 asked for, and it fits the grilling-heavy nature of planning.
- Accepted cost, explicit: when `implement-ticket` hits uncertainty and creates
  a new planning task, it cannot run `wayfinder` itself; it ends its run and
  tells the human to run `/skill:wayfinder`. Making it model-invoked would let a
  model start frontier passes on its own, which is the continuous-progress
  behavior Q6's amendment rules out.

### Q9 - A pass ends after one settled grilling (settled)

- One `wayfinder` pass works the non-grilling ready tasks (fanning out
  `research` and `prototype`) and exactly one `grilling`, then releases. If the
  frontier holds two grilling tasks, that is two passes.
- Rationale: each grilling is its own visible break point, a grilling can never
  blur into the next one, and it is consistent with Q5 (never two grillings at
  once). A frontier of only non-grilling tasks still completes in one pass.
- Rejected: working multiple sequential grillings inside one pass. It literally
  honors "work the frontier" but removes the break point Q6 asked for and
  reopens the reasoning-blur problem Q5 exists to prevent.

## Frontier empty

Q1 to Q9 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q9 summary as the shared understanding. The
  planning task is done on that basis.
