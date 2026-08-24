---
kind: slice
slug: doctor-skill-and-resources
title: Author the task-workflow-doctor skill + resources and register it
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: []
---

# Slice 1: Author the task-workflow-doctor skill + resources and register it

## End-to-end behavior

The `task-workflow-doctor` skill exists as a model-invoked skill in this
package, with per-issue resources, and is registered in the manifest. After
this slice, `/skill:task-workflow-doctor` is invokable and the structure tests
pass against the new files.

## Deliverables

- `skills/task-workflow-doctor/SKILL.md` — frontmatter (`name: task-workflow-doctor`,
  `description` firing on "workflow broken", "doctor", "tasks not showing",
  "missing CONTEXT.md", "missing docs/bugs", etc.) + body:
  - Purpose: diagnose a reported task-workflow symptom → check for the common
    missing dirs/files → route to the appropriate skill. NOT a fixer; it
    diagnoses and routes.
  - Process: ask the user for the symptom (or read what they reported); check
    each common-issue resource; report which artifact is missing/misconfigured
    and which skill/command to run.
  - A table mapping symptoms → missing artifact → skill/command, linking to
    the per-issue resources.
  - Explicitly state: "The doctor diagnoses and routes; it does not fix. Run
    the routed skill to fix."
- `skills/task-workflow-doctor/resources/` — one resource file per common
  issue (each: the missing artifact, the symptom it causes, the skill/command
  to run):
  - `missing-tasks-tree.md` — `docs/tasks/` missing → `/skill:onboard-workflow`
  - `missing-state-yaml.md` — `docs/tasks/state.yaml` missing → `/skill:onboard-workflow`
  - `missing-bugs-dirs.md` — `docs/bugs/` + `docs/bugs/archive/` missing → `/skill:onboard-workflow`
  - `missing-dev-env.md` — `docs/dev-env.md` missing → `/skill:onboard-workflow`
  - `missing-testing-md.md` — `docs/testing.md` missing → `/skill:onboard-workflow`
  - `missing-context-md.md` — repo-root `CONTEXT.md` missing → note (the
    relevant skill creates it lazily when adopted; until then a manual step)
  - `missing-adr-dir.md` — `docs/adr/` missing → note (the relevant skill
    creates it lazily when adopted; until then a manual step)
  - `manifest-misconfigured.md` — `package.json` `pi.skills`/`pi.subagents`
    misconfigured → manual fix (point at the manifest docs)
- `package.json` — add `"./skills/task-workflow-doctor"` to `pi.skills`
  (length 8 → 9).
- `tests/skills.test.ts` — add `"skills/task-workflow-doctor/SKILL.md"` to
  `SKILL_FILES`; update the `pi.skills.length` assertion from 8 to 9.

## Acceptance criteria

- The SKILL.md + at least 8 resource files exist and are non-empty.
- `SKILL.md` frontmatter has `name: task-workflow-doctor` and a description > 5
  chars.
- `SKILL.md` states the doctor diagnoses and routes (does not auto-fix).
- `package.json` `pi.skills` contains `"./skills/task-workflow-doctor"` and
  has length 9.
- `tests/skills.test.ts` `SKILL_FILES` includes the doctor skill; the length
  assertion expects 9.
- `npm test -- tests/skills.test.ts` green.

## Test plan

- Seams: the test suite is the seam — the structure tests verify the new skill
  file and the updated manifest.
- Failure modes: manifest length mismatch; missing frontmatter/description;
  existing tests regress from lockstep failures.
- Scenarios: `npm test -- tests/skills.test.ts` green with the new skill
  registered and assertions updated.
- Edge cases: `no chain JSON references` / `no supervisor/intercom` tests
  must pass for the new SKILL.md.

## Constraints

- The doctor routes; it does not fix. Do not auto-create dirs/files.
- Reference `onboard-workflow` for the docs/tasks/ + docs/bugs/ tree; do not
  duplicate its setup logic.
- Avoid "chain.json", "subagent_supervisor", "contact_supervisor" patterns.
