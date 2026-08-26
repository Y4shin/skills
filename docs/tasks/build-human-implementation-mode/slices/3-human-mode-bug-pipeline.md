---
kind: slice
slug: human-mode-bug-pipeline
title: Implement human mode for bug tasks
task: ../task.md
mode: hitl
status: todo
size: m
blocked_by:
  - human-mode-resource-routing
---

Implement the human-mode bug resource. Use collaborative reproduction/diagnosis planning as the planning gate, obtain explicit consent before human implementation, then run the read-only verifier-first fast-fail chain, present findings, require approval, and invoke landing only after approval.

## Acceptance criteria

- Reproduction/diagnosis planning covers cause, regression seam, acceptance criteria, and scope.
- No bug-fix code is written before explicit implementation handoff.
- Verification agents are read-only and test failures return promptly to the human.
- Findings and evidence are presented before landing and next-slice progression.
- Landing is separate and approval-gated.

## Test plan

- Seams: bug human resource, diagnosis gate, verifier chain, permissions, and approval transitions.
- Scenarios: approved diagnosis, rejected/incomplete diagnosis, verifier pass/fail, approval-gated landing, and task completion.
- Failure modes: skipped diagnosis consent, agent edits, automatic landing, and failure continuing the chain.

## Constraints and dependencies

- Depends on the routing slice.
- Preserve the existing lean autonomous bug path.
