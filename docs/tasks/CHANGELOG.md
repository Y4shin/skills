---
type: changelog
title: Task Changelog
---
# Task Changelog

# task-workflow

## 3.0.0

### Major Changes

- a4db0a0: Largely adopt Matt Pocock's skills repo way (v2.10.0 to v3.0.0).

  Reorganized skills into engineering/productivity/misc/in-progress/deprecated
  buckets with promotion rules. Retired report-bug (into deprecated/) and
  dropped grilling-with-ui (+ its CLI/UI scripts and eval harness). Added 12
  skills adapted from Matt: prototype, research, resolving-merge-conflicts,
  wizard, handoff, to-questionnaire, teach, writing-for-agents, triage,
  grill-me, to-spec, to-tickets. Rewired implement-task to dispatch to utility
  skills and borrowed implement-spec graph/concurrency language. Scaffolded
  repo-root CONTEXT.md, docs/adr/, AGENTS.md, docs/agents/, and
  docs/tasks/out-of-scope/. Reshaped wayfinder to decisions-only (strict
  two-phase: wayfinder produces planning decisions, to-spec/to-tickets create
  implementation tasks). Rewrote task-overview to ask-matt-style intent router
  with phase-boundary guidance. Re-aligned grilling, code-review, tdd, and
  domain-modeling to Matt's current text. Adopted changesets versioning
  (integrated into release.sh). Enforced no-em-dashes prose rule repo-wide.
  Bumped schema_version to 3.

### Minor Changes

- 6454ce7: Add the multi-criterion skill-reviewer (agents/skill-reviewer.md) + the
  skill-review skill, wired into skill-creator phase 7. Adds a 'Cut meta-level
  narrative' core principle. 28 promoted skills.
## 2026-10-01, Eval-stack research and the hermetic isolation spike (pi-harness-evals)
Closed the eval-planning effort whose deliverable was the decision-complete plan for the eval-creator build. eval-stack-research captured the verified Inspect/pi API facts (task anatomy, custom scorers running commands and reading files, model_graded, headless modes, resource-narrowing flags, custom providers via models.json) into a durable findings file; pi-headless-isolation-spike proved hermetic headless pi runs (temp agent dir seeded with only auth/models/a packages-stripped settings, full disable flags, explicit re-adding via --skill and -e, a canary extension proving the loaded set, planted leaks detected) and committed the runner recipe in its findings, which the v4 overhaul's eval-review skill distilled into its isolation checklist. The map's decision set (the full headless session as eval subject, own-auth + local runner, user-invoked eval-creator, suite location and override rules) is synthesized into the live build-eval-creator-skill spec, which stays live as the handoff for the future build; the eval-review companion skill itself shipped earlier. Map and both tasks archived, spec given conformant frontmatter so the scan tools see it.

## 2026-10-01, Backfill human-facing docs pages for promoted skills (backfill-skill-docs-pages)
Created the 27 missing human-facing docs pages for the promoted skills (29 total with the verified `eval-review` and `handoff` pages), each carrying the four sections (`What it does`, `When to reach for it`, `Common questions`, `It's working if`) and v4-true content for the seven overhaul-changed flow skills plus setup-workflow, code-review, and tdd. Five structure-test seams in `tests/skills.test.ts` pin page presence (derived from `package.json` `pi.skills`, never a hardcoded list), section order, no pages for non-promoted buckets, surviving tools only, and the v4 effort path. The advisory two-axis review drove one coherence pass: the implement-task page's chain wording fixed (slice-verifier and deviation-reporter run in parallel behind an ok-gate), the tdd page gained the standards direct reads, and a stale session.test.ts count in docs/testing.md corrected; a major changeset now covers the overhaul's package surface changes. 1 slice, 733 tests green, typecheck clean.

