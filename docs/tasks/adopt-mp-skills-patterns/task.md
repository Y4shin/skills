---
kind: task
type: grilling
slug: adopt-mp-skills-patterns
title: Determine which mp-skills patterns to adopt
map: compare-to-mp-skills
status: ready
blocked_by: []
---

## Decision to settle

Which patterns, techniques, and skills from Matt Pocock's skills repo should
we incorporate into this repo's workflow and toolkit?

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
