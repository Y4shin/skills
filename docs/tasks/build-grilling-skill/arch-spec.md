# Architecture specification — grilling skill

## Slice: grilling-skill

### Exports

- `skills/grilling/SKILL.md`, a model-invoked Pi reference skill.
- A reusable grilling method based on Matt Pocock's canonical template.
- Structure and cross-reference assertions in `tests/skills.test.ts`.

### Existing abstractions to use

- Existing `ask_user_question` interaction semantics.
- Existing Wayfinder and implement-task grilling resources as Pi workflow adapters.
- Existing skill frontmatter, package manifest, and structure-test conventions.

### Do not reimplement

- Do not replace task-type routing or the existing task graph.
- Do not silently invent answers for the user.
- Do not copy Claude Code or skills.sh invocation assumptions.

### Seams

- Skill frontmatter and canonical grilling guidance.
- Canonical source URL and design-tree/round/frontier vocabulary.
- Package manifest registration and structure tests.

### Interface contract

Wayfinder and future planning resources can reference `/grilling` for the shared method while retaining their own task-specific artifact and handoff mechanics.
