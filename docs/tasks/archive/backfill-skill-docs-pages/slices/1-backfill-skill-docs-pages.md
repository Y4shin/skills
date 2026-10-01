---
kind: slice
slug: backfill-skill-docs-pages
title: Backfill human-facing docs pages for promoted skills
task: ../task.md
mode: afk
status: done
size: l
blocked_by: []
---

## End-to-end behavior

The full contract is in ../task.md: docs pages for every promoted
skill lacking one, four sections each, v4-true for the
overhaul-changed skills, structure tests covering the facts.

## Acceptance criteria

See ../task.md. All criteria land in this slice.

## Test plan

Seams:

- Structure tests: page presence per promoted skill, the four
  sections on every page, the docs tree mirroring the two promoted
  buckets (the existing pattern in tests/skills.test.ts).

Failure modes to cover:

- A promoted skill whose page is missing or lacks a section (the
  test fails by name).

Scenarios:

- A freshly missing page is created with the four sections.
- The two existing pages (eval-review, handoff) are checked against
  the four sections and re-synced where wrong.

Edge cases:

- Non-promoted buckets (misc, in-progress, deprecated) get no pages;
  the tests must not demand them.

## Constraints and dependencies

- Design context: AGENTS.md (the docs-page mandate and the four
  sections), arch spec
  docs/tasks/overhaul-planning-skills/arch-spec.md (decision 2).
- Run after the repo's own v4 migration if that lands first, so the
  pages describe the tree the skills actually write.
