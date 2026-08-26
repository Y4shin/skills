# Architecture specification — codebase-design skill

## Slice: codebase-design-skill

### Exports

- `skills/codebase-design/SKILL.md`, a model-invoked Pi skill.
- A reusable procedure for mapping existing architecture before proposing changes.
- Structure and cross-reference assertions in `tests/skills.test.ts`.

### Existing abstractions to use

- Existing skill frontmatter and package `pi.skills` registration.
- CodeGraph tools for structure, symbol, caller, callee, and impact exploration.
- Existing task/workflow documentation conventions.

### Do not reimplement

- Do not create a new code-navigation tool.
- Do not assume Claude Code, skills.sh, or another agent harness.
- Do not implement the architecture survey or architecture-scout agent.

### Seams

- Skill frontmatter and body guidance.
- Package manifest registration.
- Structure-test skill discovery and cross-reference assertions.

### Interface contract

Future architecture-oriented skills and agents can reference `/codebase-design` as the shared vocabulary for boundaries, dependencies, reuse, deletion-test reasoning, and safe extension points.
