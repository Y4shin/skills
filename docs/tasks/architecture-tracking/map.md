---
type: map
title: Repository architecture tracking across efforts
status: stable
---
# Repository architecture tracking across efforts

## Destination

A repository that enables architecture tracking carries a unit model at
`docs/architecture/`: one Markdown file per architectural unit, whose front
matter names its stable ID, its parent, its source selectors and its declared
relationships, and whose prose states its responsibility, boundary and
rationale. The model is derived from and checked against facts extracted with
CodeGraph, so a reader can open the index, see which unit owns any in-scope
source, drill to the evidence behind each observed dependency, and tell observed
use apart from intended API. Every effort reads that model and records the units
it changes; ticket close-out and effort close compare the landed diff against
it, and refuse when the map would be left describing code that no longer exists.
A repository with no map runs the ordinary workflow untouched.

The effort proves this twice: in this TypeScript repository, and in the Go
repository `pdl-bezahlbar-machen`, whose real packages and `internal/` boundaries
are the case this repository cannot provide. In both, the operator authors the
first map by hand and then exercises the workflow with throwaway features.

Each archived effort carries a refactoring pressure value with its evidence, and
the outstanding total can be recomputed from `docs/tasks/state.yaml` and the
archived reviews alone, without a central ledger file.

At the end there is one route for architecture work in this package:
`codebase-design` and `improve-codebase-architecture` are retired with the
`architecture-scout` agent and the report scaffold, and the stages that now own
those responsibilities carry the guidance.

## Constraints

- CodeGraph is the only facts provider in v1, used behind a documented
  interface. No Tree-sitter fallback and no second provider.
- Architecture tracking is opt-in per repository. A repository without a map
  keeps the ordinary workflow, unchanged.
- One source root per repository by default, plus optional exclude globs for
  tests, generated code, vendor and migrations. Never the repository root
  wholesale. Multiple roots only if the `monorepo-multiroot` prototype shows
  that cross-package resolution holds and that multi-root is cheap.
- The live unit model is read-only during planning. New unit definitions written
  during planning stay provisional.
- The human may edit architecture Markdown directly, and that is trusted. Every
  mechanical edit goes through precision tools: `write` and `edit` are blocked
  on `docs/architecture/` through the `tool_call` hook that already blocks the
  task tree.
- Acceptance runs in two repositories, this one and `pdl-bezahlbar-machen`. Both
  are hand-onboarded by the operator and then exercised with throwaway features
  chosen on the spot.
- pdl is upgraded to this workflow version first. The upgrade is in scope as a
  prerequisite, not as a design goal.
- Retiring a skill means removing it from `package.json`'s `pi.skills`, the
  top-level `README.md`, the bucket `README.md`, its docs page, and
  `task-workflow-overview`'s map. No em-dashes in prose.
- Never write into pi's installed package trees. Test a local change through a
  project `.pi/settings.json` local install, or load the extension for one run
  with `pi -e <path>`.

## Non-goals

- Semantic validation of architecture writes: no gate tries to judge whether a
  write put the right statement in the right section.
- Pressure rubric tuning, threshold revision, and the re-notification policy.
  v1 records a value, rolls it up, and notifies once on crossing.
- A cross-repository pressure dashboard, or any UI beyond the review section and
  the on-demand rollup.
- External checker commands that a trusted project declares and the workflow
  executes, with a versioned JSON request and a structured response.
- The trained smell classifier.
- Architecture modelling for repositories that do not enable tracking, and any
  change to their ordinary workflow.
- Automatic enforcement that the physical layout mirrors the unit hierarchy. The
  hierarchy informs refactoring candidates; it is not enforced.

## Non-negotiable facts

**Success test:** a reader can open `docs/architecture/`, see which unit owns any
in-scope source in this repository and in the Go repository, drill to the
evidence behind each observed dependency, and read in every effort how the landed
diff matched or contradicted those boundaries. The workflow keeps that true: a
ticket whose diff touches source owned by a unit it did not update fails its
close-out, an effort whose reconciled map reports an undispositioned mismatch or
an analysis gap cannot archive, and a CI command fails on a coverage gap. Every
gap in static analysis is reported, never implied by silence. Each archived
effort carries a pressure value with its evidence, and the outstanding total is
recomputable from `state.yaml` and the archived reviews alone.

- Ownership: every in-scope source element has exactly one most-specific owner.
  A child's scope fits inside its parent's, siblings are disjoint, and once a
  unit is subdivided its children account for its entire scope. Gaps, overlaps
  and selectors that match nothing are reported, never tolerated.
- Three things stay separate everywhere in the model and its reports: language
  visibility, observed use, and intended API and relationships. Observed
  references are retained even when they use an implementation detail or run
  against a declared rule.
- Inventory coverage is reported separately from dependency coverage, so an
  empty result is distinguishable from incomplete evidence.
- Every reported edge, mismatch and coverage statement carries its source
  evidence and its location.
- A declared boundary is backed by an executable check in an existing tool, and
  the unit file links to that check. Automatic generation of checks from the
  model is neither promised nor ruled out by this map; `check-enforcement`
  decides.
- Facts come from CodeGraph only, behind one documented interface. The provider
  supplies an inventory, declarations with language visibility where available,
  and resolved references, each with locations.
- Refactoring pressure: an integer 1 to 3, no zero, a prose guide for choosing
  the level, a default threshold of 9, the value in the review front matter with
  its evidence section, the contributing archived efforts listed in
  `docs/tasks/state.yaml`, the list snapshotted into a refactoring effort at
  creation and crossed out at its close. Signal quality is collected through a
  dedicated `tw_feedback` kind.
- Both integration targets are exercised end to end, which means pdl is upgraded
  to this workflow version before its onboarding, and the operator authors both
  first maps by hand.
- After the retirement there is exactly one route for architecture work in this
  package, and no skill or agent duplicates its guidance.

## Decisions so far

- `non-negotiables` settled the effort's shape on 2026-11-05: the whole proposal
  lands except the recorded non-goals; the pressure ledger is v1; CodeGraph is
  the only provider; both architecture skills are retired here; the model gets
  phase-disclosed `tw_*` tools with a dedicated target for the refactor-effort
  copy, and `write`/`edit` blocked on `docs/architecture/`; all three sync
  guarantees are mechanical; one source root with exclude globs, and multi-root
  only if the prototype allows; pressure is an integer 1 to 3 with no zero and a
  default threshold of 9, held in the review front matter and rolled up from
  `state.yaml`.
- Automatic check generation stays undecided, so it is recorded as
  `check-enforcement` rather than as a non-goal.

## Fog


