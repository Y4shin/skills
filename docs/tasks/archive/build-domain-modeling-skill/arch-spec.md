# Architecture specification — domain-modeling skill

## Slice: domain-modeling-skill

### Exports

- `skills/domain-modeling/SKILL.md`, a model-invoked Pi reference skill.
- A reusable procedure for identifying domain concepts, relationships, invariants, ownership, terminology, and lifecycle/state transitions.
- Structure and cross-reference assertions in `tests/skills.test.ts`.

### Existing abstractions to use

- Existing skill frontmatter, package `pi.skills` registration, and structure-test conventions.
- Wayfinder and architecture-spec planning vocabulary.
- Existing task decision-recording conventions.

### Do not reimplement

- Do not invent an application-specific domain model.
- Do not replace architecture exploration or grilling.
- Do not assume a particular framework or external agent harness.

### Seams

- Skill frontmatter and domain-modeling guidance.
- Package manifest registration.
- Structure-test discovery and protocol cross-references.

### Interface contract

Feature planning and architecture-oriented agents can reference `/domain-modeling` for a portable method to describe concepts, relationships, invariants, ownership, and lifecycle states before implementation.
