---
type: task
subtype: grilling
title: Settle the user-facing modes, reusable core, and tool boundary
status: stable
workflow_state: ready
blocked_by:
- diff-update-roundtrip
---

## Decision to settle

How fit, diff, and update are exposed to the operator, how other skills invoke the reusable architecture capability, and which operations require dedicated tools rather than instructions alone.

## Parent decisions it depends on

`non-negotiables` requires one coherent standalone capability, independently reusable core instructions and logic, user-selected source and destination paths, guided fitting, and explicit authority handoff. `architecture-schema` fixes the artifacts the tools must read and write. `diff-update-roundtrip` establishes which transformations and validations are mechanical.

## Choices already known

- One user-invoked skill can expose three modes, or separate user-invoked skills can expose fitting and the diff/update pair. A user-invoked skill may invoke a model-invoked core skill, but never another user-invoked skill.
- A model-invoked core skill could carry the architecture procedure and prose while an extension provides extraction, validation, diff, clean-update, and worktree operations.
- A shared resource without a model-invoked skill is possible, but another skill would need explicit file access rather than an operative invocation, so the reuse requirement must be tested against the repository's dependency conventions.
- The existing `codebase-design` and `improve-codebase-architecture` skills remain unchanged in this effort, so naming and routing must not imply their retirement or create ambiguous orchestration.

## What this session must pin down

- The skill count, names, invocation model, and mode names presented to the operator.
- The independently reusable core's public contract: inputs, outputs, review interactions, evidence and failure reporting, and how another skill invokes it.
- The dedicated tool surface and its precision-write boundaries for architecture files, review artifacts, validation, diff cleanup, and detached worktrees.
- When the operator is asked for source, destination, fitting corrections, broader redesign, and authoritative replacement, without repeating settled questions during mechanical update.
- The package registration, README, documentation, and router changes required for the chosen promoted skills.

## Recommended starting answer

Use one user-invoked architecture skill with fit, diff, and update modes, and one model-invoked core skill that owns the reusable procedure and contracts. Put deterministic extraction, validation, round-trip checks, Git isolation, and architecture writes behind a narrow tool surface. Keep human review and authority decisions in the orchestrating skill rather than hiding them in tools.

## Downstream work this may create

The specification's public interface and packaging sections, and implementation tickets for the skills, tools, documentation, registration, routing, and end-to-end acceptance in TypeScript and Go.
