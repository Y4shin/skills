---
kind: task
type: feature
slug: build-codebase-design-skill
title: Build the codebase-design reference skill
map: compare-to-mp-skills
status: done
blocked_by: []
slices:
  - codebase-design-skill
---

## User-visible outcome

Provide a model-invoked `/codebase-design` reference skill that gives agents a shared vocabulary and procedure for understanding existing architecture, boundaries, dependencies, and safe extension points before proposing or implementing changes.

## Scope

- Add the skill under `skills/codebase-design/` with clear reference guidance.
- Define exploration, boundary mapping, dependency tracing, deletion-test, and reuse guidance appropriate to this Pi package.
- Register the skill in `package.json` and structure-test coverage.
- Make it usable by architecture-oriented agents such as `architecture-scout`.

## Out of scope

- Implementing the `/improve-codebase-architecture` survey itself.
- Replacing CodeGraph or existing repository-navigation tools.
- Building domain-modeling or grilling skills.

## Acceptance criteria

- A non-empty model-invoked `/codebase-design` skill exists and is registered.
- The skill documents its exploration vocabulary and output expectations.
- Structure and cross-reference tests cover registration and required references.
- Existing tests remain green.

## Existing abstractions to use

- Existing skill layout and `tests/skills.test.ts` structure assertions.
- CodeGraph tools for architecture navigation.
- Existing task and implementation workflow conventions.

## Architecture decisions

- This is a reusable reference skill, not an autonomous implementation pipeline.
- It must be Pi-native and may not assume Claude Code or skills.sh behavior.

## Implementation notes

### Slice — codebase-design-skill (landed)

Added and registered the model-invoked `/codebase-design` reference skill, including architecture exploration, boundary and dependency mapping, reuse, and deletion-test guidance, with structure and cross-reference coverage in `tests/skills.test.ts`. Verification passed: slice tests 145/145 and full suite 308/308; no lint script is configured.
