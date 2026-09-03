# Task Changelog

## 2026-09-03 — Complete the portable-skill-authoring map
The initiative is complete: a reusable `skill-creator` Agent Skill ships in this `task-workflow` Pi package, authored through a 4-task graph (support-script grilling → bundle-template prototype → build the skill → fold the templates in). `skill-creator` is spec-pure (frontmatter `name`+`description` only), capability-conditional (not brand-conditional), and carries a Node/TS helper-script trio (`validate_skill` with the `compatibility` bug-fix, `scaffold_skill`, `discover_skill`, each with by-hand fallbacks) + 6 one-level-deep references, including per-language support-script files with the verified, copy-pasteable bundle templates (Python `zipapp`, JS/TS esbuild with the `createRequire` namespace-alias banner) and the verified 17-slot default-stack tables (all picks pass at the Python 3.10 / Node 20 LTS floor). Registered in `package.json` (`pi.skills` →17) + `tests/skills.test.ts` + `tests/skill-creator-scripts.test.ts` (22 cases); dogfood + official `skills-ref` v0.1.5 both pass; 602/602 tests green across the two feature tasks.

## 2026-09-03 — Fold the bundle templates + verified stack into the support-script references (fold-bundle-templates-into-refs)
Folded the concrete bundle templates + verified 17-slot default-stack tables from the `bundle-script-template` prototype into `skills/skill-creator/references/support-scripts-python.md` (the `zipapp`/stdlib 3-step build sequence + Python stack table) and `support-scripts-js-ts.md` (the esbuild programmatic-API build with the conditional `createRequire` namespace-alias banner + JS/TS stack table + three API gotchas: `diff_match_patch` lowercase class, `tinyexec` `exec`/`x` not `execa`, the createRequire collision + namespace-alias fix). Resolved the stale "template comes later" pointer in the shared `support-scripts.md` to point at the per-language files. The floor stays Python 3.10 / Node 20 LTS (a minimum-compatibility target, not a recommendation); no library re-pick (all 17 pass at the floor). This completes the `portable-skill-authoring` map: the `skill-creator` skill now carries verified, copy-pasteable bundle templates + the verified default stack. 1 slice, 602/602 green.

## 2026-09-03 — Build the skill-creator Agent Skill (build-skill-creator-skill)
Added `skill-creator`, a reusable Agent Skill that helps an agent create, review, update, and make-portable other Agent Skills. Spec-pure frontmatter (only `name`+`description`); capability-conditional model (filesystem/bash-exec/network-MCP/harness-extensions) keyed on target-agent capabilities, not brands; 8-phase authoring workflow; produced-skill frontmatter guidance; a Node/TS helper-script trio (`validate_skill`/`scaffold_skill`/`discover_skill`, each with a by-hand fallback) with a bug-fix over sentient-agi's validator (accepts the spec-allowed `compatibility` field); 6 one-level-deep references (live-spec digest, Pi-target, shared + per-language support-script backbone seeded from the `support-script-conventions` grilling Q1–Q7). Registered in `package.json` (`pi.skills` →17) + `tests/skills.test.ts`; 22 vitest cases for the scripts; dogfood + official `skills-ref` v0.1.5 both pass; 602/602 tests green. The concrete bundle templates are deliberately deferred to the `fold-bundle-templates-into-refs` follow-up (blocked on this task). 6 slices, zero deviations across all deviation reports.

## 2026-08-28 — Complete the grilling-visualizer map
The initiative is complete: a detached grilling CLI + inlined Svelte SPA renders a live design-tree graph (rounds, 5-word-id nodes, dependency/contradiction/reference edges, summary sidebar, per-round answers), with a hidden temp-dir state file, CLI-enforced 7-state machine, and xdg-open auto-open across 3 platforms. The grilling skill + wayfinder resource drive it end-to-end, and an eval harness confirmed the full 11-command `update` surface (6 bootstrap + 5 discovered: answer, set-deps, accept, reject, stop). 5 slices landed; 566 tests green; typecheck clean.