## 2026-09-29, Execution-side skills to v4 (overhaul-execution-skills)
Rewrote the execution side for the v4 tree: implement-task routes on `subtype` from frontmatter (type fallback, feature default), hard-refuses autonomous dispatch for `mode: human` tickets handing back the re-invocation, and runs per-ticket chains over the effort frontier (effort-root frontmattered arch spec, size-keyed workflow budgets defaulting m, splits registered as sub-tickets that supersede the original via deprecated plus done). finalize-task now owns the `workflow_state: done` marking (set tool, then `tw_finalizable` verification), clears the pointers, does no per-ticket move, and when the effort finalizes archives it as a unit with deprecated marking and root-index regeneration; the impeccable-note check and every ui-noter dispatch are gone. Standards are read directly (AGENTS.md, CONTEXT.md, docs/standards.md, docs/testing.md) with `get_guidelines` and `ui-noter` gone from every skill and agent, so overhaul-dead-surface stays a pure deletion. The whole-effort review drove one coherence pass: both pipelines' chain pseudocode rebased onto the real workflowScript API (keyed awaited `runs.run`, `outputReference` pointers), finalize's effort self-merge removed, and the stale one-liners (bucket README, router) re-synced. 1 slice, 767 tests green, typecheck clean.

## 2026-09-29, Planning-side skills to v4 (overhaul-planning-skills)
Rewrote the five planning-side skills for the v4 tree so producers write conformant artifacts by construction: wayfinder maps and decision tasks (v4 frontmatter, no kind/slug/map/tasks fields, state pointers set on create and resume, the root index regenerated on map creation, the four planning resources re-templated and feature/bug planning deleted in favor of `/skill:to-tickets`), to-spec writing a frontmattered effort-root `spec.md` (draft, stable on approval), to-tickets writing v4 `ticket.md` files with no `slices:` field and an honest by-hand contract (the directory is the registration), the doctor's new OKF conformance symptom with detection and per-producer routing, and the router telling the v4 story. The `tw_list` v4 rework (a gap no ticket owned, folded in by user decision) rebuilt the tool on the scan layer with `effort`/`workflow_state` filters and `effortGroupOf` exported from the graph module. A template-conformance seam runs every prose frontmatter template through the repo's own parse/conformance engine, so producer prose cannot drift from the engine's rules. The docs-page deferral is tracked as `backfill-skill-docs-pages` on the map. 1 slice, 716 tests green, typecheck clean, whole-task review OK with notes (the one P1 em-dash and test smells fixed in the landing).

