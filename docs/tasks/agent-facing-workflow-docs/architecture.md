---
type: architecture
title: Agent-facing workflow troubleshooting docs
status: stable
---

## Architecture (from the specification)

The specification's architecture content, recorded verbatim:

- **The ladder skill is named `workflow-failure`.** Chosen over `escalate`,
  `workflow-doctor`, and `stuck-on-workflow`: it names what it owns, reads
  as an instruction ("invoke the workflow-failure skill when the workflow
  misbehaves"), and does not blur into `task-workflow-doctor` or
  `diagnosing-bugs`.
- **Two surfaces, one behavior contract.** The behavior contract (the
  ladder) lives in exactly one place: the new model-invoked ladder skill.
  Every other surface references it; the internals reference is
  documentation, not a second behavior contract.
- **The ladder skill.** A promoted model-invoked skill (model-invoked so a
  stuck agent can auto-invoke it mid-run), in the engineering bucket. Its
  rung order is fixed: (1) act on a refusal's own `reason` and `legal_next`;
  (2) reorient from the internals reference, or route to
  `task-workflow-doctor` for tree problems; (3) record the snag with
  `tw_feedback` (the channel that labels the row as workflow feedback);
  (4) stop and escalate with the fixed five-part completion report naming
  the failed step, the refusal reason, and the decision the operator must
  make. Forbidden at every rung, in writing: hand-editing the tree, skipping
  a gate, inventing a workaround. The ladder never blocks mid-run on an
  interactive question; escalation always ends the run.
- **Division of labor with the doctor.** `task-workflow-doctor` stays the
  tree/opener diagnostician and is not modified in scope; the ladder routes
  to it. The ladder is a discipline, not a second diagnostician: it names
  the legal moves, it does not fix the tree.
- **The internals reference.** New resources under `task-workflow-overview`,
  referenced from that skill's SKILL.md and from the ladder skill. Content:
  the big picture (main flow idea-to-ship, phase boundaries, the two graph
  kinds), the artifact tree and artifact types, the `tw_*` gate model
  (openers as the disclosure mechanism, disclosure scopes,
  `tw_request_tool`), the refusal shapes and their legal routes. Diagrams:
  mermaid blocks for the main-flow and phase-gate flow charts, ASCII trees
  for the artifact layout. Chosen over ASCII-only and mermaid-only.
- **The one-line reference.** Every other promoted `SKILL.md` and every
  subagent profile in `agents/` carries exactly one line instructing
  invocation of the ladder skill on workflow problems. The exact sentence is
  standardized so coverage is mechanically checkable. The ladder skill
  itself does not reference itself.
- **Convention sync for the new promoted skill.** Per the repository's
  conventions: registration in the package's skill list, a top-level README
  reference, a bucket README one-liner grouped under model-invoked, a
  human-facing docs page with the four standard sections, and the
  task-workflow-overview router updated to route to it. The domain glossary
  (CONTEXT.md) gains any terms the ladder introduces that the vocabulary
  does not already carry.
- **`src/` untouched.** The docs describe the tools exactly as they behave
  today. Where documenting a tool faithfully would paper over a confusing
  refusal message, the confusion is recorded as a review finding (a
  disposition for a follow-up effort), never fixed inline.
- **Success is docs-complete.** No eval additions and no behavioral test of
  agent behavior in this effort; a behavioral follow-up is possible future
  work, out of scope here.

## Interface contracts

### The standardized reference sentence (canonical string)

Every promoted `SKILL.md` except `workflow-failure`, and every subagent
profile in `agents/`, carries this exact sentence, placed directly after the
operator-communication preamble where one exists (else at the top of the
body):

> If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise
> surprises you, invoke the `workflow-failure` skill before improvising.

The sentence is the contract: the coverage test asserts its verbatim
presence, so no ticket may paraphrase it. Subagent profiles that do not
mention `tw_*` tools still carry the same sentence; uniformity outweighs
phrasing fit.

### The internals reference resources

One new resource under the task-workflow-overview skill:

- `WORKFLOW-INTERNALS.md` (capitalized sibling of the existing
  `PHASE-BOUNDARIES.md`): the agent-facing internals reference. Sections, in
  order: (1) the big picture, (2) the artifact tree (ASCII), (3) the main
  flow (mermaid `flowchart`), (4) the phase-gate state machine (mermaid
  `stateDiagram-v2`), (5) the `tw_*` tools by phase and disclosure scope,
  (6) the refusal shapes and their legal routes, (7) the escalation ladder
  and what escalation means.

Referenced from: the workflow-failure SKILL.md (rung 2), the
task-workflow-overview SKILL.md (a short "Internals" pointer), and nothing
else. No other skill links it directly; the one-line sentence routes through
the ladder.

### Division of file ownership between tickets

- `create-workflow-failure-skill` creates the new skill directory and its
  SKILL.md, owns `CONTEXT.md`, `package.json`, the top-level `README.md`,
  the engineering bucket `README.md`, and the new docs page.
- `workflow-internals-reference` owns
  `skills/engineering/task-workflow-overview/` in full during
  implementation: the new resource, the SKILL.md edit (Internals pointer,
  router row for workflow-failure, and the overview's own standardized
  reference sentence). No other ticket touches that directory.
- `thread-reference-everywhere` owns every other promoted `SKILL.md` (both
  buckets, excluding workflow-failure and task-workflow-overview) and every
  profile under `agents/`.
- `reference-coverage-suite` owns the test additions under `tests/`.

## Per-ticket exports

- **create-workflow-failure-skill** exports: the `workflow-failure` skill
  (SKILL.md with the ladder and its report resource), its registration in
  the promoted set (package skill list, READMEs, docs page with the four
  sections), and any new CONTEXT.md glossary entries. Dependent tickets can
  reference the skill by name with confidence it exists and ships.
- **workflow-internals-reference** exports: `WORKFLOW-INTERNALS.md`
  referenced from the overview SKILL.md, the router row and reference
  sentence in that SKILL.md.
- **thread-reference-everywhere** exports: the canonical sentence present in
  every remaining promoted SKILL.md and every `agents/` profile, with the
  agent-frontmatter test file list untouched (no new profiles are added).
- **reference-coverage-suite** exports: mechanical checks proving the
  contract above across the shipped tree, so a future promoted skill without
  the sentence fails CI.

## Existing abstractions to use

- `tests/skills.test.ts`: the structural test suite already enumerates
  promoted skills, agent profiles, docs pages and README groupings. Its
  "every promoted skill has a docs page" and four-section checks start
  asserting the new skill the moment it enters the package skill list;
  tickets build on this file rather than inventing a parallel harness.
- The `task-workflow-doctor` skill: prior art for a small,
  resources-backed, single-purpose skill with its own report resource.
  The workflow-failure SKILL.md follows the same shape (preamble, ladder,
  routing notes, report pointer, feedback note).
- `docs/engineering/task-workflow-doctor.md` and its siblings: prior art
  for the four-section human-facing docs page.
- The overview's `PHASE-BOUNDARIES.md` and its inline link style: prior art
  for a capitalized deep-layer resource referenced from a SKILL.md.
- The doctor's `resources/opener-refusal.md`: the refusal-shape catalog the
  internals resource summarizes and links conceptually rather than
  duplicating.

## Do-not-reimplement

- No second refusal catalog: `WORKFLOW-INTERNALS.md` names the refusal
  shapes and routes; the doctor's own resource stays the tree-side detail.
- No rendering of diagrams: mermaid blocks are text; do not vendor or build
  a renderer (the improve-codebase-architecture mermaid vendor exists for
  its HTML report and is not reusable here).
- No changes under the extension source (`src/`): confusing refusal texts
  are review findings, never inline fixes.
- No new subagent profiles: the ladder is reached by reference, not by
  adding an agent.
- Do not restate the ladder anywhere outside the workflow-failure SKILL.md:
  every other surface carries the one standardized sentence and nothing
  more.

## Seams

- **Canonical sentence seam**: the verbatim string lives once in this
  document and is asserted verbatim by the coverage suite. The string is the
  interface between the threading ticket and the test ticket; threading may
  not paraphrase, the test may not relax.
- **Promoted-set seam**: `package.json` `pi.skills` is the mechanical source
  of the promoted set; the structural tests derive expectations from it, so
  registration and tests stay coupled by construction.
- **Overview seam**: `skills/engineering/task-workflow-overview/SKILL.md` is
  edited by exactly one ticket (workflow-internals-reference); this removes
  the file-collision that a parallel edit from the skill-creation ticket
  would cause.
- **Report shape seam**: the five-part completion report lives in the
  ladder's own `resources/report.md`, following the doctor's pattern, so
  the ladder's terminal rung prints the same shape every other skill
  already prints.
- **Glossary seam**: `CONTEXT.md` edits happen only in the skill-creation
  ticket; new terms (e.g. the ladder, escalation rung) follow the existing
  entry shape with an Avoid line.

## Per-ticket interface contracts

- **create-workflow-failure-skill** must land with the full test suite green
  against an updated promoted set: docs page, README references, bucket
  grouping (model-invoked). It must not edit
  `task-workflow-overview/SKILL.md`; the router row for the new skill
  belongs to workflow-internals-reference (the repo convention that the
  router mentions every user-reachable skill is satisfied there, so that
  ticket carries it).
- **workflow-internals-reference** must leave every diagram block
  syntactically valid mermaid (parseable text; the repo has no mermaid CI)
  and every claimed behavior traceable to the skills, tests, or extension
  source it documents. Where source and common understanding disagree, the
  source wins and the confusion becomes a review finding.
- **thread-reference-everywhere** must insert the canonical sentence
  verbatim and change nothing else in the touched files (no drive-by
  edits).
- **reference-coverage-suite** must fail when: a promoted SKILL.md (minus
  workflow-failure) or an agent profile lacks the sentence, when the
  internals resource is missing or unreferenced, or when a new promoted
  skill ships without coverage. It must pass on the tree as the other
  tickets left it; it never relaxes the canonical string.
