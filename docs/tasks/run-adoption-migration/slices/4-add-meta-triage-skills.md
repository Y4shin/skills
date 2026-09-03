---
kind: slice
slug: add-meta-triage-skills
title: Add writing-for-agents (+SKILL-MECHANICS), triage (retiring report-bug's intake), and grill-me (stateless interview)
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
- reorganize-into-buckets
---

## End-to-end behavior

Three more skills are added, adapted to Pi: `writing-for-agents`
(productivity/model) + its companion `SKILL-MECHANICS.md` (the prose
discipline for writing skills/docs, per grilling #1 Q4); `triage`
(engineering/user) — the issue/PR state-machine + agent-briefs skill,
**adapted to `docs/tasks/` + `docs/bugs/` + `docs/tasks/out-of-scope/`
instead of an issue tracker**, which subsumes `report-bug`'s intake
function (Q12); and `grill-me` (productivity/user) — the stateless
interview wrapper around `grilling` for the no-repo case (Q15). Each passes
`validate_skill.mjs`, is added to `package.json` `pi.skills`, and gets
telemetry + no-em-dashes treatment. `triage`'s companion docs
(`AGENT-BRIEF.md`, `OUT-OF-SCOPE.md`) are adapted to the docs/tasks
substrate.

## Acceptance criteria

- `writing-for-agents/` with `SKILL.md` + `SKILL-MECHANICS.md` exists under
  `skills/productivity/`, adapted to Pi. `skill-creator` (already in the
  repo) references it for the prose discipline (Q4: coexist).
- `triage/` with `SKILL.md` + adapted `AGENT-BRIEF.md` + `OUT-OF-SCOPE.md`
  exists under `skills/engineering/`, adapted to read/write
  `docs/tasks/` + `docs/bugs/` + `docs/tasks/out-of-scope/` (Q12, Q17)
  instead of a tracker. The `report-bug` spot-fix path is either preserved
  inside `triage` or explicitly dropped — **decide and record** (Q12 left
  this to implementation).
- `grill-me/` with `SKILL.md` exists under `skills/productivity/`, a thin
  user-invoked wrapper around `grilling` for the no-repo case.
- Each passes `validate_skill.mjs`; `pi.skills` lists all 3; telemetry +
  no-em-dashes applied.
- `tests/skills.test.ts` updated; `npm test` + `npm run typecheck` green.

## Test plan

Seams: `validate_skill.mjs`, `tests/skills.test.ts`, typecheck. Failure
modes: `triage` still speaks tracker-language (must be docs/tasks-adapted);
`writing-for-agents` duplicates `skill-creator` (they must coexist, not
overlap); `grill-me` duplicates `grilling` (it's a wrapper, not a copy).
Scenarios: `/skill:triage` reads `docs/bugs/`; `/skill:writing-for-agents`
is reachable; `/skill:grill-me` runs stateless. Edge cases: the
report-bug spot-fix decision (record the choice + rationale).

## Constraints and dependencies

- Blocked by `reorganize-into-buckets`.
- `triage` reads `docs/tasks/out-of-scope/` which is scaffolded in the
  `scaffold-repo-root-docs` slice — but this slice can write the skill
  text that *references* that dir before the dir exists (the hitl slice
  creates the dir); record the ordering assumption in notes.
- Grilling #1 Q4 (writing-for-agents + keep skill-creator), Q12 (triage
  retires report-bug; spot-fix decision open), Q15 (grill-me in), Q17
  (out-of-scope at docs/tasks/out-of-scope/).
