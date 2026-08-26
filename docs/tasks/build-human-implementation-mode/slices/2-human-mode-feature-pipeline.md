---
kind: slice
slug: human-mode-feature-pipeline
title: Implement human mode for feature slices
task: ../task.md
mode: hitl
status: todo
size: l
blocked_by:
  - human-mode-resource-routing
---

Implement the human-mode feature resource. Collaborate on the initial architecture spec until explicit approval; before each slice handoff provide non-code context and a verification contract; then pause for human implementation. After handoff, run the read-only verifier-first chain, fast-fail on test failure, present findings, require explicit approval, and only then invoke landing. Support explicit human requests for collaborative code assistance and the post-task collaborative refactoring phase.

## Acceptance criteria

- No slice code is written before human handoff.
- Architecture-spec planning is interactive and cannot transition without explicit consent.
- Verification agents are read-only and verifier failure returns immediately to the human.
- Findings are presented before approval-gated landing and next-slice progression.
- Landing is outside the read-only chain and runs only after explicit approval.
- Refactoring is proposed and discussed collaboratively after all slices land.

## Test plan

- Seams: feature human resource protocol, subagent tool allowlists, task state transitions, and approval prompts.
- Scenarios: plan approval, per-slice handoff, human implementation, verifier pass/fail, approval before landing, and task completion approval.
- Failure modes: pre-handoff edits, verification edits, skipped approval, automatic landing, and verifier failure continuing the chain.

## Constraints and dependencies

- Depends on the routing slice.
- Reuse existing feature chain agents where possible, but do not give verification agents edit permissions.
