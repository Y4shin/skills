---
kind: slice
slug: codebase-design-skill
title: Add and register the codebase-design skill
task: ../task.md
mode: hitl
status: done
size: m
blocked_by: []
---

Add the model-invoked `/codebase-design` skill, register it in the package manifest, and add structure/cross-reference coverage.

## Acceptance criteria

- Skill frontmatter and guidance are complete and Pi-native.
- Guidance covers architecture exploration, boundaries, dependencies, reuse, and deletion-test reasoning.
- The skill is registered and tests assert its presence and key references.

## Test plan

- Seam: skill file, package manifest, and `tests/skills.test.ts`.
- Run `npx vitest run tests/skills.test.ts` and the full project suite.

## Constraints and dependencies

- Do not implement the architecture survey or scout agent.
