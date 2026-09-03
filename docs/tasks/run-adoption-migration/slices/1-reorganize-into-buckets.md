---
kind: slice
slug: reorganize-into-buckets
title: Reorganize skills/ into engineering/productivity/misc/in-progress/deprecated buckets with promotion rules
task: ../task.md
mode: afk
status: done
size: m
blocked_by: []
---

## End-to-end behavior

`skills/` is reorganized from the current flat layout into Matt's bucket
folders: `engineering/`, `productivity/`, `misc/`, `in-progress/`,
`deprecated/`. Only `engineering/` + `productivity/` are **promoted** (ship +
get docs pages). `package.json`'s `pi.skills` array is updated to list only
the promoted skills (each `./skills/engineering/<name>` or
`./skills/productivity/<name>`); non-promoted skills stay in the repo but are
removed from `pi.skills`. The repo-root conventions doc (created in a later
hitl slice) will record the promotion rules; this slice just does the move
and the `pi.skills` trim. Bucket `README.md`s are created (user-invoked vs
model-invoked grouping, per Matt's convention).

## Acceptance criteria

- Each existing skill directory is moved into the correct bucket (see
  bucket assignment below). No skill content is changed in this slice —
  only moved + `pi.skills` trimmed.
- `package.json` `pi.skills` lists only promoted skills (engineering +
  productivity); non-promoted are absent.
- Each bucket folder has a `README.md` (engineering/productivity group
  entries into User-invoked and Model-invoked; misc/in-progress/deprecated
  use a flat list per Matt).
- `npm test` is green (the `tests/skills.test.ts` `SKILL_FILES` paths and
  manifest count assertions must be updated to the new bucket paths).
- `npm run typecheck` is green.

## Bucket assignment (from grilling #1 Q3 + the current skill list)

Move existing skills to these buckets (this slice; new skills are added in
later slices):
- `engineering/` (promoted): wayfinder, implement-task, finalize-task,
  onboard-workflow, tdd, code-review, task-workflow-overview, diagnosing-bugs,
  codebase-design, domain-modeling, improve-codebase-architecture, grilling,
  skill-creator. (report-bug is retired into deprecated/ in `retire-and-drop`;
  grilling-with-ui is dropped there too.)
- `productivity/` (promoted): wait-what. (grill-me, handoff, etc. are added
  in later slices.)
- `misc/`: empty for now (Q19 adopts none).
- `in-progress/`: empty for now (Q18 adopts none).
- `deprecated/`: create-task is already retired (`disable-model-invocation:
  true` compat redirect) — move it here.

## Test plan

Seams: `tests/skills.test.ts` structure assertions (paths + manifest count)
and `npm run typecheck`. Failure modes: a skill is in the wrong bucket; a
promoted skill is missing from `pi.skills`; a non-promoted skill is still in
`pi.skills`; a bucket README missing or wrong grouping. Scenarios: `pi
install` resolves only promoted skills; `/help` shows only promoted skills.
Edge cases: `create-task` is a compat redirect (keep its content, just
relocate to deprecated/).

## Constraints and dependencies

- Source: Matt's bucket layout (`skills/{engineering,productivity,misc,
  in-progress,deprecated}/README.md` + `CLAUDE.md` promotion rules) in the
  gitignored clone at `docs/tasks/mp-skills-current-state-report/matt-skills/`.
- No skill content changes this slice (only moves + `pi.skills` + READMEs).
- `tests/skills.test.ts` is the regression seam — update it in this slice.
