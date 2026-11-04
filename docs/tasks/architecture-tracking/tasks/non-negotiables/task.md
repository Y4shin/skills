---
type: task
subtype: grilling
title: Settle the architecture tracking non-negotiables
status: stable
workflow_state: ready
blocked_by: []
---

## Decision to settle

The non-goals and non-negotiable facts for the effort that implements the
repository architecture tracking proposal, including the effort-level success
test: what must be true for a reader to say this effort delivered a shared,
verifiable picture of the application's architecture across efforts.

## Raw request (verbatim)

> I want you to look at @docs/architecture-workflow-proposal.md and create an
> effort for implementing that proposal (make sure to move that md file into
> the effort directory, so it does not stay in the general docs directory).

## Destination (one line)

The proposal at `docs/tasks/architecture-tracking/proposal.md` is implemented
in this package: a repository-wide, unit-based architecture model that the
human and the agent both read and edit across efforts, wired into the existing
phases, with the two standalone architecture skills retired.

## Actor

The engineer running pi-task-workflow in a repository, who needs to verify the
picture of the system against the code, and the agent working inside the
workflow, which needs a shared model instead of re-deriving architecture per
effort.

## Classification

Feature.

## Stories

- As an engineer, I want an architecture unit map that names the
  responsibilities, boundaries, and source ownership of the system, so that I
  can check the agent's picture against the code and correct it once rather
  than in every effort.
- As an engineer, I want each effort to read the unit map during planning and
  to record which units it will touch, so that I can see how the effort changes
  the system before any code lands.
- As an engineer, I want the landed implementation compared against the unit
  map at close-out, so that the map describes what the code actually is and
  boundary violations surface as findings rather than as silent drift.
- As an agent, I want a stable, self-describing model of units, intended entry
  points, and dependency rules, so that I can place new work and reuse existing
  boundaries without a fresh survey.
- As an engineer, I want optional onboarding for the model, so that repositories
  can keep running the ordinary workflow and enable architecture tracking
  deliberately.

## Constraints (recorded, not derived)

- The proposal is a working design, not a fixed spec. Its `## Open decisions`
  section lists the questions the effort must actually settle: front matter and
  selector syntax, source roots and exclusions, CodeGraph interface quality,
  how intended entry points link to executable checks, where ticket unit
  assignments live, the refactor marker and target directory name, and the
  refactoring pressure rubric with its threshold and re-notification rule.
- Architecture tracking is opt-in per repository. A repository without a unit
  map keeps running the ordinary workflow unchanged.
- The model is language-agnostic. CodeGraph is the candidate first provider of
  extracted facts; Tree-sitter and existing architecture tests are fallbacks,
  and the provider interface stays open.
- The live unit map stays read-only during planning.
- `codebase-design` and `improve-codebase-architecture` are to be retired once
  the workflow owns their useful responsibilities, which touches the package's
  skill registration, routing, README, and docs pages.
- The package ships exactly the promoted skill set, so any skill added, retired,
  or re-homed must keep `package.json`'s `pi.skills`, both `README.md` files,
  the bucket `README.md`s, the docs pages, and `task-workflow-overview`'s map in
  sync. No em-dashes in prose.
- The proposal's open decisions are large enough that the effort probably needs
  several planning tasks (research on CodeGraph and on cross-language boundary
  checks, a prototype of selector and ownership validation, a grilling of the
  pressure rubric) before a spec can be written. Wayfinder decides which.
