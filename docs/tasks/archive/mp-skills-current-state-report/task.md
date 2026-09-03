---
kind: task
type: research
slug: mp-skills-current-state-report
title: What does Matt Pocock's skills repo contain now (skills, concepts, conventions) at a fresh pinned commit?
map: adopt-mp-skills-way
status: done
blocked_by: []
completed_at: 2026-09-03T18:50:00Z
---

# mp-skills-current-state-report — research

## Precise question

What does Matt Pocock's skills repo (`https://github.com/mattpocock/skills`)
contain *right now* — its skills, the concepts they encode (grilling,
planning, domain modeling, etc.), and its skill format/directory
conventions — at a freshly pinned commit hash?

This must be a **current** snapshot. The prior archived map
`compare-to-mp-skills` compared against an old Matt commit (origin/main at
4a9139e) and its `compare-to-mp-skills.md` doc is the starting reference —
but Matt's repo has evolved since. This research re-derives the current state
and explicitly flags what is **new or changed** versus that old snapshot.

## Decision or task it unblocks

Unblocks `map-mp-skills-onto-this-repo` (grilling #1), which maps Matt's
current state onto this repo and decides per conflicting item which version
wins (Matt's by default). Without a current, pinned report, grilling #1 would
decide against a stale picture.

## Trusted source boundaries

- **Primary source:** the cloned Matt repo at a pinned commit hash. Clone to
  a gitignored scratch dir under this repo (e.g.
  `docs/tasks/mp-skills-current-state-report/matt-skills/`), and add the
  clone path to `.gitignore` so it is not committed. Pin to a **commit hash**,
  not a moving branch, so the clone is reproducible on other machines. Record
  the hash and clone command in `findings.md`.
- **Scope = skills + concepts only** (entry grilling Q2): extract SKILL.md
  content, the grilling/planning concepts, and skill format/conventions
  (directory layout, frontmatter, naming, user-invoked vs model-invoked
  split, promotion rules, companion docs). **Exclude** Matt's CI/build
  tooling, release automation, and harness-specific packaging.
- **Prior comparison as a starting reference, not source of truth:** read
  `docs/tasks/maps/archive/compare-to-mp-skills/compare-to-mp-skills.md` first
  to know what was already compared and adopted, then re-derive current state
  and diff against it.
- **This repo as the comparison target:** read enough of this repo's
  `skills/`, `package.json` (`pi.skills` list), and the wayfinder/implement-
  task resources to state accurately what we have now, so the report's
  "mapping" sections are grounded. Do not re-derive this repo exhaustively —
  the prior doc + a light pass is enough.

## Evidence required for completion

`findings.md` (the canonical, self-contained report) must contain:

1. **Clone provenance:** the exact clone command, the pinned commit hash,
   the clone date, and the gitignore entry added.
2. **Inventory:** every skill currently in Matt's repo, grouped by his
   category dir, with: skill name, one-line purpose, invocation model
   (user-invoked / model-invoked / wrapper), and file path.
3. **Concepts catalog:** the reusable concepts Matt's skills encode
   (grilling rounds/frontier, domain modeling glossary/ADR, codebase design
   vocabulary, two-axis code review, 6-phase debugging, etc.), each with the
   skill that owns it and a 2-3 line summary.
4. **Format & conventions:** Matt's skill format — directory layout, SKILL.md
   frontmatter fields, naming, the user-invoked vs model-invoked split,
   promotion rules (in-progress → shipped), companion reference docs, and any
   repo-root docs (`.agents/adr/`, `CONTEXT.md`, `docs/agents/`).
5. **Diff vs prior snapshot:** a "What's new or changed since the old
   comparison" section — new skills, renamed/removed skills, changed
   concepts, changed conventions. This is the delta grilling #1 cares about
   most.
6. **What Matt has that we do not** and **what we have that Matt does not**,
   refreshed against current state (the prior doc's two tables are the seed;
   update them).
7. **Already-adopted check:** for each item the prior `compare-to-mp-skills`
   map adopted (grilling, domain-modeling, codebase-design, code-review,
   diagnosing-bugs, tdd skill, improve-architecture, doctor, etc.), note
   whether our shipped version still matches Matt's current version or has
   diverged. This tells grilling #1 what is settled-aligned vs re-open.

The clone must remain in place (gitignored) after this task so grilling #1
and #2 can re-open source files. `findings.md` must be self-contained enough
to be read alone, but it may cite file paths in the clone.

## Likely dependent tasks

- `map-mp-skills-onto-this-repo` (grilling #1) — blocked by this task.
- `design-migration-skill` (grilling #2) — transitively, via grilling #1.
- Possibly new tasks surfaced by this research (e.g. "Matt now ships skill X
  we never evaluated") — graduate from Fog into tasks during grilling #1, not
  here. This task records discoveries in `findings.md`; it does not create
  tasks.
