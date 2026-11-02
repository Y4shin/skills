---
type: task
subtype: grilling
title: Settle non-negotiables
status: stable
workflow_state: done
blocked_by: []
---

# Decision to settle

The effort's non-goals, non-negotiable facts, and effort-level success
test, returned to the map by the end of this task.

Non-negotiables already fixed by the request and the intake round:

- Nothing workflow-related may be written into a work repo; the local
  setup exists so that state and artifacts stay outside the repo.
- No external task tracker is hardcoded; its handling is declared in the
  local state.
- Initialization is explicit: when a repo has neither setup, the
  workflow asks which one to initialize; each gets one deliberate
  initialization step (regular setup through `setup-workflow`, local
  setup through a dedicated counterpart).
- Knowledge artifacts (CONTEXT.md, ADRs, docs pages, changelog) are
  skipped in locally set-up repos, because unwatched ones go stale
  quickly; collection plus a final integration review replaces them.
- Terminology: "regularly set-up repo" (workflow files inside the repo)
  and "locally set-up repo" (workflow state outside the repo, on the
  local machine). The raw request's "non-set-up repo" framing is
  retracted: no setup at all is not feasible, a local setup is still a
  setup.
- The implementation shape stays open: how the skills serve both kinds
  of repos (variants, resources, or otherwise), where supporting material
  lives, and the exact layout and naming under the local state root are
  spec decisions. The "two variants inside each skill" from the raw
  request is a sketched possibility, not a settled one.

Open questions to grill into non-goals or settled facts:

- The exact local state root, layout, and path encoding (the raw request
  sketches `~/.pi/task-workflow/external-state/<path-relative-to-~>/`; the
  root name likely renames with the concept).
- The shape of the external task tracker declaration and what "handle"
  means (sync out, read back, or reference only).
- The shape of the prose instructions describing a repo's documentation,
  and where they live.
- Where collected documentation accumulates during a run, and what
  finalize's integration review does with it.
- Which reduced pieces of each skill survive in local setups beyond the
  core arc (for example the CI gate, changelog, subagent profiles).
- The effort-level success test.

# Raw request (verbatim)

"I want to be able to declare efforts on repos that do not have the task
workflow set up. The idea is that I have work repos, where I cannot just
dump my workflow's files and so on into, but I still want to be able to
use the parts of my workflow, that do not rely on extra infrastructure
being there (such as CONTEXT.md, the `task/docs` directory and so on) to
work there and to make it such that the core workflow of intake ->
wayfinder -> to-spec -> to-tickets -> implement -> finalize to work
there, even if it is with reduced functionality. The idea would be for
me to make the skills, which declare the workflow, to have two variants
inside of them, one for properly set-up repos and one for non-set-up
repos. The non-set-up repos, get a local directory external to the repo
(something like `~/.pi/task-workflow/external-state/<path-relative-to-~>/`
where all that stuff goes into and basically the skills know where to
look, based on whether the repo has a `docs/tasks` directory with a
`state.y(a)ml` inside it or not). It should also be able to plug into
external task tracking without hard coding anything, so I want to be able
to declare inside my local state directory, how to handle the external
task tracker."

# One-line destination (operator's words)

The core workflow arc (intake, wayfinder, to-spec, to-tickets, implement,
finalize) runs in locally set-up repos, with all workflow state living
outside the repo.

# Actor

The workflow owner (the operator), working in work repos where workflow
files must not be committed. The beneficiary is the same operator, who
keeps one workflow across all repos instead of two habits.

# Classification

Feature.

# Stories

1. **One workflow, both setups.** As the workflow owner, I want the same
   installed workflow to serve regularly set-up and locally set-up repos
   alike, so that I neither maintain a second package nor change how I
   invoke it per repo.
2. **Detect, then ask.** As the workflow owner, I want the workflow to
   tell the two apart on its own (a `docs/tasks` tree with `state.y(a)ml`
   in the repo means regular setup; a local state directory for that
   repo means local setup), and to ask me which setup to initialize when
   it finds neither, so that nothing is created without an explicit
   decision.
3. **State outside the repo.** As the workflow owner, I want all
   workflow state for a locally set-up repo to live in a per-repo
   directory on the local machine outside the repo (working path from
   the raw request:
   `~/.pi/task-workflow/external-state/<path-relative-to-~>/`), so that
   nothing workflow-related lands inside the work repo.
4. **Tracker bridge.** As the workflow owner, I want to declare in that
   local state how to handle an external task tracker, so that no
   tracker is hardcoded into the skills.
