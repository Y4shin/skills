---
kind: slice
slug: doctor-routing-tests
title: Add routing xref assertions (doctor names the issues + the skills it routes to)
task: ../task.md
mode: afk
status: todo
size: s
blocked_by: [doctor-skill-and-resources]
---

# Slice 2: Add routing xref assertions

## End-to-end behavior

The structure tests assert the doctor SKILL.md names the common issues and the
skills/commands it routes to, locking the routing contract.

## Deliverables

- `tests/skills.test.ts` — add xref assertions in the `skill cross-references`
  describe block:
  - test that `skills/task-workflow-doctor/SKILL.md` references `onboard-workflow`
    (the primary route for the docs/tasks/ + docs/bugs/ tree).
  - test that the doctor SKILL.md contains "diagnoses" and "routes" (the
    not-a-fixer contract).

## Acceptance criteria

- `tests/skills.test.ts` has the two new xref assertions; both pass.
- `npm test -- tests/skills.test.ts` green.

## Test plan

- Seams: the structure tests are the seam.
- Failure modes: a routing reference dropped from the SKILL.md → xref test
  fails.
- Scenarios: `npm test -- tests/skills.test.ts` green.

## Constraints

- Do not change the doctor SKILL.md content in this slice (slice 1 owns it);
  only add assertions. If an assertion fails, the fix is in slice 1's SKILL.md,
  not here.
