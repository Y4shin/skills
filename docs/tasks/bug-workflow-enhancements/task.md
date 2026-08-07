---
kind: task
type: grilling
slug: bug-workflow-enhancements
title: Evaluate mp-skills /diagnosing-bugs and /triage against our report-bug
map: compare-to-mp-skills
status: ready
blocked_by: [adopt-mp-skills-patterns]
---

## Decision to settle

Should we adopt patterns from mp-skills' /diagnosing-bugs (structured 6-phase
debugging loop) and /triage (issue state machine) into our bug workflow?

## Context

Our /skill:report-bug handles intake (capture → reproduce → triage). Trivial
bugs are fixed directly. Non-trivial bugs are promoted to `type: bug` tasks
run through the bug pipeline (tdd-worker → verify → land).

mp-skills has two separate skills for what our report-bug covers:

**/diagnosing-bugs** — a 6-phase discipline for hard bugs:
1. Build a tight feedback loop (the core — refuses to proceed without one)
2. Reproduce + minimise
3. Hypothesise 3-5 falsifiable ranked
4. Instrument
5. Fix + regression test
6. Cleanup + post-mortem (handoff to architecture improvement)

**/triage** — a state machine for incoming issues:
- Category roles: bug, enhancement
- State roles: needs-triage, needs-info, ready-for-agent, ready-for-human,
  wontfix
- Handles external PRs as "issues with attached code"
- Produces agent briefs for ready-for-agent items

## Recommended starting answer

Adopt /diagnosing-bugs' structured loop as a model-invoked skill — our current
report-bug promotes hard bugs directly without a dedicated debugging phase,
which loses the tight-feedback-loop discipline. Defer /triage for now (it's
designed for an external issue tracker, which our workflow doesn't use).
