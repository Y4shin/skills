# Engineering

Daily code-work skills. **Promoted**: shipped (in `package.json` `pi.skills`)
and each gets a human-facing docs page at `docs/engineering/<name>.md`.

## User-invoked

Reachable only when you type them (`disable-model-invocation: true`).

- **[setup-workflow](./setup-workflow/SKILL.md)**: Initialize or migrate a
  repository: scaffold the v5 tree, run the schema migration, or no-op when
  the repo is already current.
- **[intake](./intake/SKILL.md)**: The single front door. Every request,
  bugs included, becomes an effort with a map and one non-negotiables
  grilling task.
- **[wayfinder](./wayfinder/SKILL.md)**: The planning phase. Each run is one
  bounded pass over the planning frontier, writing results back to the map
  and reconciling when it empties.
- **[to-spec](./to-spec/SKILL.md)**: Synthesize the specification from the
  settled record, gated on the map's ready-for-spec flag.
- **[to-tickets](./to-tickets/SKILL.md)**: Turn the specification into the
  living architecture document and a tracer-bullet ticket graph.
- **[improve-codebase-architecture](./improve-codebase-architecture/SKILL.md)**:
  Survey a repository for high-leverage architecture deepening opportunities
  and hand a selected candidate to Wayfinder.

## Model-invoked

Model- or user-reachable.

- **[task-workflow-overview](./task-workflow-overview/SKILL.md)**: Entry
  point. A layered explainer of the v5 workflow with a fast track to
  `tw_next`.
- **[implement-ticket](./implement-ticket/SKILL.md)**: The implementation
  phase: works the ticket frontier in dependency levels, dispatches the
  per-ticket chain per ticket, and closes each landed ticket out inline
  (CI gate, knowledge harvest, changelog, done-marking, merge).
- **[finalize-effort](./finalize-effort/SKILL.md)**: The effort close: one
  holistic review, finding triage into a ticket or an accepted follow-up,
  and the archive move.
- **[task-workflow-doctor](./task-workflow-doctor/SKILL.md)**: Diagnose what
  the tools cannot self-diagnose: a legacy or unversioned tree, missing
  scaffolding, a failed migration, an opener refusal.
- **[workflow-failure](./workflow-failure/SKILL.md)**: The escalation ladder
  for a stuck run: the refusal's own answer first, then reorientation or
  doctor routing, a `tw_feedback` note, and the escalation report that ends
  the run.
- **[tdd](./tdd/SKILL.md)**: Test-driven development reference.
- **[code-review](./code-review/SKILL.md)**: Two-axis review (Standards +
  Spec) of changes since a fixed point.
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
- **[skill-review](./skill-review/SKILL.md)**: Multi-criterion review of an
  Agent Skill: audience fit, trigger behavior, spec portability, progressive
  disclosure.
- **[eval-review](./eval-review/SKILL.md)**: Multi-criterion review of an
  eval suite (contract validity, outcome grading, isolation, scorer
  integrity), or single-pass triage of a failed run.
- **[prototype](./prototype/SKILL.md)**: Build a throwaway prototype to
  answer one design question.
- **[research](./research/SKILL.md)**: Investigate a question against
  high-trust primary sources and capture the findings as a cited Markdown
  file.
- **[resolving-merge-conflicts](./resolving-merge-conflicts/SKILL.md)**:
  Resolve an in-progress merge or rebase conflict hunk by hunk, by intent.
- **[wizard](./wizard/SKILL.md)**: Generate an interactive bash wizard for
  steps only a human can perform.
