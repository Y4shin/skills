---
kind: slice
slug: domain-modeling-skill
title: Add and register the domain-modeling skill
task: ../task.md
mode: hitl
status: todo
size: m
blocked_by: []
---

Add the model-invoked `/domain-modeling` skill, register it in the package manifest, and add structure/cross-reference coverage.

## Acceptance criteria

- Skill frontmatter and guidance are complete and Pi-native.
- Guidance covers concepts, relationships, invariants, lifecycle/state, and terminology.
- The skill is registered and tests assert its presence and key references.

## Test plan

- Seam: skill file, package manifest, and `tests/skills.test.ts`.
- Run `npx vitest run tests/skills.test.ts` and the full project suite.

## Constraints and dependencies

- Do not implement architecture survey behavior in this slice.