## 2026-09-18, Rename the tool family to the tw_ prefix (overhaul-tw-rename)
Renamed all 17 registered tool identifiers from the `task_` prefix to `tw_` in one mechanical pass: `src/pi.ts` registrations and label derivation, the seven skills that name tools, the four test files, and every living doc (`README.md`, `CONTEXT.md`, `docs/testing.md`, `docs/migration-target.yaml`, `rewrite-plan.md`, the live `docs/tasks/` tree). The soon-to-die tools renamed with the family so `overhaul-dead-surface` stays a pure no-references-remain deletion. A new corpus assertion in `tests/skills.test.ts` walks the package and fails on any old-prefix reference outside an explicit historical-record exemption set, guarding the wildcard form too, which makes the acceptance grep non-regressable. Two sweep defects found at verification (the arch-spec's own rename table and dated changelog entries eaten by the sweep) were fixed by restoring the records and defining the exemption class up front. 1 slice, 667 tests green, typecheck clean, prefix-only diff on every touched line.

## 2026-09-18, Scan-based graph tools and an honest schema reference (overhaul-graph-tools)
Rebuilt the graph tools on directory scans of each artifact's own frontmatter: `src/core/graph.ts` computes frontiers, per-kind dependency levels (task chains and ticket chains independently), and finalizability from the new `EffortGraph`, with the spec-plus-zero-tickets rule killing the false-finalizable class and every anomaly class (orphan, missing `blocked_by` target, invalid status pair, deprecated-as-done) reported instead of silently dropped. `task_finalizable` is now status-based (`workflow_state: done`, with a v3 fallback to legacy `status: done` so the unmigrated live tree keeps finalizing), and the `task_context` schema reference was rewritten in full for v4: the two-phase flow including ticket generation, every artifact type with its fields, the conformance rules, `mode` and `size`, no slice block, no killed fields. The scan-based path also retires the archived-done-child frontier bug: children resolved from disk, never from the map array, so archived done children keep their dependents unblocked. A whole-task review drove one coherence pass: schema-invalid fixture pairs replaced, the deprecated set now reported by every graph tool (not only the frontier), and the task/arch-spec records re-synced with the landed code. 1 slice, 664 tests green, typecheck clean.

## 2026-09-17, One v4 migration from any vintage, plus setup-workflow v4 (overhaul-v4-migration)
Added the single migration that takes a repo's `docs/tasks/` tree from any vintage (fresh, unversioned, v1 nested state, v2, v3, flat, maps-subtree, archived) to the v4 effort-grouped OKF bundle. It is a tested unit (`src/core/migrate.ts`) that imports the real v4 model rather than re-encoding the layout tables, with every filesystem operation behind a `TreePort` so failure injection and in-memory fixtures are possible; `setup-workflow` invokes it through a CLI shim and now keys its fresh/migrate/no-op detection on `schema_version: 4`. The non-negotiables are real, not promised: every staged rewrite is YAML-verified before a byte lands, `commit()` snapshots every touched path into an undo journal and restores it on any failure (files and directories), a second run is a no-op, and an interrupted run resumes. Two whole-task reviews drove two coherence passes that fixed defects the chain's own tests missed: corruption safety was proven only for the in-memory test double while the production port had no undo at all (reproduced with a real EACCES failure on a fixture, never on live data), idempotence broke whenever the tree held a vendored clone, one source could be staged to two destinations so the vendored relocation silently no-opped, and the vendored rule was name-based and could relocate a user's own notes. 1 slice, 616 tests green.

## 2026-09-17, v4 artifact model: dual-shape frontmatter parsing and resolution (overhaul-artifact-model)
Added the version 4 artifact model and a scan-based resolver that reads both tree shapes. `Artifact` now carries the OKF `type`, the workflow `subtype`, `status` with its companion `workflow_state`, `mode`, `size`, and a `shape` marker; the old `kind` field is gone, and a v3 file's `kind`/`type` map onto `type`/`subtype` so old artifacts keep parsing. `validateCombination` enforces the allowed status pairs (draft only with todo, deprecated only with done, stable with any), and `findAnomalies` surfaces invalid combinations, orphans, and missing `blocked_by` targets as data for the graph tools. The resolver honors the wanted type on every branch, fixing the audited bug where a wanted kind was ignored on the slug branch and a map lookup could return a task; it also resolves spec-only and arch-spec-only effort directories, aux files, and both the live and archived layouts. Two whole-task reviews drove two coherence passes: the orphan check now catches both type/location mismatch directions, effort scoping is shape-aware (v3 by frontmatter `map:`, v4 by effort directory, maps as their own scope so real feature-to-feature edges are not false positives), and the layout tables are unified in one model constant. 1 slice, 537 tests green, live-tree anomaly stream at zero over 118 artifacts.

## 2026-09-17, State module v4: lossless round-trip, real nulls, map and task pointers (overhaul-state-module)
Moved `docs/tasks/state.yaml` to the v4 contract: `WorkflowState` is now `{ map, task, rest }`, where `rest` is the lossless bag of every key the module does not model, so `schema_version`, a legacy `slice` key, and a v1 `active` block survive every read-modify-write verbatim. This kills the demonstrated live bug where `task_state_set` silently deleted the `schema_version` key `setup-workflow` keys its migration detection on. `task_state_set` accepts exactly `map` and `task` (anything else is rejected with an error naming both), `task_state` shows both pointers, nulls serialize as real YAML null instead of the string `"None"`, and the module never stamps `schema_version` (the migration owns the 3-to-4 flip). 1 slice, 471 tests green, typecheck clean.

## 2026-09-03, Largely adopt Matt Pocock's skills repo way (adopt-mp-skills-way)

Reorganized skills into engineering/productivity/misc/in-progress/deprecated buckets with promotion rules; adopted Matt's strict two-phase planning (wayfinder = decisions only -> to-spec -> to-tickets -> implement-task); added 12 skills (prototype, research, resolving-merge-conflicts, wizard, handoff, to-questionnaire, teach, writing-for-agents, triage, grill-me, to-spec, to-tickets); retired report-bug + grilling-with-ui; re-aligned grilling/code-review/tdd/domain-modeling to Matt's current; rewired implement-task with implement-spec graph/concurrency language; scaffolded repo-root AGENTS.md + CONTEXT.md + docs/adr/ + docs/agents/ + docs/tasks/out-of-scope/; integrated changesets into release.sh; no-em-dashes sweep; built the reusable setup-workflow migration skill + upgrade-2-to-3 resource + docs/migration-target.yaml distilled from the proven run. 434 tests green, schema_version 3.

## 2026-09-03, Complete the compare-to-mp-skills map
The initiative is complete: this repo's workflow is now a fusion of mp-skills' breadth/composability and our automation depth/structural enforcement, delivered across 13 tasks. New model-invoked skills shipped: `/tdd` (test-quality reference + companion `tests.md`/`mocking.md`), `/code-review` (two-axis review), `/codebase-design` (architecture mapping), `/domain-modeling` (concept/invariant modeling), `/grilling` (Matt Pocock's canonical design-tree protocol, text + visualizer variants), `/improve-codebase-architecture` (read-only scout + offline HTML report with vendored Tailwind/Mermaid), `/diagnosing-bugs` (6-phase debugging), and `/task-workflow-doctor` (workflow diagnosis). The tdd-worker was narrowed to RED→GREEN with refactor moved to implement-task Step 3; the four sub-agents + telemetry + task-type system + dependency graph were preserved. Deferred by design (open fog, not silently dropped): the remaining utility skills (`wait-what` exists; `to-questionnaire`/`teach`/`wizard`/`resolving-merge-conflicts`/`handoff`), a low-priority `bug_list`/`bug_queue` tool, and auto-generation of human-facing docs. Wayfinder resume confirmed no new work sprang up.

## 2026-09-03, Complete the portable-skill-authoring map
The initiative is complete: a reusable `skill-creator` Agent Skill ships in this `task-workflow` Pi package, authored through a 4-task graph (support-script grilling → bundle-template prototype → build the skill → fold the templates in). `skill-creator` is spec-pure (frontmatter `name`+`description` only), capability-conditional (not brand-conditional), and carries a Node/TS helper-script trio (`validate_skill` with the `compatibility` bug-fix, `scaffold_skill`, `discover_skill`, each with by-hand fallbacks) + 6 one-level-deep references, including per-language support-script files with the verified, copy-pasteable bundle templates (Python `zipapp`, JS/TS esbuild with the `createRequire` namespace-alias banner) and the verified 17-slot default-stack tables (all picks pass at the Python 3.10 / Node 20 LTS floor). Registered in `package.json` (`pi.skills` →17) + `tests/skills.test.ts` + `tests/skill-creator-scripts.test.ts` (22 cases); dogfood + official `skills-ref` v0.1.5 both pass; 602/602 tests green across the two feature tasks.

## 2026-09-03, Fold the bundle templates + verified stack into the support-script references (fold-bundle-templates-into-refs)
Folded the concrete bundle templates + verified 17-slot default-stack tables from the `bundle-script-template` prototype into `skills/skill-creator/references/support-scripts-python.md` (the `zipapp`/stdlib 3-step build sequence + Python stack table) and `support-scripts-js-ts.md` (the esbuild programmatic-API build with the conditional `createRequire` namespace-alias banner + JS/TS stack table + three API gotchas: `diff_match_patch` lowercase class, `tinyexec` `exec`/`x` not `execa`, the createRequire collision + namespace-alias fix). Resolved the stale "template comes later" pointer in the shared `support-scripts.md` to point at the per-language files. The floor stays Python 3.10 / Node 20 LTS (a minimum-compatibility target, not a recommendation); no library re-pick (all 17 pass at the floor). This completes the `portable-skill-authoring` map: the `skill-creator` skill now carries verified, copy-pasteable bundle templates + the verified default stack. 1 slice, 602/602 green.

## 2026-09-03, Build the skill-creator Agent Skill (build-skill-creator-skill)
Added `skill-creator`, a reusable Agent Skill that helps an agent create, review, update, and make-portable other Agent Skills. Spec-pure frontmatter (only `name`+`description`); capability-conditional model (filesystem/bash-exec/network-MCP/harness-extensions) keyed on target-agent capabilities, not brands; 8-phase authoring workflow; produced-skill frontmatter guidance; a Node/TS helper-script trio (`validate_skill`/`scaffold_skill`/`discover_skill`, each with a by-hand fallback) with a bug-fix over sentient-agi's validator (accepts the spec-allowed `compatibility` field); 6 one-level-deep references (live-spec digest, Pi-target, shared + per-language support-script backbone seeded from the `support-script-conventions` grilling Q1–Q7). Registered in `package.json` (`pi.skills` →17) + `tests/skills.test.ts`; 22 vitest cases for the scripts; dogfood + official `skills-ref` v0.1.5 both pass; 602/602 tests green. The concrete bundle templates are deliberately deferred to the `fold-bundle-templates-into-refs` follow-up (blocked on this task). 6 slices, zero deviations across all deviation reports.

## 2026-08-28, Complete the grilling-visualizer map
The initiative is complete: a detached grilling CLI + inlined Svelte SPA renders a live design-tree graph (rounds, 5-word-id nodes, dependency/contradiction/reference edges, summary sidebar, per-round answers), with a hidden temp-dir state file, CLI-enforced 7-state machine, and xdg-open auto-open across 3 platforms. The grilling skill + wayfinder resource drive it end-to-end, and an eval harness confirmed the full 11-command `update` surface (6 bootstrap + 5 discovered: answer, set-deps, accept, reject, stop). 5 slices landed; 566 tests green; typecheck clean.

## 2026-08-28, Grilling visualizer: detached CLI + browser SPA + skill rewire + eval (build-grilling-visualizer)
Built a detached grilling CLI (`skills/grilling/grilling-cli.mjs`) that drives a persistent local HTTP server serving an inlined Svelte 5 SPA, a live graph of the design tree (rows=rounds, 5-word-id nodes, black/red/gray dependency/contradiction/reference edges, upcoming section, summary sidebar, per-round answer inputs), with a hidden random temp-dir state file, the 7-state machine enforced in the CLI, and xdg-open auto-open across 3 platforms. Rewired the grilling SKILL.md + wayfinder resource to drive it end-to-end. An eval harness (3 synthetic scenarios, non-interactive pi, `GRILLING_EVAL=1` eval mode, 2-clean-in-a-row iteration) discovered 5 missing `update` commands (answer, set-deps, accept, reject, stop) beyond the 6 bootstrap, folded into the CLI + skill; all 3 scenarios converge 2-clean-in-a-row, confirming the 11-command surface is complete. A `/impeccable typeset` pass established base type roles on the SPA shell. 5 slices, 566 tests green, typecheck clean.

## 2026-08-27, Fix finalize-task Step 7 set -e tool/binary confusion (finalize-task-set-e-tool-confusion)
`finalize-task` Step 7 mixed Pi tool calls (`task_map_tick`, `task_state_set`) into the same shell block as `git` commands, so an agent running it under `set -e` aborted mid-archive at `task_state_set` (exit 127, command not found) and had to recover manually on every finalize touching `docs/tasks/state.yaml`. Split the tool calls out of the shell block into clearly-labeled Pi-tool steps, and kept the `git` archive/merge sequence in its own `set -e`-safe shell block. Added a regression assertion in `tests/skills.test.ts` that the Step 7 `git merge --no-ff` block no longer contains Pi tool calls; full devenv suite passes 324/324 (pre-existing integration-harness failure excluded).

## 2026-08-26, Build the codebase architecture improvement survey (build-improve-architecture-skill)
Added the read-only architecture scout and `/improve-codebase-architecture` survey with vendored offline HTML reporting, candidate selection, optional grilling, ADR awareness, and Wayfinder handoff. Full devenv test suite passes 339/339.

## 2026-08-26, Build the domain-modeling reference skill (build-domain-modeling-skill)
Added and registered a Pi-native `/domain-modeling` skill covering concepts, relationships, invariants, ownership, terminology, and lifecycle/state modeling. Added structure and cross-reference coverage; the full devenv test suite passes 321/321.

## 2026-08-26, Build the reusable grilling reference skill (build-grilling-skill)
Added and registered a Pi-native `/grilling` skill based on Matt Pocock's canonical design-tree and round/frontier template, adapted for Pi interaction and Wayfinder handoffs. Added protocol structure coverage; the full devenv test suite passes 315/315.

## 2026-08-26, Build the codebase-design reference skill (build-codebase-design-skill)
Added and registered a Pi-native `/codebase-design` skill covering architecture exploration, boundaries, dependencies, reuse, and deletion-test reasoning. Added structure and cross-reference coverage; the full devenv test suite passes 308/308.

## 2026-08-26, Fix integration harness AuthStorage API compatibility (fix-integration-harness-auth-storage)
Updated the integration harness to use the installed Pi API's `ModelRuntime` with in-memory credentials. The focused integration tests and full devenv suite now pass: 302/302. Closed and archived the follow-up bug report.

## 2026-08-26, Add human-owned implementation mode with read-only verification (build-human-implementation-mode)
Added permissive human/manual routing for feature and bug workflows, collaborative planning and consent gates, read-only verifier-first checks, approval-gated landing, and collaborative refactoring guidance. Added a reproducible devenv shell; targeted structure tests reached 139/139. Full integration verification remains blocked by the pre-existing AuthStorage API mismatch, tracked in `fix-integration-harness-auth-storage`.

## 2026-08-26, Complete the human-implementation-mode map
The initiative is complete: feature and bug implementation now support permissive human/manual routing, collaborative planning gates, read-only fast-fail verification, approval-gated landing, and collaborative refactoring. A devenv shell provides the test environment, and the remaining Pi `AuthStorage` harness incompatibility is tracked as `fix-integration-harness-auth-storage`.

## 2026-08-25, Build the /diagnosing-bugs skill and wire it into the bug pipeline (build-diagnosing-bugs-skill)
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

## 2026-08-25, Build the task-workflow-doctor skill (build-task-workflow-doctor-skill)
Added a model-invoked `task-workflow-doctor` skill that diagnoses common
task-workflow issues (missing `docs/tasks/` tree, `state.yaml`, `docs/bugs/`,
`docs/dev-env.md`, `docs/testing.md`, `CONTEXT.md`, `docs/adr/`, or a
misconfigured `package.json` manifest) and routes to the owning skill:
primarily `/skill:onboard-workflow`, rather than auto-fixing. Backed by 8
per-issue resource files and a symptom→artifact→route table; the not-a-fixer
contract (`diagnoses` + `routes` + `onboard-workflow` reference) is locked by
xref assertions in `tests/skills.test.ts`. Registered in `package.json`
`pi.skills` (length 8→9); 106/106 structure tests green.

## 2026-08-24, Build the /code-review skill, code-reviewer agent, and get_guidelines extension (build-code-review-skill)
Added a model-invoked `/code-review` skill (two-axis: Standards + Spec) with
the 12-smell Fowler baseline as a companion doc, plus a `code-reviewer` fanout
agent that spawns parallel read-only Standards and Spec reviewers and
aggregates side by side (never merged, no single winner). Extended our own
`get_guidelines` tool to discover repo-root standards files
(`AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/standards.md`) and surface the
smell baseline as a floor when no repo standards match. Wired the review into
implement-task's feature path (before Step 3 coherence refactor) and bug path
(after the single chain), advisory, feeds findings to the refactor, does not
gate. Refactor home stays at implement-task Step 3. 105/105 structure+guidelines
tests green; 16 pre-existing session.test.ts failures reproduce on main.

## 2026-08-24, Build the /tdd reference skill and wire it into the TDD pipeline (build-tdd-reference-skill)
Added a model-invoked `/tdd` reference skill (`SKILL.md` + `tests.md` +
`mocking.md`) defining test quality, what a good test is, seams, anti-patterns,
loop rules, alongside the existing `tdd-worker` agent. The agent loop
narrowed to RED→GREEN; refactoring moved to implement-task's Step 3 coherence
pass. Seams are agreed in the arch spec (features) or the repro (bugs). The
skill is delivered to the fresh-context worker via the `skill:` subagent param.
The slice-verifier stays pass/fail; test-quality-in-review is deferred to the
`code-review-evaluation` sibling. First skill in this repo with companion
reference docs. 89/89 structure tests green; 16 pre-existing session.test.ts
failures reproduce on main and are unrelated.

## 2026-07-30, Bug workflow (report, track, fix) (bug-workflow)
Added a bug path to the workflow: new `report-bug` skill (en-bloc capture,
dev-env.md-governed reproduction into repro.md, trivial spot-fix or
promotion to a `type: bug` task), implement-task split into a
type-dispatching wrapper with `resources/feature.md` + lean
`resources/bug.md`, finalize-task bug closure, and onboarding/routing
support. Both implement-task resources gained the failure toolbelt
(split-first, retry-bigger, escalate; parent never implements). 171/171
tests green.

## 2026-08-24, Gate task-workflow resources by repo (gate-skills-by-repo)
Auto-disable all task-workflow resources (task_* + notify_user + guidelines
tools, before_agent_start injection, skill auto-advertising, and explicit
/skill:<name>) in work repos based on the git origin remote, with zero
per-repo config. Global `taskWorkflow.disableOnRepo` regex list + per-project
`taskWorkflow.enable` override; detection in a new pure `src/core/repo-gate.ts`
module. One known limitation: the six skills still show on /help in a work
repo (pi 0.80.10 has no subtractive hook); explicit /skill: is blocked via the
input event instead. 227/227 tests green (pre-existing integration-harness
failure unrelated).
