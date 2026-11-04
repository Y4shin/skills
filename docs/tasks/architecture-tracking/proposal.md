# Architecture in Pi Task Workflow

This is a working design for `@y4shin/pi-task-workflow`. The goal is to give the user and the agent a shared, readable picture of how an application is organized across efforts. The user should be able to verify that picture against the code, give the agent direction about where responsibilities belong, and see how an effort changes the system without requesting a fresh architecture survey each time.

The repository-wide model complements the effort's `architecture.md`, which records the design and contracts between tickets for that effort. ADRs preserve individual decisions and their rationale, and `CONTEXT.md` supplies the project glossary. The on-demand architecture survey can investigate a particular area or refactoring candidate.

## Optional onboarding

Repositories can use the task workflow without an architectural unit map. Enable architecture tracking through a separate, user-invoked slash command outside normal setup and model-driven routing. The initial session should be guided. Use extracted code facts to work with the user on responsibilities, boundaries, and source ownership, then establish the first unit files from that discussion.

## Architectural units and ownership

- Give each **architectural unit** a Markdown file under `docs/architecture/`. Its front matter identifies the unit by a stable ID, names its parent where applicable, defines its source selectors, and records declared relationships to other units. Its prose explains the responsibility, intended boundary, and rationale. The front matter schema is open.
- Support a hierarchy of units and sub-units. A unit may own one physical package or group several physical packages, modules, or source paths. Aim for the physical layout to reflect the architectural hierarchy where it makes sense. A responsibility scattered across unrelated areas can be a refactoring signal. A deliberate split between an API and its implementation can be a good reason for multiple physical locations.
- Define the in-scope source inventory explicitly. Every in-scope source element used for ownership must have exactly one most-specific owner. A child's scope must fit within its parent's, and siblings must be disjoint. Once a unit is subdivided, its children must account for its entire scope. Report gaps, overlaps, and selectors that match nothing.
- For example, a Java project might map `com.example.database` and its descendants to a database unit. If children cover `com.example.database.postgres` and `com.example.database.sqlite`, code declared directly in `com.example.database` also needs a child owner. Java package selectors are one example. Other projects can use their own module identifiers or source paths.

## Code architecture introspection

