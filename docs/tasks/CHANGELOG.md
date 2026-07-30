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
