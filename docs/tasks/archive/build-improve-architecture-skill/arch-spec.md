# Architecture specification — improve-codebase-architecture

## Shared contract

The feature adds a model-invoked `/improve-codebase-architecture` workflow that surveys the repository, produces an offline-capable HTML report of architecture-deepening candidates, asks the user to pick a candidate, and optionally grills that candidate before handing the decision back to Wayfinder. It does not auto-fix architecture.

## Slice: improve-arch-skill-and-scout

### Exports

- `skills/improve-codebase-architecture/SKILL.md` with survey/report/pick/handoff flow and no-grill mode.
- `agents/architecture-scout.md`, a read-only candidate scout.
- `skills/improve-codebase-architecture/HTML-REPORT.md`, the offline report scaffold.
- Vendored report dependencies under `skills/improve-codebase-architecture/vendor/`.
- Package registration and structure tests.

### Existing abstractions to use

- Pi skill and subagent manifests.
- `architecture-scout` custom-agent conventions and `codebase-design` skill delivery.
- Wayfinder handoff and existing grilling resource.

### Do not reimplement

- Do not auto-fix architecture.
- Do not use Claude Code's `Agent` tool or external skill-loader assumptions.
- Do not use CDN-only report dependencies.

### Seams

- Skill and scout frontmatter.
- Scout read-only tool allowlist and codebase-design skill reference.
- Package registration and vendor asset existence.

### Interface contract

The report slice consumes scout candidate output and the user-selected candidate; the scout returns candidates and does not write the report. Slice 1 owns the static HTML report scaffold because it is an explicit slice deliverable; slice 2 owns report generation wiring, candidate selection, and grilling/no-grill behavior.

## Slice: improve-arch-report-and-grilling

### Exports

- Skill instructions for report generation, explicit candidate selection, optional grilling/no-grill path, and Wayfinder handoff.
- Structure/xref coverage for the complete flow.

### Existing abstractions to use

- Existing grilling and Wayfinder resources.
- Existing user-question and task-map conventions.
- Vendored assets from slice 1.

### Do not reimplement

- Do not hand off to obsolete to-spec/to-tickets phases.
- Do not require a CDN or network at report viewing time.
- Do not create implementation tasks before the candidate decision is settled.

### Seams

- HTML report template and offline asset references.
- Candidate pick and no-grill branches.
- Grilling decision handoff to Wayfinder.
- Cross-reference assertions.

### Interface contract

The completed skill emits either a precise Wayfinder planning decision or a documented no-grill handoff; it never silently chooses a candidate or mutates application code.
