# Task Changelog

## 2026-08-25 — Build the task-workflow-doctor skill (build-task-workflow-doctor-skill)
Added a model-invoked `task-workflow-doctor` skill that diagnoses common
task-workflow issues (missing `docs/tasks/` tree, `state.yaml`, `docs/bugs/`,
`docs/dev-env.md`, `docs/testing.md`, `CONTEXT.md`, `docs/adr/`, or a
misconfigured `package.json` manifest) and routes to the owning skill —
primarily `/skill:onboard-workflow` — rather than auto-fixing. Backed by 8
per-issue resource files and a symptom→artifact→route table; the not-a-fixer
contract (`diagnoses` + `routes` + `onboard-workflow` reference) is locked by
xref assertions in `tests/skills.test.ts`. Registered in `package.json`
`pi.skills` (length 8→9); 106/106 structure tests green.

## 2026-08-24 — Build the /code-review skill, code-reviewer agent, and get_guidelines extension (build-code-review-skill)
Added a model-invoked `/code-review` skill (two-axis: Standards + Spec) with
the 12-smell Fowler baseline as a companion doc, plus a `code-reviewer` fanout
agent that spawns parallel read-only Standards and Spec reviewers and
aggregates side by side (never merged, no single winner). Extended our own
`get_guidelines` tool to discover repo-root standards files
(`AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/standards.md`) and surface the
smell baseline as a floor when no repo standards match. Wired the review into
implement-task's feature path (before Step 3 coherence refactor) and bug path
(after the single chain), advisory — feeds findings to the refactor, does not
gate. Refactor home stays at implement-task Step 3. 105/105 structure+guidelines
tests green; 16 pre-existing session.test.ts failures reproduce on main.

## 2026-08-24 — Build the /tdd reference skill and wire it into the TDD pipeline (build-tdd-reference-skill)
Added a model-invoked `/tdd` reference skill (`SKILL.md` + `tests.md` +
`mocking.md`) defining test quality — what a good test is, seams, anti-patterns,
loop rules — alongside the existing `tdd-worker` agent. The agent loop
narrowed to RED→GREEN; refactoring moved to implement-task's Step 3 coherence
pass. Seams are agreed in the arch spec (features) or the repro (bugs). The
skill is delivered to the fresh-context worker via the `skill:` subagent param.
The slice-verifier stays pass/fail; test-quality-in-review is deferred to the
`code-review-evaluation` sibling. First skill in this repo with companion
reference docs. 89/89 structure tests green; 16 pre-existing session.test.ts
failures reproduce on main and are unrelated.

## 2026-07-30 — Bug workflow (report, track, fix) (bug-workflow)
Added a bug path to the workflow: new `report-bug` skill (en-bloc capture,
dev-env.md-governed reproduction into repro.md, trivial spot-fix or
promotion to a `type: bug` task), implement-task split into a
type-dispatching wrapper with `resources/feature.md` + lean
`resources/bug.md`, finalize-task bug closure, and onboarding/routing
support. Both implement-task resources gained the failure toolbelt
(split-first, retry-bigger, escalate; parent never implements). 171/171
tests green.

## 2026-08-24 — Gate task-workflow resources by repo (gate-skills-by-repo)
Auto-disable all task-workflow resources (task_* + notify_user + guidelines
tools, before_agent_start injection, skill auto-advertising, and explicit
/skill:<name>) in work repos based on the git origin remote, with zero
per-repo config. Global `taskWorkflow.disableOnRepo` regex list + per-project
`taskWorkflow.enable` override; detection in a new pure `src/core/repo-gate.ts`
module. One known limitation: the six skills still show on /help in a work
repo (pi 0.80.10 has no subtractive hook); explicit /skill: is blocked via the
input event instead. 227/227 tests green (pre-existing integration-harness
failure unrelated).
