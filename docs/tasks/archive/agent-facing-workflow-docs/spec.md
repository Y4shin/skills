---
type: spec
title: Agent-facing workflow troubleshooting docs
status: stable
---

## Problem Statement

A pi agent running this package's skills can hit a wall it was not built to
climb: a `tw_*` tool refuses, a gate rejects, a dependency is missing, or the
tree is in a state the skills do not cover. Today the agent has no shipped
reference for how the workflow and its tools actually work internally. It
goes on a goosechase through the package, latches on to the first plausible
thing it finds, and improvises a workaround it was never supposed to do:
hand-editing the artifact tree, skipping a gate, or "fixing" the problem in
a way that corrupts the workflow's own invariants. The operator only finds
out after the fact, or not at all.

The human-facing docs pages explain to people what each skill does; nothing
explains to the agent how the machinery it operates hangs together, and
nothing short-circuits the improvisation loop with one fixed answer: stop,
reorient from the docs, and escalate to the operator when the docs do not
resolve it.

## Solution

Ship an agent-facing documentation layer inside the package itself, parallel
to how the pi harness ships its own docs so the agent can understand the
system it runs:

1. **One new model-invoked skill, `workflow-failure`** (the ladder
   discipline). It owns the unified escalation ladder: act on a refusal's
   own reason and `legal_next`, reorient from the internals reference or
   route to `task-workflow-doctor`, record the snag with `tw_feedback`, and
   when nothing resolves it, stop and escalate with the five-part
   completion report, naming the failed step, the refusal reason, and the
   decision the operator must make. Improvisation is forbidden at every
   rung: no hand-editing the tree, no gate-skipping, no invented
   workarounds.
2. **One-line references everywhere else.** Every other promoted `SKILL.md`
   and every subagent profile in `agents/` carries exactly one line
   instructing the agent to invoke the ladder skill on any workflow problem.
   No inline ladder prose in the other skills.
3. **The internals reference under `task-workflow-overview`.** New resources
   behind that skill's SKILL.md explain the big picture and the detail: the
   phase machine, the artifact tree, the `tw_*` gate model, the refusal
   shapes, with flow charts (mermaid) for the main flow and the state
   machine and ASCII trees for the layout. A stuck agent reads these to
   reorient the way pi's own docs reorient pi.

## User Stories

1. As the pi agent running a workflow phase, when a `tw_*` tool call is
   refused, I want one skill whose description tells me to invoke it on
   workflow problems, so that my first move is defined instead of improvised.
2. As the pi agent, when I am stuck mid-phase, I want every SKILL.md I read
   to name the same next move in one line, so that I never have to decide
   between conflicting failure-handling instructions.
3. As the pi agent, when `tw_open` returns a refusal, I want the ladder to
   walk me through the refusal's `reason` and `legal_next` before anything
   else, so that the gate's own design is my route.
4. As the pi agent, when the refusal does not resolve my situation, I want a
   shipped reference that explains the phase machine, the artifact tree, and
   each refusal shape, so that I can reorient from documentation instead of
   grepping package source.
5. As the pi agent, when I open the internals reference, I want flow charts
   of the main flow and the phase-gate state machine, so that I can locate
   where my current state came from and which moves are legal.
6. As the pi agent, when a subagent chain (tdd-worker, land-worker, verifier)
   stalls or the precondition checker blocks the chain, I want the same
   ladder available to the chain's caller, so that the chain stops cleanly
   rather than running on broken preconditions.
7. As the pi agent, when the tree itself looks wrong (legacy layout, missing
   scaffolding, half-applied migration), I want the ladder to route me to
   `task-workflow-doctor`, so that tree diagnosis stays in the skill that
   owns it.
8. As the pi agent, when I record a snag, I want the ladder to name
   `tw_feedback` as the channel, so that every failure also becomes telemetry
   the operator can mine later.
9. As the pi agent, when the ladder bottoms out, I want its terminal step to
   be the five-part completion report that ends the run, so that the
   operator gets the failed step, the refusal reason, and the decision to
   make in one message.
10. As the pi agent, I want the ladder to forbid hand-editing the tree,
    skipping a gate, and inventing workarounds at every rung, so that the
    temptation to freelance has an explicit, load-bearing no.
11. As the operator, when the agent escalates, I want escalation instead of
    improvisation to be the guaranteed outcome, so that no run silently
    corrupts the workflow.
12. As the operator, when I install or upgrade the package, I want the
    internals reference and the ladder skill to travel inside the package,
    so that every target repo's agent gets the same behavior without copying
    files.
13. As the operator, when I read the shipped READMEs, bucket READMEs, and
    docs page for the ladder skill, I want the conventions the repo
    maintains to stay accurate, so that the new skill is discoverable the
    same way as every other promoted skill.
14. As the package maintainer, when a future skill is added or renamed, I
    want the reference-line coverage checkable by the repo's own gating, so
    that a new promoted skill cannot silently ship without the ladder
    reference.
15. As the pi agent, when the internals reference would require fixing a
    tool's refusal text to stay honest, I want to record that as a review
    finding for a follow-up, so that this effort never has to bend the docs
    to match a confusing tool message.

## Implementation Decisions

Settled in the planning record (`settle-non-negotiables`) and in this
phase's operator round (the skill's name); nothing else is settled here:

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

## Testing Decisions

A good test in this package: external behavior through the shipped surface,
never implementation details. Three test seams apply here:

- **Gating/convention checks**: the repo maintains mechanical checks for the
  promoted-skill conventions (skill list membership, README references,
  bucket README entries, docs pages, docs-tree sync). These checks run
  against the shipped files and must pass with the new skill present; any
  existing reference-coverage assertion is extended so every promoted
  SKILL.md and every subagent profile carries the standardized reference
  line, with the ladder skill exempt from referencing itself.
- **Content checks**: a lightweight test asserting the internals resources
  exist, are referenced from the overview skill's SKILL.md, and that the
  standardized reference sentence is identical across all surfaces. Prior
  art: the repo's existing structural tests over the skills and docs tree
  (the vitest suite at package root).
- **No behavioral/eval testing**: the success criterion is docs-complete by
  operator decision. Verified manually once by reading a staged run.

## Out of Scope

Consistent with the map's `## Non-goals`:

- Behavioral or eval-based verification that agents route and escalate more
  reliably; docs-complete success only, with a behavioral follow-up as
  possible future work.
- Any change to tool implementation or refusal message text under the
  extension source; confusing messages uncovered while documenting become
  review findings for a follow-up effort.
- Changing `task-workflow-doctor`'s scope, or merging the doctor into the
  ladder skill.
- Inline failure-handling prose in the other promoted skills (superseded by
  the operator's decision: one line of reference, one ladder skill).
- Documenting anything outside this package's workflow (repo-internal
  conventions of target repos stay their own business).

## Further Notes

- The pi harness ships its own documentation tree for agent
  self-understanding; this effort mirrors that pattern at package scale.
- The internals reference must stay in the package's shipped file list; a
  resource that exists in the repo but does not install is a silent
  non-delivery.
- Terminology throughout the new surfaces follows the shipped domain
  glossary: effort, phase, frontier, graph kind, opener refusal, workflow
  feedback, completion report.

> The architecture content in this specification is archival: the living architecture document is [architecture.md](architecture.md); update it there, not here.
