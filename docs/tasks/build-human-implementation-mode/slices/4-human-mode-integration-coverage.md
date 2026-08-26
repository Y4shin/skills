---
kind: slice
slug: human-mode-integration-coverage
title: Integrate and regression-test human implementation mode
task: ../task.md
mode: hitl
status: todo
blocked_by:
  - human-mode-feature-pipeline
  - human-mode-bug-pipeline
---

Add end-to-end structure and regression coverage for the complete human-mode routing and feature/bug execution flows, including autonomous compatibility and the approval-gated landing/refactoring boundaries.

## Acceptance criteria

- Feature and bug routers, autonomous resources, and human resources are registered and cross-referenced correctly.
- Tests demonstrate human-mode and autonomous-mode routing without brittle assumptions about prose wording.
- The read-only verification chain, fast-fail behavior, approvals, landing, and collaborative refactoring boundaries are covered.
- Existing autonomous tests remain green.

## Test plan

- Seams: skill resource references, manifest/resource discovery, agent frontmatter permissions, and task workflow transitions.
- Scenarios: both task types in both modes, ambiguous intent confirmation, verifier failure, approval then landing, and final task approval.
- Edge cases: absent prose, multiple slices, rejected approval, and human-requested post-handoff code collaboration.

## Constraints and dependencies

- Blocked until both human-mode pipelines exist.
- Do not weaken existing autonomous coverage to make the new tests pass.
