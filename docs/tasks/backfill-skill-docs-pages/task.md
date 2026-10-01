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

## Implementation notes

### Slice - backfill-skill-docs-pages (landed)

Landed on `ticket/backfill-skill-docs-pages` (2 commits, merged into
`task/backfill-skill-docs-pages` with --no-ff, 28 files, +1888).
Strict TDD per the arch spec's five seams, all appended to
`tests/skills.test.ts`: RED commit `80cfeb6` (presence seam listed
exactly the 27 missing pages), GREEN commit `64a8ac1` (27 pages
created, all five seams passing). The presence test derives page
paths from `pkg.pi.skills`, never a hardcoded list; the surviving
tools seam reuses `expectOnlySurvivingTools` and `SURVIVING_TOOLS`.
Seams 3 (no non-promoted pages) and 4 (surviving tools only) are
guard tests, green on arrival by design; they become load-bearing
the moment a future page violates them.

What landed: 27 human-facing pages (22 under `docs/engineering/`, 5
under `docs/productivity/`), each with H1 = skill name and the four
required sections in order, no em-dashes (character sweep clean).
The seven overhaul-changed flow pages (wayfinder, to-spec,
to-tickets, task-workflow-overview, task-workflow-doctor,
implement-task, finalize-task) plus setup-workflow describe the v4
effort-grouped tree and the surviving `tw_*` tools; the code-review
and tdd pages cover the standards direct reads. The two pre-existing
pages (`eval-review`, `handoff`) conformed already and needed no
re-sync. A deviation report sits under `deviation-reports/` in this
ticket's directory.

Gates on the merged branch (verified independently before landing,
re-run after merge): 372/372 in `tests/skills.test.ts`, full suite
733/733 across 14 files, `tsc --noEmit` clean; no lint script is
configured.

### Coherence pass (post-review)

The advisory two-axis review (Standards plus Spec) flagged two page
inaccuracies, both fixed: the implement-task page now states the real
feature chain (slice-verifier and deviation-reporter run in parallel
behind an ok-gate, not a failure-triggered deviation report), and the
tdd page gained the standards direct reads the arch spec requires.
`docs/testing.md`'s session.test.ts count was corrected from 16 to 10
(the guidelines describe removed by overhaul-dead-surface). The
review's remaining judgement calls (stale v3 map flags, the unused
`Bool` helper deferred by the dead-surface deviation report, the
pending changeset) are recorded there and left to finalize/release.
