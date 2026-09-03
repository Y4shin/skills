---
kind: task
type: grilling
slug: adopt-mp-skills-patterns
title: Determine which mp-skills patterns to adopt
map: compare-to-mp-skills
status: done
blocked_by: []
---

## Decision to settle

Which patterns, techniques, and skills from Matt Pocock's skills repo should
we incorporate into this repo's workflow and toolkit?

## Decisions reached

### Priority ordering (Q1)

Adoption priority, highest to lowest:

1. **Reusable primitives** — grilling, domain-modeling, codebase-design.
   Foundational patterns that other skills build on.
2. **Workflow** — adopting parts of mp-skills' workflow into ours. Details
   to be elaborated.
3. **Context management** — phase boundaries, handoff, compact, smart zone.
4. **Utility skills** — wizard, handoff, wait-what, teach, questionnaire,
   resolving-merge-conflicts, prototype.

### Reusable primitives form (Q2)

All three to be model-invoked skills:

- **grilling** → model-invoked skill with round structure, frontier, question
  format
- **domain-modeling** → model-invoked skill for glossary/ADR discipline
- **codebase-design** → model-invoked skill for deep-module vocabulary
  (module, interface, depth, seam, adapter, leverage, locality)

### Workflow design (Q3)

**Wayfinder's role** — routing, boundaries, frontiers, interdependencies, and
fog resolution. It does NOT execute grilling itself. It delegates all task
types (including grilling) to implement-task via the task graph.

### Context management (Q4)

1. **Session boundary guidance** — wayfinder and implement-task SKILL.md
   should advise closing the session between phases (wayfinder → fresh →
   implement-task → fresh → wayfinder re-eval). A prose heuristic about
   context limits (~100K tokens) as a guideline.
2. **/handoff utility skill** — captures unstructured session context
   (decisions, reasoning, open questions, dead ends) not captured in task
   docs. Writes to a temp file, portable across sessions/agents/humans.
3. **No /compact or /smart-zone skill** — close-and-reopen is sufficient.

Rationale for /handoff: task docs capture structured state but not
conversational residue — the *why* behind decisions, tangential findings,
reasoning that didn't crystallize into a doc line. Handoff complements,
don't duplicate, task docs.

### Utility skills (Q5)

**Build now (alongside Phase 1-2):**
- `/handoff` — per Q4, captures unstructured session context

**Build as model-invoked skills (low effort, high value per invocation):**
- `/wizard` — interactive bash script for human-only provisioning/credential
  steps
- `/resolving-merge-conflicts` — resolves merge conflicts hunk-by-hunk by
  intent; fires when conflict markers appear

**Deferred (follow-up grilling):**
- `/wait-what`, `/to-questionnaire`, `/teach`

Already covered by existing task types: prototype (`type: prototype`),
research (`type: research`).

**Invocation flow:**
1. User invokes wayfinder with an idea.
2. Wayfinder does minimal exploration (repo scan, 1-2 clarifying questions).
3. Wayfinder sketches an initial task tree with dependencies and fog.
4. Wayfinder presents the tree to the user and asks for explicit consent.
5. On approval, implement-task works the frontier in dependency order.

**Two-phase model with soft cutoff and feedback loop:**

1. **Exploration phase** — wayfinder creates only research, prototype, and
   grilling tasks. At least one grilling task must be resolved before
   implementation tasks can be created (alignment invariant). Research and
   prototype tasks may precede or inform the grilling but cannot replace it.
2. **Soft pivot** — wayfinder decides exploration clarity is sufficient,
   creates implementation tasks (feature, bug, manual) based on resolved
   exploration.
3. **Execution phase** — implementation tasks are **stable**: wayfinder
   should not modify them unless a problem is discovered. Modifications
   require reconciliation with the user.
4. **Feedback loop** — implement-task hits uncertainty → return-to-wayfinder
   via existing escape hatch → wayfinder inserts new exploration tasks →
   their resolution may adjust the implementation plan (with user) → resume
   execution.

## Parent decisions it depends on

None — this is the first planning decision. The map's destination, constraints,
and comparison document are the sole context.

## Choices already known

The comparison document (`compare-to-mp-skills.md`) identifies these categories
of mp-skills patterns that we lack:

1. **Reusable primitives** — grilling (rounds/frontier/question format),
   domain-modeling (glossary/ADR discipline), codebase-design (deep-module
   vocabulary)
2. **Code review** — two-axis (Standards + Spec) parallel sub-agent review
3. **Structured debugging** — 6-phase discipline with tight feedback loop
4. **Context management** — phase boundaries, handoff, compact, smart zone
5. **Human-facing docs** — per-skill docs published for end users
6. **Architecture improvement** — recurring survey with HTML report
7. **Utility skills** — wizard, handoff, wait-what, teach, questionnaire,
   resolving-merge-conflicts, prototype, research
8. **Triage state machine** — needs-triage → ready-for-agent issue flow
9. **Invocation model** — user-invoked vs model-invoked skill split
10. **Context.md / domain glossary discipline** — ubiquitous language as
    shared reference

## Recommended starting answer

Start with the **reusable primitives** (grilling, domain-modeling,
codebase-design) — they are the most fundamental patterns, underpinning
many other skills in mp-skills. Without a shared vocabulary and reusable
building blocks, higher-level skills (code review, architecture improvement,
triage) rest on weak foundations.

Next priority: **context management** (phase boundaries, handoff) — our
workflow currently has no guidance on managing the orchestrator's context
window, which will become critical as the workflow grows.

Then evaluate whether **code review** and **structured debugging** are worth
the skill overhead given our existing CI/TDD/verification pipeline.

## What downstream work the answer may create

- New primitive skills (reusable grilling, domain-modeling, codebase-design)
- Updates to implement-task resources to compose with new primitives
- A code-review skill or incorporation into finalize-task
- A debugging skill or updates to report-bug
- Context management guidance in wayfinder and implement-task
- Human-facing docs template and generation
- Architecture improvement survey skill
- Individual utility skills
- Possibly a re-instatement or redesign of the invocation model
