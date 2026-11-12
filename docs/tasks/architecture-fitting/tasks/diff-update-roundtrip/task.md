---
type: task
subtype: prototype
title: Can a reviewed full diff become a clean update without content loss or reinterpretation?
status: stable
workflow_state: ready
blocked_by:
- architecture-schema
---

## Single design question

Can the chosen architecture schema represent a complete reviewed diff whose clean update is a mechanical, verifiable removal of review markup, while preserving unchanged content and agent-authored assignments and using only clean `HEAD` for code analysis?

## Alternatives worth comparing

1. Inline review markers and change notes in the complete architecture files, with enough structure for mechanical removal.
2. Structured sidecar review metadata plus a generated highlighted rendering, with update applied to the underlying complete model.
3. Separate clean and highlighted complete copies produced by one comparison, with update selecting and validating the clean copy rather than transforming the annotated one.

## Smallest artifact

A throwaway fixture and local script that:

- starts with a small nested architecture fitted at a base commit;
- changes TypeScript and Go fixtures by adding a package or module that fits an existing unit, adding a sub-unit case, changing an import edge, and removing owned code;
- produces a complete highlighted diff from the recorded base commit to `HEAD`;
- simulates operator review of both a localized assignment and a broader redesign proposal;
- produces the clean updated architecture using only the reviewed diff;
- verifies that unchanged architecture content and fitted assignments survive exactly, all tool-derived facts that should refresh do refresh, and no diff markup or change-only notes remain.

Run the analysis once with a dirty original working tree and prove that the inspected target is a detached worktree at `HEAD`, the original working tree and index remain unchanged, and uncommitted content does not influence the result. Use temporary repositories or fixtures, never the real repositories' Git state, for mutation tests.

## Who must react

The operator reviews whether the highlighted copy is readable, whether the review record captures decisions without ambiguity, and whether the clean-output equivalence check is convincing.

## Evidence and decision output

- Prototype location and the exercised alternative or alternatives.
- A content-preservation and round-trip check with any loss or false equivalence reported.
- A demonstration that update does not read the old architecture or invoke architectural analysis.
- The chosen representation and rejected alternatives, with consequences for `skill-surface` and implementation slicing.

## Likely dependents

`skill-surface`, then the specification and implementation tickets for diff generation, review, clean update, detached-worktree analysis, and write-safety checks.
