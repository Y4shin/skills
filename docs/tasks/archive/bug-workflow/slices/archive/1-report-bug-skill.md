---
kind: slice
slug: report-bug-skill
title: report-bug skill
task: ../task.md
mode: afk
status: done
size: m
blocked_by: []
started_at:
completed_at: 2026-07-30T17:10:00Z
---

# Slice 1: report-bug skill

Create `skills/report-bug/SKILL.md` implementing the flowchart in
`docs/ideas/bug-workflow.md` (authoritative reference):

1. **Capture**: parse free-form input, propose ALL fields en-bloc
   (observed / expected / reproduction / severity); user corrects in
   one pass. No codebase exploration, no one-question-at-a-time.
2. **Duplicate check** (`grep docs/bugs/`): suspected dupe → ask once →
   confirmed: append note + context to existing doc, commit, stop.
3. Write `docs/bugs/<slug>.md` (`status: reported`), commit.
4. **Reproduce** governed by the consuming repo's `docs/dev-env.md`
   (which may forbid AI reproduction → record skip, continue). No test
   cases at this step — produce `repro.md` (+ ad-hoc scripts, e.g.
   playwright) next to the bug doc. Can't reproduce → one targeted
   question → still stuck: `wontfix` + rationale.
5. **Triage**:
   - Trivial → TDD-ordered spot fix: regression test from repro.md red
     against unfixed code, fix green, full suite, direct commit to
     main, CHANGELOG line, close + archive bug doc. No branch.
   - Non-trivial → promote: infer task doc (`type: bug`, plus
     `bug: <bug-slug>` frontmatter linking back to the bug doc) +
     conforming slice docs (`slices:` list; each slice has title,
     acceptance criteria, `## Test plan`, `size`, `blocked_by`;
     default ONE slice), propose to user, on agreement write
     `docs/tasks/<slug>/`
     and move `repro.md` (+ scripts) next to `task.md`. Bug doc:
     `status: promoted`, `promoted_to`. Hand off to implement-task.

Also: register `./skills/report-bug` in `package.json` `pi.skills`.

The **test rule** must be stated in the skill: every fix lands at least
one test red when the bug is present; sole exception (untestable
defects, e.g. visual-only) must be documented in the bug doc.

## Acceptance criteria

- `skills/report-bug/SKILL.md` exists with name + description
  frontmatter and covers all 5 flow steps above.
- `package.json` `pi.skills` includes `./skills/report-bug`.
- Skill prose states: en-bloc capture, dev-env.md governance (incl.
  the "may forbid AI reproduction" path), repro.md artifact, the test
  rule, trivial/promote triage, promotion writing conforming slices.
- `tests/skills.test.ts` updated: SKILL_FILES includes report-bug,
  manifest test expects 6 skills.
- Full test suite green.

## Test plan

- Layers touched: skill prose, package manifest, test suite.
- Failure modes:
  1. Skill file missing/malformed frontmatter → structure test fails.
  2. Manifest/skills-list drift → manifest test fails.
- Key scenarios: structure test passes for the new skill; manifest
  test passes at count 6.
- Edge cases: repro-schemas resources absent (skill must not require
  them); dev-env.md absent in a consuming repo (skill must say what to
  do — recommend: ask the user how to run/reproduce).
