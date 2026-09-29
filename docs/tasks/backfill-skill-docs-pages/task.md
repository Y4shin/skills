---
kind: task
type: feature
slug: backfill-skill-docs-pages
title: Backfill human-facing docs pages for promoted skills
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-dead-surface
slices: [backfill-skill-docs-pages]
---

## What to build

Docs pages for the promoted skills that lack them, per AGENTS.md: every
skill in engineering/ and productivity/ gets a human-facing page at
`docs/<bucket>/<skill-name>.md`, created or re-synced whenever the
skill's behavior changes. The task-tools-overhaul effort changed
several skills' behavior without re-syncing pages (deliberately
deferred, arch spec overhaul-planning-skills decision 2); this task
clears that debt plus the pre-existing gap for the rest of the
promoted set.

Each finished page carries the four sections: What it does, When to
reach for it, Common questions, and It's working if. Pages for the
skills the overhaul changed must tell the v4 truth (effort-grouped
tree, decision tasks, tickets, the surviving tw_* tools).

## Acceptance criteria

- [ ] Every promoted skill (package.json pi.skills) has
      `docs/<bucket>/<skill-name>.md`.
- [ ] Pages for the overhaul-changed skills (wayfinder, to-spec,
      to-tickets, task-workflow-doctor, task-workflow-overview,
      implement-task, finalize-task, plus any the execution-skills
      ticket rewrites) describe the v4 flow.
- [ ] Every page carries the four sections (What it does, When to
      reach for it, Common questions, It's working if).
- [ ] Structure tests cover page presence and the four sections
      (extend tests/skills.test.ts).

## Blocked by

- overhaul-dead-surface (the tool surface is final then; earlier
      pages would document deleted tools).
