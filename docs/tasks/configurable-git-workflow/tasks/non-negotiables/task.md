---
type: task
subtype: grilling
title: "Settle the non-negotiables: the default git workflow, its configuration home, and the wiring surface"
status: stable
workflow_state: ready
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
