---
kind: task
type: feature
slug: build-improve-architecture-skill
title: Build the /improve-codebase-architecture skill (architecture-scout + HTML report + grilling)
map: compare-to-mp-skills
status: blocked
blocked_by:
- build-codebase-design-skill
- build-grilling-skill
- build-domain-modeling-skill
slices:
- improve-arch-skill-and-scout
- improve-arch-report-and-grilling
---

## Decision being implemented

From the settled grilling task `improve-architecture-evaluation` (Q1–Q6):
build a periodic-maintenance `/improve-codebase-architecture` survey skill. An
`architecture-scout` agent walks the codebase for deepening opportunities; the
skill writes a self-contained HTML report (Tailwind + Mermaid, before/after
diagrams, strength badges) to the OS temp dir with CDN dependencies vendored
in the repo; the report stops and asks which candidate; grilling runs only on
an explicit pick (with a documented no-grill mode); the grilling decision feeds
wayfinder. Reads repo-root `CONTEXT.md` + `docs/adr/` (mp-skills convention).

## Status note

**BLOCKED** — this task cannot start until its three prerequisite build tasks
exist and land: `build-codebase-design-skill`, `build-grilling-skill`,
`build-domain-modeling-skill`. These are map fog items (decided in
`adopt-mp-skills-patterns` Q2 but not yet created as tasks). Wayfinder must
create them first; this task graduates when they're done.

## User-visible outcome

A `/improve-codebase-architecture` skill exists, is registered, and — when
invoked — surveys the codebase, produces a visual HTML report of deepening
candidates, and grills the picked candidate (opt-in) feeding wayfinder.

## Scope

In scope:
- `skills/improve-codebase-architecture/SKILL.md` — model-invoked (user-
  invoked; `disable-model-invocation: true` like mp-skills, since it's a
  periodic survey not a pipeline step); the survey process (explore → HTML
  report → ask which candidate → optional grilling → hand to wayfinder); the
  no-grill mode; reads `CONTEXT.md` + `docs/adr/`.
- `skills/improve-codebase-architecture/HTML-REPORT.md` — the HTML scaffold,
  diagram patterns, styling guidance (adapted from mp-skills), referencing
  the vendored CDN deps.
- `skills/improve-codebase-architecture/vendor/` — cached `tailwind.min.js`
  (~407KB) + `mermaid.min.js` (~3.6MB) so the report works offline. First
  vendored-asset precedent in this repo.
- `agents/architecture-scout.md` — custom read-only agent (`tools: read, bash,
  get_guidelines`; `defaultContext: fresh`; `inheritProjectContext: true`);
  prompt encodes the deletion-test + shallowness + codebase-design vocabulary
  heuristic; passed `skill: "codebase-design"` at dispatch.
- `package.json` `pi.skills` gains
  `"./skills/improve-codebase-architecture"`; `pi.subagents.agents` already
  covers `./agents`.
- `tests/skills.test.ts` — add the SKILL.md to `SKILL_FILES`; bump
  `pi.skills.length`; add `agents/architecture-scout.md` to `AGENT_FILES`;
  xref assertions (the skill references `architecture-scout`, `wayfinder`,
  `codebase-design`).

Out of scope:
- The three prerequisite skills (codebase-design, grilling, domain-modeling)
  — separate tasks.
- The `task-workflow-doctor` skill (separate task).
- Updating `onboard-workflow` to optionally create `CONTEXT.md`/`docs/adr/`
  (downstream fog for the doctor task).

## Acceptance criteria

- `skills/improve-codebase-architecture/{SKILL.md, HTML-REPORT.md}` exist and
  are non-empty.
- `skills/improve-codebase-architecture/vendor/{tailwind.min.js, mermaid.min.js}`
  exist (vendored; ~4MB).
- `agents/architecture-scout.md` exists with the required frontmatter and the
  deletion-test/shallowness prompt.
- `package.json` `pi.skills` contains the new skill (length bumped).
- `tests/skills.test.ts` green: SKILL_FILES includes the new skill;
  pi.skills.length updated; AGENT_FILES includes architecture-scout; xref
  assertions pass.
- The SKILL.md documents the no-grill mode and the wayfinder handoff.
- Full test suite green (modulo the 16 pre-existing session.test.ts failures).

## Existing abstractions to use

- The `skill:` subagent param (pass `codebase-design` to the scout — proven
  by /tdd and /code-review).
- The `SKILL_FILES`/`pi.skills.length`/`AGENT_FILES` assertion patterns.
- mp-skills' `/improve-codebase-architecture` SKILL.md + HTML-REPORT.md as
  the source to adapt from (not port verbatim — scout via subagent not
  Claude Code's `Agent`; hand to wayfinder not to-spec/to-tickets; vendored
  CDN deps; no-grill mode).

## Do NOT reimplement

- Do not port mp-skills verbatim. Adapt to our pipeline.
- Do not fold in the three prerequisites (they're separate tasks).
- Do not auto-fix architecture (the survey produces candidates; the grilling
  decision feeds wayfinder, which creates the deepening task).
- Do not use CDN URLs in the HTML template (use the vendored copies).

## Architecture notes

- Slice 1 (skill + scout agent + vendor deps + manifest + structure tests)
  has no deps beyond the task's blockers. Slice 2 (HTML report scaffold +
  grilling/no-grill wiring + xref tests) is blocked_by slice 1.
- The vendored assets are committed once; the HTML template references them
  via absolute path resolved at generation time (the temp file isn't in the
  repo, so it references the repo's vendor/ dir by absolute path).
- The scout is a single agent (no fanout) — it returns candidates; the skill
  writes the report.
- The grilling loop, when invoked, uses the existing grilling resource's
  one-question/frontier discipline (no new grilling variant).
