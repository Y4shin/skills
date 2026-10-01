---
kind: slice
slug: overhaul-tw-rename
title: Rename the tool family to the tw_ prefix
task: ../task.md
mode: afk
status: done
size: m
legacy_blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: the whole family renamed, the
whole package swept, zero old-prefix references left, nothing
semantic riding along.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Tool contract: every tool invoked under its new name.
- Corpus: a package-wide search for old-prefix references (the
  acceptance check itself).

Failure modes to cover:

- A stale reference surviving in a resource, agent prompt, or test
  (the sweep misses nothing).

Scenarios:

- Every surviving tool called by its new name through the
  registered-tool interface.
- Skill prose references (wayfinder, to-spec, to-tickets,
  implement-task, finalize-task, doctor, the router) all use tw_
  names.

Edge cases:

- The soon-to-die tools rename too (their references stay
  consistent until the deletion ticket).
- Docs pages and README listings that name tools.

## Constraints and dependencies

- Purely mechanical: prefix-only diff, no description rewrites.
- Design context: decision record
  docs/tasks/overhaul-synthesis-grilling/task.md, round 7 (the
  rename ruling).
