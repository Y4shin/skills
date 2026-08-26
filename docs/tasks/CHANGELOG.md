# Task Changelog

## 2026-08-26 — Add human-owned implementation mode with read-only verification (build-human-implementation-mode)
Added permissive human/manual routing for feature and bug workflows, collaborative planning and consent gates, read-only verifier-first checks, approval-gated landing, and collaborative refactoring guidance. Added a reproducible devenv shell; targeted structure tests reached 139/139. Full integration verification remains blocked by the pre-existing AuthStorage API mismatch, tracked in `fix-integration-harness-auth-storage`.

## 2026-08-25 — Build the /diagnosing-bugs skill and wire it into the bug pipeline (build-diagnosing-bugs-skill)
Added a model-invoked `/diagnosing-bugs` skill with the 6-phase debugging
discipline adapted from mp-skills (Phase 1 build-a-feedback-loop
**non-skippable** with 10 construction ways + a red-capable completion
criterion; Phases 2–6 skippable with a recorded reason; redact rule;
Phase 6 no-correct-seam handoff to wayfinder / `/improve-codebase-architecture`
with no auto-spawn). Wired it into the bug pipeline: `bug.md`'s tdd-worker
dispatch now passes `skill: "diagnosing-bugs"` + an explicit "You are on a
`type: bug` task" instruction line, and `agents/tdd-worker.md` gained a
path-agnostic routing line. Registered in `package.json` `pi.skills` (9→10);
114/114 structure tests green.

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