5. **Deferred documentation.** As the workflow owner, I want locally
   set-up repos to skip the repo-side knowledge artifacts (CONTEXT.md,
   ADRs, docs pages, changelog), collect what the run would normally
   document guided by prose instructions on what documentation looks
   like for that repo, and review at finalize how to integrate the
   collected material into the repo's existing documentation, so that no
   unwatched knowledge files go stale.

# Constraints

- Nothing workflow-related may be written into a work repo.
- No external task tracker is hardcoded; its handling is declared in the
  local state.
- Initialization is explicit: when a repo has neither setup, the workflow
  asks which one to initialize; each gets one deliberate initialization
  step (regular setup through `setup-workflow`, local setup through a
  dedicated counterpart).
- Knowledge artifacts are skipped in locally set-up repos because
  unwatched ones go stale quickly; collection plus a final integration
  review replaces them.
- The implementation shape stays open: how the skills serve both kinds
  of repos, where supporting material lives, and the exact layout and
  naming under the local state root are spec decisions, not intake
  decisions.

# Related prior work (link check)

- Archived `gate-skills-by-repo`: its idea doc
  (`docs/ideas/gate-skills-by-repo.md`) already proposed
  `~/.pi/task-workflow.json` for per-repo config outside the repo; the
  nearest prior art for machine-local workflow configuration.
- Archived `task-tools-overhaul`: rebuilt the `tw_*` tools whose file
  roots this effort must re-anchor for locally set-up repos.
- Archived `overhaul-state-module`: built the current workflow state
  model in `src/core/state.ts`.
- `src/core/repo-gate.ts`: the existing seam that decides whether a repo
  is set up; the detect-then-ask behavior builds on it.
- Live effort `agent-facing-workflow-docs`: shipped the agent-facing
  internals docs; they describe one setup kind and will need to cover
  the second if this lands.

# Notes from intake's code reach

- The workflow tree root is hardcoded: `TASK_ROOT = "docs/tasks"` in
  `src/core/migrate.ts`, with the state model (`src/core/state.ts`) and
  the artifact model (`src/core/art.ts`) built on it.
- No local state mode exists anywhere in the package; the only "external
  state" mentions in prose are unrelated checklist wording in
  `skills/engineering/wayfinder/resources/manual.md`.
- `~/.pi/task-workflow` does not exist on this machine today.
- `setup-workflow` (`skills/engineering/setup-workflow/SKILL.md`) is
  user-invoked and detects fresh, old, or current repos by reading
  `docs/tasks/state.yaml`'s `schema_version`; the local setup's dedicated
  counterpart will sit beside it.

## Notes

## Grilling record

Round 1:

- **Q1 Success test** - adopted with the operator's addition: the full arc runs end to end after a local initialization that lives entirely outside the repo. Rejected: the draft without the initialization clause.
- **Q2 Tracker bridge floor** - widened to a hook system: hooks declared in the local state fire at workflow milestones, notify the agent to do the declared work, and can gate continuation until the work is done. The operator's example: once the spec exists, create a plan artifact in the external tracker and put it up for review before continuing. Rejected: reference-only; one-way push.
- **Q3 Regular repos unchanged** - yes, purely additive.
- **Q4 Explicit degradation** - every skipped or degraded piece is named in the run's output with the substitute's location; silent degradation is a defect.
- **Q5 Non-goals** - all six confirmed: no second package or fork; no built-in tracker adapters; no conversion between setups; no syncing or sharing of local state; no orphan detection or repair on repo move or rename; no zero-setup mode.

Round 2:

- **Q6 Both setups detected** - refuse to work until the local setup is removed; the state is unsupported. Rejected: ask once and record the answer; the in-repo setup wins with a notice.
- **Confirmation** - the operator confirmed the shared-understanding summary (success test as revised, hook system, unchanged regular repos, explicit degradation, six non-goals, and the intake facts kept).

## Settled decisions

The record lives in the map: the success test and non-negotiable facts in `## Non-negotiable facts`, the six non-goals in `## Non-goals`, the standing constraints in `## Constraints`, and the priority consequence in `## Decisions so far`.

## Constraints and rationale

Kept from intake: nothing workflow-related in a work repo; explicit initialization with a dedicated sister skill to `setup-workflow`; deferred documentation, because unwatched knowledge artifacts go stale quickly; the terminology (regularly set-up vs locally set-up); the implementation shape stays open for the spec.

## Dependent-task implications

Three research tasks charted: survey-in-repo-assumptions (the inventory of in-repo assumptions), research-local-state-root (keying and layout of the local root), design-hook-mechanism (milestones, declaration format, gating semantics). The spec consumes all three.

## Remaining fog

The shape of the collected documentation and of finalize's integration review; whether the local initialization counterpart owns schema upgrades of existing local state.
