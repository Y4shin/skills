---
kind: slice
slug: grilling-skill
title: Add and register the reusable grilling skill
task: ../task.md
mode: hitl
status: todo
size: m
blocked_by: []
---

Add the model-invoked `/grilling` skill, register it in the package manifest, and add structure/cross-reference coverage.

## Acceptance criteria

- Skill frontmatter and guidance are complete and Pi-native.
- Guidance covers focused questions, recommended answers, settled decisions, and downstream consequences.
- The skill is registered and tests assert its presence and key references.

## Test plan

- Seam: skill file, package manifest, and `tests/skills.test.ts`.
- Run `npx vitest run tests/skills.test.ts` and the full project suite.

## Constraints and dependencies

- Do not rewrite existing task-type grilling resources in this slice.