## 2026-08-28 — Grilling visualizer: detached CLI + browser SPA + skill rewire + eval (build-grilling-visualizer)
Built a detached grilling CLI (`skills/grilling/grilling-cli.mjs`) that drives a persistent local HTTP server serving an inlined Svelte 5 SPA — a live graph of the design tree (rows=rounds, 5-word-id nodes, black/red/gray dependency/contradiction/reference edges, upcoming section, summary sidebar, per-round answer inputs) — with a hidden random temp-dir state file, the 7-state machine enforced in the CLI, and xdg-open auto-open across 3 platforms. Rewired the grilling SKILL.md + wayfinder resource to drive it end-to-end. An eval harness (3 synthetic scenarios, non-interactive pi, `GRILLING_EVAL=1` eval mode, 2-clean-in-a-row iteration) discovered 5 missing `update` commands (answer, set-deps, accept, reject, stop) beyond the 6 bootstrap, folded into the CLI + skill; all 3 scenarios converge 2-clean-in-a-row, confirming the 11-command surface is complete. A `/impeccable typeset` pass established base type roles on the SPA shell. 5 slices, 566 tests green, typecheck clean.

## 2026-08-27 — Fix finalize-task Step 7 set -e tool/binary confusion (finalize-task-set-e-tool-confusion)
`finalize-task` Step 7 mixed Pi tool calls (`task_map_tick`, `task_state_set`) into the same shell block as `git` commands, so an agent running it under `set -e` aborted mid-archive at `task_state_set` (exit 127, command not found) and had to recover manually on every finalize touching `docs/tasks/state.yaml`. Split the tool calls out of the shell block into clearly-labeled Pi-tool steps, and kept the `git` archive/merge sequence in its own `set -e`-safe shell block. Added a regression assertion in `tests/skills.test.ts` that the Step 7 `git merge --no-ff` block no longer contains Pi tool calls; full devenv suite passes 324/324 (pre-existing integration-harness failure excluded).

## 2026-08-26 — Build the codebase architecture improvement survey (build-improve-architecture-skill)
Added the read-only architecture scout and `/improve-codebase-architecture` survey with vendored offline HTML reporting, candidate selection, optional grilling, ADR awareness, and Wayfinder handoff. Full devenv test suite passes 339/339.

## 2026-08-26 — Build the domain-modeling reference skill (build-domain-modeling-skill)
Added and registered a Pi-native `/domain-modeling` skill covering concepts, relationships, invariants, ownership, terminology, and lifecycle/state modeling. Added structure and cross-reference coverage; the full devenv test suite passes 321/321.

## 2026-08-26 — Build the reusable grilling reference skill (build-grilling-skill)
Added and registered a Pi-native `/grilling` skill based on Matt Pocock's canonical design-tree and round/frontier template, adapted for Pi interaction and Wayfinder handoffs. Added protocol structure coverage; the full devenv test suite passes 315/315.

## 2026-08-26 — Build the codebase-design reference skill (build-codebase-design-skill)
Added and registered a Pi-native `/codebase-design` skill covering architecture exploration, boundaries, dependencies, reuse, and deletion-test reasoning. Added structure and cross-reference coverage; the full devenv test suite passes 308/308.

## 2026-08-26 — Fix integration harness AuthStorage API compatibility (fix-integration-harness-auth-storage)
Updated the integration harness to use the installed Pi API's `ModelRuntime` with in-memory credentials. The focused integration tests and full devenv suite now pass: 302/302. Closed and archived the follow-up bug report.

## 2026-08-26 — Add human-owned implementation mode with read-only verification (build-human-implementation-mode)
Added permissive human/manual routing for feature and bug workflows, collaborative planning and consent gates, read-only verifier-first checks, approval-gated landing, and collaborative refactoring guidance. Added a reproducible devenv shell; targeted structure tests reached 139/139. Full integration verification remains blocked by the pre-existing AuthStorage API mismatch, tracked in `fix-integration-harness-auth-storage`.

## 2026-08-26 — Complete the human-implementation-mode map
The initiative is complete: feature and bug implementation now support permissive human/manual routing, collaborative planning gates, read-only fast-fail verification, approval-gated landing, and collaborative refactoring. A devenv shell provides the test environment, and the remaining Pi `AuthStorage` harness incompatibility is tracked as `fix-integration-harness-auth-storage`.

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
