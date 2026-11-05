---
type: task
subtype: grilling
title: Settle the architecture tracking non-negotiables
status: stable
workflow_state: done
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

## Notes

## Settled 2026-11-05, round 3 (the operator's words, condensed only where repetition)

### Scope

The effort implements the whole proposal except the parts listed as non-goals.
The cross-effort refactoring pressure ledger is in, as a **v1**: it records a
value per effort, rolls up on demand, and carries instrumentation that collects
feedback about the quality of its own signals so the rubric can be improved
from evidence. Rubric tuning, threshold tuning, and the re-notification policy
are not v1.

Two integration targets, both fully exercised: this repository and
`github.com/Y4shin/pdl-bezahlbar-machen`. Acceptance for both includes the
operator hand-authoring the initial architecture map, then running throwaway
features, chosen on the spot, to exercise the workflow. Those features are not
part of this effort's design and need not be exact.

Upgrading pdl to this workflow version is in scope, not as a design goal but as
a necessity: it is the only non-JavaScript repository on the new version, and
the Go exercise requires it. The operator's correction to the earlier framing:
the Go target is not interesting because its workflow version is old, it is
interesting because Go has real packages and modules, unlike JavaScript and
TypeScript where a directory is only a convention. `internal/` visibility and
import paths stress the ownership invariants in a way this repository cannot.

### Facts provider

CodeGraph only, behind a documented provider interface, in v1. Facts gathered
during the session: `codegraph` 1.6.2 supports Go and 40 further languages, its
graph carries node kinds (`struct`, `interface`, `function`, `method`, `field`,
`type_alias`, `import`, `export`, `route`, `component`, and others), edge kinds
(`calls`, `imports`, `references`, `implements`, `extends`, `instantiates`,
`overrides`, and others), and per-symbol `visibility`
(`public`/`private`/`protected`/`internal`) plus `isExported`. An index exists
in this repository: 62 files, 1431 nodes, 6365 edges.

### Retiring the two skills

Both `codebase-design` and `improve-codebase-architecture` are retired inside
this effort, together with the `architecture-scout` agent, the `HTML-REPORT.md`
scaffold, and their tests. The useful vocabulary moves into the unit-file prose
guidance and the Wayfinder resource. Leaving `codebase-design` in place would
recreate the competing-instructions problem the effort exists to remove.

### Tool surface

First-class `tw_*` tooling, disclosed by phase, with a dedicated `tw_open`
target for the refactor-effort copy of the architecture directory. The
ownership invariants cannot be trusted to prose.

Guardrails, per the operator: the human may edit the Markdown directly, and that
is trusted. Every mechanical interaction that edits architecture files is gated:
the `write` and `edit` tools must not reach `docs/architecture/` (the pattern
already used by `guardTaskTreeWrites` on the `tool_call` hook, which blocks
writes into the task tree), and precision tools are the only writers. Semantic
validation, meaning a check that a write put the right content in the right
section, is explicitly not attempted: it cannot be prevented within reason and
gates for it would cost more than they earn.

### Sync guarantees

All three mechanical guarantees are in, and the operator asked for more than
they list, which the guardrail decision above supplies:

- a ticket close-out refuses when the landed diff touches source owned by a unit
  whose file the ticket did not update;
- `finalize-effort` refuses to archive while the reconciled map reports an
  undispositioned mismatch or an analysis gap;
- a repository command validates selectors against the source inventory and
  fails on gaps, overlaps, and selectors that match nothing, so a repository can
  wire it into CI.

Instruction alone is what the current skills have, and it is the drift being
solved.

### Source roots and exclusions

One source root per repository by default, with an optional set of exclude
globs per root for tests, generated code, vendor, and migrations. Never the
repository root wholesale. Multiple roots are **conditional on the prototype
task**: a quick monorepo setup in TypeScript, Rust, and Go, each with two or
three trivial packages that reference each other, to establish whether CodeGraph
resolves the cross-package interconnections and whether multi-root is cheap to
support. If it is, multi-root is supported; if it is not, one root stands.

### Pressure value and ledger

- The value is an integer **1 to 3 only**: light, moderate, heavy. Zero is
  deliberately not allowed. The operator's reasoning: a model that can say
  "nothing to see here" will abuse it, and wrongly opening a refactoring
  conversation every ninth effort is the cheaper failure.
- Each value needs a prose guide that tells the model how to choose the level,
  and the operator wants that guide to exist, not just the number.
- The default threshold is **9**, tunable. Three heavy efforts reach it, and so
  do nine light ones, which is the case the operator wants surfaced.
- Where it lives: the effort's `review.md` carries a body section on refactoring
  pressure with the evidence, and its front matter carries the value as a key.
  There is no central Markdown ledger.
- The rollup is `docs/tasks/state.yaml`: it holds references to the archived
  efforts that currently contribute pressure. The total is computed on demand
  from that list plus the structured front matter of the archived reviews.
- Reset rule: at **creation** of a refactoring effort, the tooling reads
  `state.yaml` and records into that effort which source efforts it is taking
  on. On close-out, exactly those entries are crossed out. Pressure that lands
  during the refactor therefore survives instead of being silently dropped by a
  blanket clear.
- Signal-quality feedback reuses `tw_feedback` with a dedicated kind, clearly
  distinguishable from `architecture` (a dotted label such as
  `architecture.refactoring-pressure` is acceptable). Fact: `tw_feedback`'s
  kind is a closed union in `src/core/feedback.ts` with the tool schema built
  from `FEEDBACK_KINDS`, so this is a small code change plus tests.

### Automatic check generation

Deliberately **neither a goal nor an explicit non-goal**. The operator expects
the remaining grilling to settle it. Recorded as its own task rather than
crossed out.

### Alternatives rejected during the session

- A central Markdown pressure ledger: rejected in favour of review front matter
  plus `state.yaml`.
- A per-effort-only record with the total computed on demand and nothing
  persisted: rejected because archiving removes the effort from view.
- T-shirt sizes with a weight table: rejected because a single small integer is
  what makes rollup, threshold and feedback comparable.
- Zero as a pressure level: rejected, see above.
- Cleaning the whole pressure list at refactor close-out: rejected, it forgives
  pressure the refactor did not resolve.
- Reading the second integration target as read-only evidence only: rejected by
  the operator, who wants the workflow exercised in both repositories.
- Declaring automatic check generation a non-goal: rejected as premature.

### Consequences for dependent tasks

`monorepo-multiroot` decides whether multi-root is in. `unit-model-schema` and
`views-and-facts-refresh` depend on `codegraph-evidence` and the prototype.
`check-enforcement` depends on `unit-model-schema` and
`boundary-check-tooling`. `workflow-surface` depends on `unit-model-schema` and
`pi-lifecycle-gating`. `pressure-rubric` stands alone.

### Newly discovered work, not this effort

The pressure rubric's tuning, the threshold's revision, and the re-notification
policy. A cross-repository pressure dashboard or any UI beyond the review and
the rollup. Semantic content validation of architecture writes.
