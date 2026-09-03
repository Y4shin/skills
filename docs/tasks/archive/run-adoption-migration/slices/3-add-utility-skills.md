---
kind: slice
slug: add-utility-skills
title: Add the 7 standalone utility skills (prototype, research, resolving-merge-conflicts, wizard, handoff, to-questionnaire, teach) adapted to Pi
task: ../task.md
mode: afk
status: done
size: l
blocked_by:
- reorganize-into-buckets
---

## End-to-end behavior

Seven standalone utility skills from Matt are added to `skills/productivity/`
(or `engineering/` per Matt's bucket placement), adapted to Pi (frontmatter
`name`/`description`/`disable-model-invocation`, no `agents/openai.yaml` per
Q14, telemetry wiring, no-em-dashes prose): `prototype`, `research`,
`resolving-merge-conflicts`, `wizard`, `handoff`, `to-questionnaire`,
`teach`. Each is adapted from the corresponding Matt SKILL.md at the pinned
clone (`docs/tasks/mp-skills-current-state-report/matt-skills/skills/<bucket>/<name>/SKILL.md`)
plus its companion docs (e.g. `prototype/LOGIC.md` + `UI.md`, `teach/
{GLOSSARY,LEARNING-RECORD,MISSION,RESOURCES}-FORMAT.md`). Each passes
`skills/skill-creator/scripts/validate_skill.mjs` and is added to
`package.json` `pi.skills`. `research` here is a **background-agent skill**
that leaves cited Markdown, distinct from the existing `research` *task
type* (the convergence of those two names is recorded as a note; the
`rewire-implement-task` slice decides how implement-task dispatches to it).

## Acceptance criteria

- 7 new skill directories exist under the correct bucket, each with a
  `SKILL.md` adapted to Pi (+ Matt's companion docs where he ships them).
- Each adaptation: uses Pi frontmatter (no `agents/openai.yaml`); keeps
  Matt's content/structure; applies the no-em-dashes rule; wires
  `telemetry_skill_context` / `submit_feedback` per the repo convention;
  rewrites Matt's "Call the Skill tool with `<name>`" to Pi's invocation
  convention where operative (or keeps it harness-neutral if that reads
  better, record the choice in slice notes).
- Each new skill passes `validate_skill.mjs` (the skill-creator dogfood).
- `package.json` `pi.skills` lists all 7 (promoted, in their bucket).
- `tests/skills.test.ts` `SKILL_FILES` + manifest count updated; green.
- `npm test` and `npm run typecheck` green.

## Per-skill adaptation notes (from grilling #1 Q8)

- `prototype` (engineering/model): two branches, `LOGIC.md` (single
  shareable HTML) + `UI.md` (toggleable variants). Throwaway, no tests,
  capture as primary source on a branch.
- `research` (engineering/model): background agent, cited Markdown. Note
  the name clash with the `research` task type.
- `resolving-merge-conflicts` (engineering/model): hunk-by-hunk by intent,
  never `--abort`.
- `wizard` (engineering/model): interactive bash for human-only steps;
  ships `template.sh`.
- `handoff` (productivity/user): portable handoff doc. Borrow
  `claude-handoff`'s bg-agent seeding pattern as inspiration (Q18) where it
  maps to Pi subagents.
- `to-questionnaire` (productivity/user): questionnaire for a third party.
- `teach` (productivity/user): multi-session; 4 companion format docs.

## Test plan

Seams: `validate_skill.mjs` per skill (dogfood), `tests/skills.test.ts`
structure assertions, `npm run typecheck`. Failure modes: a skill fails
`validate_skill.mjs`; a skill retains an em-dash; a skill references
`agents/openai.yaml` (should not, Q14); a companion doc is missing; the
`research` skill and `research` task type are conflated (record the
distinction). Scenarios: `pi install` ships all 7; each SKILL.md is
invokable. Edge cases: a Matt skill that is Claude-specific (e.g.
`handoff`'s `argument-hint`), adapt or drop the field (record choice).

## Constraints and dependencies

- Blocked by `reorganize-into-buckets` (new skills go into the new buckets).
- Source: the pinned Matt clone (gitignored). Adapt, do not verbatim-copy,
  Matt's invocation model to Pi (map constraint).
- Grilling #1 Q8 (adopt all 7 + wire implement-task), Q14 (openai.yaml
  concept-not-file), Q18 (claude-handoff as inspiration for handoff).
- Telemetry wiring is mandatory (map constraint).
- The `implement-task` dispatch wiring happens in `rewire-implement-task`.
