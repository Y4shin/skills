---
type: task
subtype: grilling
title: Split implement-task into planning and ticket execution
status: stable
workflow_state: ready
blocked_by: [grill-workflow-vocabulary, grill-disclosure-mechanics, grill-gate-model-and-write-lockdown]
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
