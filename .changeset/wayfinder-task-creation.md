---
"@y4shin/pi-task-workflow": patch
---

Give `wayfinder` its task-creation tool, and let two phases share a tool.

The planning phase's Boundary names task creation, its reconcile promotes each
fog line into a planning task, and its escape hatch adds a new one when
implementation turns up uncertainty. None of that was possible: `tw_add_task`
was disclosed to `intake` alone, and the built-in write is refused under
`docs/tasks/`, so a planning pass that needed a new task had no legal path.

- `wayfinder`'s toolset gains `tw_add_task`.
- `tw_add_task` gains an optional `blocked_by`, validated at creation the way
  ticket creation validates it: kind-scoped to existing planning tasks of the
  same effort, no self-edge, no dangling target. Edges are wired when the task
  is created, so a planning graph never needs a second pass over frontmatter
  that no tool can write.
- The open-set derivation no longer requires every skill to own a private
  tool. A skill is open when its whole toolset is active, which is the literal
  definition and makes a shared tool legal. `assertDerivableOpenSets` refuses a
  registry where one toolset, or the union of two skills that can be open
  together, covers another, because that would make a closed skill look open.
- The `wayfinder` charting steps no longer claim the phase creates the map or
  registers the effort in the root index. `intake` does both, and the intake
  skill now names `docs/tasks/index.md` and its sorted `## Live` list.

`npm test` and all three typechecks pass.
