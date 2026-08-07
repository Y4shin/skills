---
kind: task
type: grilling
slug: tdd-skill-comparison
title: Compare mp-skills /tdd with our tdd-worker agent
map: compare-to-mp-skills
status: ready
blocked_by: [adopt-mp-skills-patterns]
---

## Decision to settle

Should we create a standalone /tdd reference skill (like mp-skills') alongside
our existing tdd-worker agent, or is the agent sufficient?

## Context

mp-skills' /tdd is a **reference document** that defines:
- What a good test is (behavior through public interfaces)
- Seams (where tests go)
- Anti-patterns (implementation-coupled, tautological, horizontal slicing)
- Rules of the loop (red before green, one slice at a time, refactoring
  outside the loop)
- References to tests.md and mocking.md for examples and guidelines

Our tdd-worker is a **pipeline agent** that:
- Implements one slice via strict RED→GREEN→REFACTOR
- Commits after each GREEN (checkpoint)
- Writes uncertainty.md and stops when stuck
- Reports divergence from plan
- Has formal tool allowlist and context isolation

These serve different purposes — one is a reference for *what makes good
tests*, the other is an executor of the loop. The question is whether we
benefit from having both: a reference skill that fires when test quality
comes up, plus the agent that runs the loop.

## Recommended starting answer

Keep the tdd-worker agent as-is for execution. Add a lightweight /tdd
reference skill (model-invoked) that defines test quality principles,
seams, and anti-patterns — so the agent autonomously consults it during
both TDD execution and code review.
