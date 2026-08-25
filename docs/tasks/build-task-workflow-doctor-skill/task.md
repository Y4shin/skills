---
kind: task
type: feature
slug: build-task-workflow-doctor-skill
title: Build the task-workflow-doctor skill (diagnose workflow issues, route to the right skill)
map: compare-to-mp-skills
status: ready
blocked_by: []
slices:
- doctor-skill-and-resources
- doctor-routing-tests
---

## Decision being implemented

From the settled grilling task `improve-architecture-evaluation` (Q6): build a
model-invoked `task-workflow-doctor` skill that diagnoses common task-workflow
issues (missing dirs/files) and tells the user which skill to run. Invoked when
something is going wrong with the task workflow.

## User-visible outcome

A `/task-workflow-doctor` skill exists, is registered, and — when invoked with
a symptom ("tasks aren't showing up", "CONTEXT.md missing", "can't create
bugs") — diagnoses the missing dir/file and routes to the appropriate skill
(`onboard-workflow`, the relevant skill for CONTEXT.md/ADRs, etc.).

## Scope

In scope:
- `skills/task-workflow-doctor/SKILL.md` — model-invoked skill; description
  fires on "workflow broken", "doctor", "tasks not showing", "missing
  CONTEXT.md", etc. Body: diagnose the reported symptom → check for the
  common missing dirs/files → route to the right skill. Not a fixer; it
  diagnoses and routes.
- `skills/task-workflow-doctor/resources/` — one resource file per common
  issue, each naming the missing artifact, the symptom it causes, and the
  skill/command to run. Issues to cover:
  - `docs/tasks/` tree missing → run `/skill:onboard-workflow`
  - `docs/tasks/state.yaml` missing → run `/skill:onboard-workflow`
  - `docs/bugs/` + `docs/bugs/archive/` missing → run `/skill:onboard-workflow`
  - `docs/dev-env.md` missing → run `/skill:onboard-workflow`
  - `docs/testing.md` missing → run `/skill:onboard-workflow`
  - `CONTEXT.md` missing → (when adopted) create lazily via the relevant
    skill (improve-codebase-architecture grilling, or a manual step)
  - `docs/adr/` missing → (when adopted) create lazily via the relevant skill
  - `package.json` `pi.skills`/`pi.subagents` misconfigured → manual fix
    (point at the manifest docs)
- `package.json` `pi.skills` gains `"./skills/task-workflow-doctor"` (length 8 → 9).
- `tests/skills.test.ts` — add `"skills/task-workflow-doctor/SKILL.md"` to
  `SKILL_FILES`; update `pi.skills.length` assertion 8 → 9.

Out of scope:
- The `build-improve-architecture-skill` task (separate, blocked by three
  prerequisites).
- The three prerequisite skills (codebase-design, grilling, domain-modeling).
- Auto-fixing issues (the doctor routes; the user runs the routed skill).
- Updating `onboard-workflow` to optionally create `CONTEXT.md`/`docs/adr/`
  (noted as downstream fog — the doctor can recommend it as a manual step
  until then).

## Acceptance criteria

- `skills/task-workflow-doctor/SKILL.md` + `resources/` exist and are non-empty.
- The SKILL.md diagnoses a reported symptom, checks for missing dirs/files,
  and routes to the right skill (does not auto-fix).
- `package.json` `pi.skills` contains `"./skills/task-workflow-doctor"`
  (length 9).
- `tests/skills.test.ts` `SKILL_FILES` includes the doctor skill; the length
  assertion expects 9.
- `npm test -- tests/skills.test.ts` green.

## Existing abstractions to use

- The `SKILL_FILES` + `pi.skills.length` assertion pattern (proven by /tdd
  and /code-review).
- The existing skill-prose structure conventions.

## Do NOT reimplement

- Do not auto-fix; the doctor routes to the right skill.
- Do not duplicate the `onboard-workflow` setup logic; reference it.

## Architecture notes

- Slice 1 (skill + resources + manifest + structure tests) has no deps. Slice
  2 (routing tests — xref assertions that the doctor SKILL.md names the
  common issues and the skills it routes to) is blocked_by slice 1.
- The doctor is model-invoked (no `disable-model-invocation`) so it fires when
  workflow-health symptoms come up.
- Full architecture spec: `docs/tasks/build-task-workflow-doctor-skill/arch-spec.md`.

## Implementation notes
- slice 1 (doctor-skill-and-resources) landed: task-workflow-doctor SKILL.md + 8 per-issue resources authored, registered in package.json pi.skills (length 8→9), tests/skills.test.ts SKILL_FILES and length assertion updated; npm test -- tests/skills.test.ts green (104/104). No deviations from spec.

