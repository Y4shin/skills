# Engineering

Daily code-work skills. **Promoted**: shipped (in `package.json` `pi.skills`)
and each gets a human-facing docs page at `docs/engineering/<name>.md`.

## User-invoked

Reachable only when you type them (`disable-model-invocation: true`).

- **[wayfinder](./wayfinder/SKILL.md)**: Build and evolve a dependency-aware
  work graph from an uncertain idea.
- **[improve-codebase-architecture](./improve-codebase-architecture/SKILL.md)**:
  Survey a repository for high-leverage architecture deepening opportunities
  and hand a selected candidate to Wayfinder.

## Model-invoked

Model- or user-reachable.

- **[task-overview](./task-workflow-overview/SKILL.md)**: Entry point. Routes queries
  to `task_*` tools and actions to skills.
- **[setup-workflow](./setup-workflow/SKILL.md)**: Initialize a
  repository for the task-workflow.
- **[implement-task](./implement-task/SKILL.md)**: Implements all remaining
  slices of a task via per-slice chains.
- **[finalize-task](./finalize-task/SKILL.md)**: Run CI gate, harvest
  knowledge, write changelog, archive task, merge to main.
- **[report-bug](./report-bug/SKILL.md)**: Capture, reproduce, and triage a
  bug.
- **[tdd](./tdd/SKILL.md)**: Test-driven development reference.
- **[code-review](./code-review/SKILL.md)**: Two-axis review (Standards +
  Spec) of changes since a fixed point.
- **[task-workflow-doctor](./task-workflow-doctor/SKILL.md)**: Diagnose a
  broken task workflow and route to the right skill.
- **[diagnosing-bugs](./diagnosing-bugs/SKILL.md)**: Diagnose and debug hard
  bugs, crashes, and performance regressions.
- **[codebase-design](./codebase-design/SKILL.md)**: Map an existing
  codebase's architecture, boundaries, dependencies, and extension points.
- **[domain-modeling](./domain-modeling/SKILL.md)**: Model a problem
  domain's concepts, relationships, invariants, and lifecycle states.
- **[grilling](./grilling/SKILL.md)**: Relentlessly stress-test a plan,
  decision, or idea through focused questions.
- **[skill-creator](./skill-creator/SKILL.md)**: Scaffold, build, or fix an
  Agent Skill.

> Note: `report-bug` and the two-phase planning reshape are in flight under
> the `adopt-mp-skills-way` map; this README reflects the current state and is
> re-synced as those slices land.
