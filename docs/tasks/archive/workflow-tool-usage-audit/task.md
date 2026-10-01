---
kind: task
type: research
slug: workflow-tool-usage-audit
title: Map how every step of the workflow (wayfinder to implement-task and supporting skills) actually uses the tools
map: task-tools-overhaul
status: deprecated
blocked_by: []
workflow_state: done
---

## The precise question

For every skill in the task-workflow flow, from wayfinder through to-spec
and to-tickets to implement-task, plus every supporting skill it touches
(finalize-task, task-workflow-doctor, setup-workflow, code-review, tdd,
research, prototype, grilling, domain-modeling, handoff, skill-creator,
skill-review, eval-review, task-workflow-overview), which tools does it
actually invoke, which does it ignore, and where does its prose contradict
tool behavior? Specifically: which tools does the flow make load-bearing
(which the overhaul cannot remove), which are dead weight the flow never
mentions, and which workflow steps have no tool support at all and force
the agent into prose-only workarounds?

## The decision or task it unblocks

The synthesis grilling (G1) folds this audit into the overhaul gap matrix:
tool exists (R1) vs. workflow uses it (R2). Its output decides which tools
are kept, reworked, or deleted, and what new tool support (if any) the
v3-era flow is missing. This task produces evidence, not decisions.

## Trusted source boundaries

- The skill docs themselves: every `SKILL.md` in `skills/engineering/` and
  `skills/productivity/` that the flow touches, plus their `resources/`
  subdirectories (implement-task's per-type resources, wayfinder's planning
  resources, finalize-task, setup-workflow's upgrade resources, etc.).
- The `docs/` tree as the workflow's own documentation of itself:
  `docs/engineering/*.md`, `docs/productivity/*.md` pages for the promoted
  skills.
- The R1 catalog (tool-surface-inventory findings) as the authoritative
  tool reference when it already exists; R1 runs concurrently, so when
  its findings are not yet written, read `src/pi.ts` directly for tool
  behavior questions instead of waiting.
- Live cross-checks: the actual tool list registered in this session, and
  the actual docs/tasks/ tree as a corpus of real artifacts the flow
  produces (including the pi-harness-evals and task-tools-overhaul maps,
  as living examples of the flow's output formats).
- Documentation pages of pi harness APIs referenced by skills (e.g.
  subagent/telemetry usage), only to verify a skill's claims about a
  non-extension tool it depends on.

## Evidence required for completion

- `findings.md` in this task's directory containing:
  - A per-skill usage map: for each skill in scope, every tool invocation
    it names (exact `task_*`, notify_user, telemetry tools, get/list
    guidelines), every tool it relies on implicitly (e.g. skills that
    assume state.yaml exists), and tools it never mentions.
  - Load-bearing vs. dead-weight classification with evidence (quote or
    cite the skill file and line for every claim).
  - A prose-vs-behavior contradiction list: every place skill prose
    describes tool behavior the tool does not have, or vice versa (the
    task_context schema text is one confirmed instance; find all others).
  - A no-tool-support list: workflow steps that are pure prose with no
    tool backing (e.g. to-spec's spec.md has no tool awareness; the
    spec-only-directory invisibility that caused the false finalizable on
    pi-harness-evals is one confirmed consequence).
  - The two known-future requirements (two-phase model, manual-mode
    marker) checked against the audit: what tool support each implies and
    whether the current surface has any of it.
  - Slice-machinery verdict evidence: every invocation of task_slices,
    task_set_slices, task_finalizable, and slice-related prose across all
    skills, named and cited, so G1 can decide demote/freeze/delete on
    evidence.
- Every claim cites the skill file (and resource file) that owns it.

## Likely dependent tasks

- overhaul-synthesis-grilling (G1): consumes both research findings as
  the gap matrix.
