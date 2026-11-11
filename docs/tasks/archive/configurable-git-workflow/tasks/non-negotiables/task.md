---
type: task
subtype: grilling
title: "Settle the non-negotiables: the default git workflow, its configuration home, and the wiring surface"
status: deprecated
workflow_state: done
blocked_by: []
---

## Decision to settle

The effort's non-goals and non-negotiable facts, including the effort-level success test. Two intake questions were explicitly deferred to this grilling:

1. **The default model**: when a repo configures nothing, what git workflow applies? (Today's model verbatim: landing branches chained off the previous ticket's landing branch, ticket working branches, no-fast-forward merges, push when a remote exists. Or a fresh default with today's model as one selectable profile. The user chose "let the grilling decide".)
2. **The configuration home**: where does the git-workflow configuration live? The user leans towards the existing `taskWorkflow.*` block in `.pi/settings.json` (where repo classification already lives) but does not want to commit to it yet.

Committed by the user during intake:

- **Wiring scope**: everything that runs git follows the configured workflow: the orchestration skills' prose, the chain script's gate commands, and the worker agents (implementation, landing, deviation). A config the workers ignore would be theatre.
- **Constraint**: backward compatible. Repos with no configuration see no change; the mechanism is purely additive.

## Raw request (verbatim)

"I want to create an effort that does the following: It defines an git workflow for the task workflow in this package in the wayfinder session. The intended end result would be for there to be a mechanism wherein a default git workflow is defined for all repos using the task workflow skills and that the skills are then wired up to follow that workflow. And it should not be hardcoded into the skills, but rather be easily configurable."

## Destination (one line, the user's words)

A mechanism wherein a default git workflow is defined for all repos using the task-workflow skills, and the skills are wired up to follow that workflow; not hardcoded into the skills, but easily configurable.

## Actor

Repos and teams using the task-workflow package: the operator directly, and downstream users of `@y4shin/pi-task-workflow` in their own repositories.

## Classification

Feature. Nothing is broken; the current hardcoded branch model works, it is just not configurable.

## Stories

1. As the operator of a repo using the task workflow, I want the git workflow (branch naming, merge strategy, push policy) to come from one explicit configuration, so that the workflow's git behaviour matches my conventions instead of the package's hardcoded habits.
2. As the operator of a repo that configures nothing, I want a sensible default git workflow to apply, so that the task workflow works out of the box. (The default's shape is open; this grilling settles it.)
3. As the operator, I want every part of the workflow that runs git, from the orchestration skills' prose through the chain script's gates to the worker agents, to follow the configured workflow, so that no step silently reverts to the hardcoded branch model.
4. As the operator with a nonstandard setup (no remote, unusual branch names, a required merge discipline), I want to change the git workflow without forking the skills, so that the package stays usable in my environment.
5. As the maintainer of the package, I want the branch model in one configurable place instead of five hardcoded files, so that a workflow change is one change, not a sweep.

## Constraints

- Backward compatible: repos with no configuration see no change.
- Wiring scope: everything that runs git.
- Configuration home: undecided (lean: the `taskWorkflow.*` block in `.pi/settings.json`; not committed).

## Known facts from intake's bounded code reach

Where the branch model is currently hardcoded (the package at `@y4shin/pi-task-workflow` 5.4.0):

- `skills/engineering/implement-ticket/SKILL.md`: the branch-model section (landing branch `task/<ticket-slug>` chained off the previous ticket's landing branch, working branch `ticket/<ticket-slug>`, `--no-ff` merges, "If remote exists: git push"), six mentions.
- `skills/engineering/implement-ticket/scripts/ticket-chain.js`: two host gate commands asserting branch existence (`git rev-parse --verify refs/heads/ticket/<slug>` and `refs/heads/task/<slug>`), plus the tdd gate that requires the working branch to exist and the land gate that requires the landing branch.
- `agents/land-worker.md` (three mentions), `agents/tdd-worker.md`, `agents/deviation-reporter.md`: the workers' git procedures.
- `skills/engineering/finalize-effort/SKILL.md`: the archive commit shape.

Related records worth linking or absorbing:

- The implement-ticket skill itself names worktree isolation as "the follow-up effort's seed, not behaviour this skill claims"; this effort is the natural home for that seed or its explicit non-goal.
- Recent friction records from the selective-repo-disable run: the push-or-not ambiguity ("If remote exists: git push"), both land workers having to create the landing branch fresh at the merge base because no previous landing branch existed, and the chain's serial-single-tree limitation (the skill says two chains would collide because the branch model is fixed in prose). These are concrete inputs for the default-model question.
- The effort should also decide how the release flow (`docs/releasing.md`, tags as consent) interacts with a configured git workflow, so the two do not disagree about what `main` means.

## Notes

## Round 3 settled (operator's answers)

- **Guard mechanism:** guards only. No tool calls that create branches, no
  extension-performed git operations. `implement-ticket` itself creates the
  ticket branches (the landing branch and the working branch) and merges a
  finished ticket back onto the integration branch, which the operator calls
  the feature branch. The spawn guard is documented as a requirement: spawning
  any of the ticket-implementation sub-agents is blocked when the checkout is
  not on the branch that sub-agent must commit on. Where that block lives is
  an implementation detail, not a planning decision.
- **Changeset granularity:** deliberately not strict. Some efforts carry one
  changeset entry, some two. This effort (the example given) has two: support
  for a stricter git workflow, and a release pipeline built on
  `docs/releasing.md` and changesets. The intent is a rough guideline for what
  qualifies, and a finalization step that proposes the entries for human
  verification before writing them.
- **Feature branch creation point (provisional, still open):** the operator
  wants the feature branch created either at the end of `to-tickets` or
  between `to-tickets` and `implement-ticket`. This round did not settle which.
- **Integration branch identity (still open):** the operator's model assumes a
  dedicated feature branch exists for the effort. Today's model has none: the
  branch tickets land into is the starting branch (normally `main`) for the
  first ticket, and the previous ticket's landing branch thereafter. The
  conflict with the intake constraint (a repo with no configuration sees no
  change) was put back to the operator.

## Round 2 settled (operator's answers)

- **Git layer:** the values tool plus the gates. The extension resolves names
  and policies; it does not perform merges. The gates must be hard
  enforcement: "that is the whole value this package brings, that it gives us
  a workflow that is somewhat enforced through gates, rules and whatever".
- **Guard coverage:** `implement-ticket` and `finalize-effort` must be opened
  on the feature branch (the operator's term for the effort's integration
  branch). Additionally, a check at subagent spawn: the implementation
  sub-agents are launched with an identifier for the ticket they work on, and
  the extension refuses to spawn the child when the checkout is not on the
  branch that child must commit on. The operator rejected an opener-only
  guard as not precise enough to show that the workflow is enforced.
- **Changesets:** authored at effort finalization, not per landed ticket.
  Rejected: one changeset per ticket, because entries would be too fine to
  read well, and because some tickets yield no useful entry at all.
- **Release skill:** a version bump from the changesets and maintenance of a
  root `CHANGELOG.md` happen every time, as the defaults. When
  `docs/releasing.md` exists, its steps run on top of those defaults, for the
  mechanical work of preparing and staging package releases.
- **Effort boundary:** one effort. The versioning and release strand stays
  with the branch model because the two are too intertwined to separate.

## Round 1 settled (operator's answers)

- **Model set:** provisionally one model, today's chained model verbatim. The
  operator may still choose to ship several profiles: that question is held
  open deliberately and answered at the end of Wayfinder, just before spec,
  because the answer depends on how much effort a second profile costs. Until
  then the plan assumes one profile and deviations from today's model are not
  designed.
- **Configuration home:** `.pi/settings.json`, project file and the global
  `~/.pi/agent/settings.json` both supported.
- **Knob set:** the four areas are acceptable: the two branch name patterns,
  the merge flag, and the push policy. `profile` drops out while one profile
  stands.
- **Config delivery:** the resolution logic must not live in the skills.
  Either the extension performs the git branch management itself as tools, or
  it serves the resolved values (which name a branch should have, and so on)
  through tools. Guards belong in the `tw_open` core and gate entering a
  phase behind being on an appropriately named branch.
- **Scope edges:** worktree isolation and parallel chains stay out. The
  release flow comes in, as a changeset-based versioning approach: changesets
  are authored during effort finalization, turned into changelogs, and
  consumed by an optional release workflow that a repository declares in
  `docs/releasing.md`. A release skill ships with a default behaviour of
  maintaining a `CHANGELOG.md` at the repo root from the changesets, rather
  than the release flow being hard-wired into this package.

Rejected or deferred in Round 1:

- Second branch profile: deferred to the end of Wayfinder, not dropped.
- Config read by each skill as prose: rejected by the operator ("I don't want
  to build in the resolution logic into skills").
- A `CONTEXT.md` prose section as the config home: not chosen.
