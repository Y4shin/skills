---
"task-workflow": major
---

Largely adopt Matt Pocock's skills repo way (v2.10.0 to v3.0.0).

Reorganized skills into engineering/productivity/misc/in-progress/deprecated
buckets with promotion rules. Retired report-bug (into deprecated/) and
dropped grilling-with-ui (+ its CLI/UI scripts and eval harness). Added 12
skills adapted from Matt: prototype, research, resolving-merge-conflicts,
wizard, handoff, to-questionnaire, teach, writing-for-agents, triage,
grill-me, to-spec, to-tickets. Rewired implement-task to dispatch to utility
skills and borrowed implement-spec graph/concurrency language. Scaffolded
repo-root CONTEXT.md, docs/adr/, AGENTS.md, docs/agents/, and
docs/tasks/out-of-scope/. Reshaped wayfinder to decisions-only (strict
two-phase: wayfinder produces planning decisions, to-spec/to-tickets create
implementation tasks). Rewrote task-overview to ask-matt-style intent router
with phase-boundary guidance. Re-aligned grilling, code-review, tdd, and
domain-modeling to Matt's current text. Adopted changesets versioning
(integrated into release.sh). Enforced no-em-dashes prose rule repo-wide.
Bumped schema_version to 3.