Keep the architecture model language-agnostic. Evaluate CodeGraph as the first provider of extracted facts. The existing `codebase-design` skill already uses its navigation tools. CodeGraph builds on Tree-sitter and adds reference resolution across files. Tree-sitter can also supply a syntax-based inventory where that is sufficient. The choice of provider and its usable data interface are open. [Codebase design skill](https://github.com/Y4shin/skills/blob/main/skills/engineering/codebase-design/SKILL.md#L31) · [CodeGraph internals](https://github.com/colbymchenry/codegraph#how-it-works) · [Tree-sitter code navigation](https://tree-sitter.github.io/tree-sitter/4-code-navigation.html)

The introspection layer should supply a source inventory, declarations and their language visibility where available, resolved references, and locations that support those facts. The architecture layer applies the ownership mapping and aggregates references into edges between units. The top-level view rolls up dependencies from children. A drill-down shows the corresponding internal edges and underlying source evidence.

Track **inventory coverage** separately from **dependency coverage**. It can be possible to verify ownership of every in-scope source file while resolving only some references. Reports should show gaps in analysis explicitly so readers can distinguish an empty result from incomplete evidence.

## Observed and intended boundaries

Keep three things separate in the model and its reports.

- **Language visibility** describes the declarations the language or tooling exposes.
- **Observed use** records all resolved cross-unit references, including uses of implementation details and dependencies that violate a declared rule.
- **Intended API and relationships** describe the entry points and dependency directions that the architecture permits. People and agents can propose changes to these declarations, with the reason recorded alongside them.

For example, a database unit can declare repository interfaces and factories as its intended API. If a caller uses a public concrete implementation directly, the observed view should retain that edge and the relevant check can flag it. If a project decides that business logic may depend on the database unit and the reverse direction is forbidden, record the relationship in front matter, explain it in prose, and link to the executable check that enforces it.

Prefer cross-language tooling for architecture checks. Reuse existing linters or architecture tests where they can enforce a rule across the supported languages. Linking an authored rule to an executable check is sufficient for an initial version. Automatic generation of checks from the model is a possible follow-up.

## Views

- **Repository view.** Generate an architecture index and consistent diagrams from the unit model and observed facts. Show responsibilities and relationships at the top level, with drill-down into sub-units, cross-boundary symbols, and source evidence. Make declared relationships and observed relationships distinguishable. Mermaid is a candidate renderer.
- **Effort view.** Reuse the same unit IDs and graph to show the part of the architecture the effort affects. Highlight which tickets plan to change which units, and summarize the proposed changes. After implementation, the same mapping can show where the diff actually landed and surface unexpected ownership or boundary crossings. This view can be rendered on demand for a human reviewing the effort.

## Workflow integration

Planning through `to-spec` can take place on the repository's shared planning branch, so other efforts can see upcoming work. Use the branch that fits the repository, such as `main` in the workflow repo. Switch to a dedicated effort branch for `to-tickets` and implementation. The unit files at `docs/architecture/` describe the architecture of the code on the branch where they live.

The architecture-specific steps below apply when a repository has enabled architecture tracking. Repositories without a map can still run the regular effort workflow.

| Skill or stage | Architecture reads and edits |
| --- | --- |
| `wayfinder` | Once the effort is roughly understood, survey the architecture early and identify the units likely to be affected. A capability with no obvious home triggers deeper design exploration. For example, scheduled virus scans might need a new scheduling unit, or an external scheduler might call an existing API. Keep the live unit map read-only during planning. Record decisions and open questions in the effort map. |
| `to-spec` | Record the authoritative effort-level scope, including the existing units expected to change and any new units that may be needed. New unit definitions can remain provisional. |
| `to-tickets` | On the effort branch, turn the spec into concrete planned changes and ticket assignments. Name where each ticket's implementation belongs and which other units it expects to touch. Write the plan and inter-ticket contracts to the effort's `architecture.md`. |
| `implement-ticket` (implementation and ticket close-out) | Give the worker and verifier pointers to the affected units and boundary rules. During ticket close-out, update the live unit files on the effort branch in step with what the ticket actually implemented. Later tickets can read that updated map. |
| `finalize-effort` | Reconcile the live map with the landed code and statically extracted dependencies. Reconcile terminology and descriptions across ticket-local edits. Send substantive mismatches through the existing triage. Assess refactoring pressure from the final diff in place of the automatic code coherence refactor. |

Ticket close-out is an inline stage of `implement-ticket`. [Implement Ticket](https://github.com/Y4shin/skills/blob/main/skills/engineering/implement-ticket/SKILL.md#L173)

## Final architecture reconciliation

Run this pass in `finalize-effort` for every effort in a repository with architecture tracking, including bug-only and refactoring efforts. Check the final landed state so the reconciliation includes changes made during ticket close-out.

1. Compare the effort's code diff and its `docs/architecture/` diff. Refresh the static source inventory and dependency graph from the landed code, apply the live ownership mapping, and check unit coverage.
2. Compare the observed inter-unit dependencies and cross-boundary references with the relationships and entry points described by the live unit files. Flag new, removed, or reversed edges when they contradict the description, and flag uses of disallowed entry points or dependency directions. A dependency that is merely permitted can remain unused. Include source evidence for mismatches and call out any gaps in static analysis that limit verification.
3. Reconcile stale or inconsistent descriptions and regenerate affected views. Keep intended boundaries explicit and send substantive mismatches through the existing triage. An unexpected dependency is a finding to resolve or disposition before the map can describe it as permitted.

## Refactoring efforts

When creating an effort labeled as a refactor in a repository with an architecture map, copy `docs/architecture/` into the effort directory. That copy is the editable **target architecture**. The live unit files continue to describe the realized code. Use the same branch schedule and implementation workflow as an ordinary effort.

- Use a refactor-specific `wayfinder` resource to guide the user through defining the target. A dedicated `tw_open` target is the proposed way to disclose tools for copying, editing, and validating the effort-local model. Scope writes through these tools to that copy. Reuse the same architecture tooling against the alternate directory. A planned unit may reference code that will be created by a later ticket.
- Use the target to plan and slice the refactor. Each ticket still lands code and updates the live architecture through the ordinary `implement-ticket` close-out.
- In `finalize-effort`, run the normal code-to-live-map reconciliation first. Then compare three sources for the refactor: the landed code, the reconciled live map, and the effort-local target. Assess whether differences are cosmetic, whether a different implementation still satisfies the design goals, or whether the result misses a substantive goal. Record an evidence-backed disposition and send substantive gaps through the existing triage for follow-up work or an explicit decision.

## Refactoring pressure across efforts

Architectural checks can enforce known boundaries while individually reasonable changes still make future work harder. At the end of each effort, assess the full landed diff against the architecture model. Once the effort is ready to archive, record its refactoring pressure score and a short explanation tied to affected units and evidence from the diff.

- Consider how much functionality was added, where it landed, and how widely the implementation is spread. Feature size provides context. Pressure comes from concrete signs of harder future changes, such as one responsibility becoming scattered, parallel implementations emerging, or a boundary accumulating workarounds. Record why the spread matters so a deliberate change spanning several units is judged in context.
- Carry unresolved pressure across efforts. Link recurring observations to the same concern so rediscovering it does not add the same pressure twice. When a later effort addresses a concern, reassess its contribution using the landed change. This makes the running total reflect outstanding work.
- After recording the effort, compare the total with a threshold. When it crosses the threshold, tell the user which units and concerns contribute most, with links to the supporting evidence. The notification is a prompt to consider a refactoring effort. The user decides whether to start one and what to tackle.

## Open decisions

- Define the Markdown front matter and selector syntax, and specify the source roots and exclusions used for ownership coverage.
- Verify the CodeGraph interface and the quality of its inventory, visibility, and reference data on representative repositories in more than one language.
- Decide how to identify intended entry points and link declared dependency rules to executable checks.
- Decide where tickets record unit assignments and when the workflow refreshes facts and renders the index.
- Define the refactor marker, target directory name, and how the scoped target-editing tools fit into the phase gate.
- Define the refactoring pressure rubric, how to combine effort scores and unresolved concerns, the threshold, and when to notify again if pressure remains high.

## Retire the standalone architecture skills

Retire `codebase-design` and `improve-codebase-architecture` once the architecture workflow takes over their useful responsibilities. Fold relevant guidance into the stages that use it, such as evidence-based code exploration, reasoning about boundaries and reuse, and identifying refactoring candidates. Carry forward the parts that help users and agents make decisions within the new workflow.

Remove the retired skills from the package's skill registration and workflow routing, and update references to point to the stages that now own those responsibilities. This gives the agent one route for architecture work and avoids competing instructions.

