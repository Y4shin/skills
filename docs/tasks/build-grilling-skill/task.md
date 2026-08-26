---
kind: task
type: feature
slug: build-grilling-skill
title: Build the reusable grilling reference skill
map: compare-to-mp-skills
status: ready
blocked_by: []
slices:
  - grilling-skill
---

## User-visible outcome

Provide a model-invoked `/grilling` reference skill that teaches agents how to run focused, one-question-at-a-time decision conversations, preserve settled decisions, expose trade-offs, and stop only when the decision and consequences are recorded.

## Scope

- Add the skill under `skills/grilling/` with reusable grilling guidance.
- Define question discipline, recommendations, decision recording, ambiguity handling, and handoff to Wayfinder.
- Register the skill in `package.json` and structure-test coverage.
- Make it usable by Wayfinder and future planning resources without duplicating the protocol.

## Out of scope

- Replacing the existing Wayfinder or implement-task grilling resources.
- Implementing domain-modeling or codebase-design.
- Adding a new task type.

## Acceptance criteria

- A non-empty model-invoked `/grilling` skill exists and is registered.
- The skill documents one-question progression and decision-recording requirements.
- Structure and cross-reference tests cover registration and required references.
- Existing tests remain green.

## Existing abstractions to use

- Existing Wayfinder and implement-task grilling resources.
- Existing skill layout and `tests/skills.test.ts` structure assertions.
- `ask_user_question` semantics.

## Architecture decisions

- This is a reusable reference skill, not a replacement for task-type routing.
- It must be Pi-native and preserve the workflow's human-in-the-loop boundary.
