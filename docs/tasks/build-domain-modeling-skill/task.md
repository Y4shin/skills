---
kind: task
type: feature
slug: build-domain-modeling-skill
title: Build the domain-modeling reference skill
map: compare-to-mp-skills
status: ready
blocked_by: []
slices:
  - domain-modeling-skill
---

## User-visible outcome

Provide a model-invoked `/domain-modeling` reference skill that helps agents identify domain concepts, invariants, state transitions, ownership, and terminology before designing or implementing behavior.

## Scope

- Add the skill under `skills/domain-modeling/` with reusable modeling guidance.
- Define concepts, relationships, invariants, lifecycle/state modeling, and uncertainty handling.
- Register the skill in `package.json` and structure-test coverage.
- Make it usable by architecture and feature-planning workflows.

## Out of scope

- Implementing the `/improve-codebase-architecture` survey.
- Replacing application-specific domain models.
- Building codebase-design or grilling skills.

## Acceptance criteria

- A non-empty model-invoked `/domain-modeling` skill exists and is registered.
- The skill documents a practical domain-modeling output and invariant vocabulary.
- Structure and cross-reference tests cover registration and required references.
- Existing tests remain green.

## Existing abstractions to use

- Existing skill layout and `tests/skills.test.ts` structure assertions.
- Wayfinder and architecture-spec planning conventions.
- Existing task workflow decision-recording conventions.

## Architecture decisions

- This is a reusable reference skill, not an autonomous implementation pipeline.
- It must be Pi-native and avoid assuming a particular application domain.
