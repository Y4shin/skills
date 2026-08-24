# Task Changelog

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
