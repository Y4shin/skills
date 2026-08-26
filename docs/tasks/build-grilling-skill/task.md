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

- Add the skill under `skills/grilling/` using Matt Pocock's canonical grilling skill as the primary template:
  `https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/productivity/grilling/SKILL.md`
- Preserve the template's relentless shared-understanding interview, design-tree model, round-based frontier, prerequisite ordering, recommended answers, and explicit stop condition.
- Adapt only where needed for Pi and this repository: use Pi's user-question interaction, repository/task tools, and Wayfinder handoff conventions.
- Register the skill in `package.json` and structure-test coverage.
- Make it usable by Wayfinder and future planning resources without duplicating the protocol.

## Out of scope

- Replacing the existing Wayfinder or implement-task grilling resources.
- Implementing domain-modeling or codebase-design.
- Adding a new task type.

## Acceptance criteria

- A non-empty model-invoked `/grilling` skill exists and is registered.
- The skill visibly follows the canonical template's design-tree and round/frontier protocol, asking the whole currently-unblocked frontier in one round rather than enforcing one question per assistant turn.
- The skill includes the template's fact-finding rule, recommended answers, prerequisite ordering, and explicit shared-understanding completion gate.
- Pi-specific adaptation references the appropriate interaction and Wayfinder handoff without changing the template's decision discipline.
- Structure and cross-reference tests cover registration and the canonical source/protocol references.
- Existing tests remain green.

## Existing abstractions to use

- Existing Wayfinder and implement-task grilling resources.
- Existing skill layout and `tests/skills.test.ts` structure assertions.
- `ask_user_question` semantics.

## Architecture decisions

- Matt Pocock's canonical grilling `SKILL.md` is the behavioral template and source of truth for the grilling method.
- The skill is a reusable reference skill, not a replacement for task-type routing.
- It must be Pi-native and preserve the workflow's human-in-the-loop boundary.
- Existing task-specific grilling resources may remain operational adapters; this task creates the canonical reusable method skill.
