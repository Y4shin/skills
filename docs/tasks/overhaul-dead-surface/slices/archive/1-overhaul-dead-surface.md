---
kind: slice
slug: overhaul-dead-surface
title: Delete the dead tool surface (zero references remain)
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: the dead tools, the guidelines
feature and its machinery, all gone with zero references remaining.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Registration surface: the tool listing after deletion.
- Corpus: package-wide searches for every deleted name (the
  acceptance check itself).

Failure modes to cover:

- A stale reference in prose, tests, or agent prompts (the sweep
  misses nothing).
- A deleted tool still registered (registration table fully
  updated).

Scenarios:

- The package loads with the shrunken surface; every surviving tool
  still answers.
- The full suite green after test removal.

Edge cases:

- The notification tool: present and untouched.
- Tests that covered deleted behavior: removed, not skipped.

## Constraints and dependencies

- Pure deletion: no behavior added, no description rewording beyond
  removal.
- Design context: the effort spec
  (docs/tasks/task-tools-overhaul/spec.md), Tool surface (deleted
  list); decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, rounds 1 and 3
  (verdicts, guidelines).
- User decisions (to-tickets quiz 2026-09-16): guidelines deletion
  stays here, not merged into the execution-skills re-pointing.
