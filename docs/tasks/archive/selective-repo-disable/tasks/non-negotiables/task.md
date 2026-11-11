---
type: task
subtype: grilling
title: Grill the effort's non-goals and non-negotiable facts
status: deprecated
workflow_state: done
blocked_by: []
---

## Decision to settle

The effort's non-goals and non-negotiable facts, including the effort-level success test.

## Raw request (verbatim)

"I want to loosen the repo disable feature. Right now I think with some `.pi/settings.json` value or some git remote prefix matching we figure out which repos are 'work repos' or whatever and disable this package in there. The issue is, that what I want to disable is not *literally everyting*, but only the parts that encode my task workflow. The parts that are more generic (i.e. skill-creator, or operator-communication or similar skills and perhaps some tools/extension stuff (especially the stuff needed for the more generic skills)) should not really be disabled there, as I want to use that there too."

## Destination (user's words)

Only the parts that encode the task workflow shut off in a work repo; the generic parts (skill-creator, operator-communication and similar, plus the tools/extension stuff the generic skills need) stay available.

## Actor

The package author/operator, who runs pi inside both personal repos and organisation-work repos with this global package installed.

## Classification

Feature.

## Stories

- As the operator working in a work repo, I want the task-workflow resources (the workflow skills, the `tw_*` tools, the docs/tasks write lockdown) to stay gated, so that the work repo's own canon is not disturbed and no tools write into a `docs/tasks/` tree there.
- As the operator working in a work repo, I want the generic skills (skill-creator, operator-communication, and similar) to load and work there, so that I keep their value outside the task workflow.
- As the operator, I want the tools and extension pieces the generic skills depend on (for example whatever of `tw_open`/`tw_close` skill-creator uses) to survive the gate too, so that a "kept" skill is not kept in name only while its tools are gone.
- As the operator, I want the gate's existing configuration (global `disableOnRepo` patterns and per-repo `taskWorkflow.enable` override) to keep working with the new, narrower meaning of "off", so that my existing setup continues to decide repos without new config.

## Constraints

- Boundary answer from the user: roughly "only workflow shuts off" in a work repo. The exact keep-set needs a deeper dive, per the user's note: skill-creator may use `tw_open`/`tw_close`, so the grilling and planning must inventory what each generic skill actually requires and decide which tools/extension parts stay available.
- The docs/tasks write lockdown stays tied to the task workflow: when the task workflow is disabled in a repo, the lockdown is disabled there too (it is a task-workflow thing, per the user).
- Facts from the intake code reach (verified in this repo, read-only): the gate is documented in `docs/repo-gating.md` and implemented in `src/pi.ts` via `resolveGate` (`src/core/repo-gate.js`). When the gate is active, the extension registers no `tw_*` tools nor `notify_user`; the package's skills are stripped from the system prompt's `<available_skills>`; explicit `/skill:<name>` is blocked via an `input` handler for the names in `GATED_SKILL_NAMES`. `loadGatedSkillNames()` currently maps ALL `package.json pi.skills` basenames (the shipped set, which includes the generic skills) into `GATED_SKILL_NAMES`, with a hardcoded fallback list of the 8 workflow skills (task-workflow-overview, setup-workflow, intake, wayfinder, to-spec, to-tickets, implement-ticket, finalize-effort). The config contract: global `~/.pi/agent/settings.json` `taskWorkflow.disableOnRepo` regex list against `provider/org/repo`, per-repo `.pi/settings.json` `taskWorkflow.enable` boolean override, truth table in docs/repo-gating.md. Known pi limitation (documented): there is no hook to hide skills from `/help`; `resources_discover` is additive-only, so gated skills still appear on `/help` today.
- Related live efforts: `architecture-tracking` (the gate and lockdown are ADR-level architecture this effort changes; the tracking effort likely wants a new unit/task or an update). `bash-tail-preview-fix` (separate, new; the docs/adr and docs/repo-gating.md updates belong here).
- No repo structural changes through intake: as with the prior effort, repo ci/history commits are signed and happen after planning.

## Code reach report

Looked at `docs/repo-gating.md` (gate contract and truth table), `src/pi.ts` (GATED_SKILL_NAMES assembly and `/skill:` invocation block), and `package.json` (`pi.skills` shipped set). Confirmed the current behaviour gates the entire shipped skill set and all tools, not just the workflow-8; no existing effort covers loosening it.

## Notes

Settled in one round (Q1-Q4) plus follow-up round (Q5).

**Q1 gate set:** the workflow family that shuts off in a work repo is the full set of 10 workflow-adjacent skills. Superseded by Q5: the final gated set is 9 of the 10.

**Q2 tools:** passive set only. Most `tw_*` tools stay disabled in a work repo, but `tw_open`/`tw_close` (and anything else surviving skills genuinely use, e.g. skill-creator's nested-phase clause) may stay registered with restricted parameters rather than removed (e.g. only certain skill names openable, no workflow phases). This requires a dedicated inventory of tool usage across every non-disabled skill; new research task.

**Q3 notify_user:** stays available in gated repos; it is generic and not workflow-bound.

**Q4 success test:** accepted as proposed with the caveat that "zero tw_* tools" is softened pending the inventory: the mutating/workflow tools are gone, the exactly-justified passive remainder may stay. The user's words: "zero tw_* tools is something that is yet to be seen, but by in large that is correct."

**Q5 dangling workflow-failure rule:** workflow-failure is kept generic (not gated). It is meta-escalation over precisely the tooling that can still refuse through the passive set, and it resolves the generic-skills' header rule without rewriting ~15 skill headers.

Rejected options: gate only the 8 phase skills (leaves overview/doctor/failure pointing at an unloaded workflow); gate all 10 and accept the dangling header or mass header rewording; register no `tw_*` tools at all (superseded by the passive-set answer); drop gating entirely (intake boundary answer).

Dependent-task implications: the new research task must (a) enumerate every `tw_*` and tool reference in all non-gated skills and resources, (b) recommend the passive set plus per-tool parameter restrictions for gated repos, (c) answer where the gated-skill list lives (static manifest vs derived partition of package.json pi.skills).
