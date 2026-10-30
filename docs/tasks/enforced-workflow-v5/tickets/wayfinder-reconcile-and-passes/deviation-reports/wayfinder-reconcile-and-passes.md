---
type: deviation report
title: Deviation report for wayfinder-reconcile-and-passes
status: stable
---

## Deviation report: wayfinder-reconcile-and-passes

### API surface changes
- **Planned:** the ticket's interface contract (arch spec entry 10) says
  wayfinder exports the absorbed planning phase: one frontier snapshot per
  invocation, at most one grilling, reconcile through `tw_finalize_map`,
  write-back through `tw_write_section` with the slug-reference convention,
  resources under `wayfinder/resources`, user-invoked frontmatter. No code
  API was planned; the surface is skill prose plus the registered tool calls.
- **Actual:** built as planned. Two contract-adjacent deltas, neither a code
  API change:
  1. Phase prose says "the ready flag", never the literal token
     `ready_for_spec`, because the landed opener-gate guard (ticket 9,
     `tests/opener-gate.test.ts`) refuses preconditions restated in phase
     prose. Behavior is unchanged and pinned by tests; the mechanical key
     name lives in the tool descriptions, which is what the contract already
     said.
  2. The `implement-task` router's planning-subtype dispatch now routes to
     `wayfinder/resources/`, and its "grilling has no standalone skill"
     denial is removed. This is the planned router correction; it matters to
     ticket 17 (`implement-ticket-skill`), which retires the file.
- **Impact:** ticket 16 (`to-spec-rescope`) must use the same
  "ready flag" wording or its prose fails the same guard. Ticket 17 inherits
  an `implement-task` whose planning resources are already gone; its retire
  step only has the feature/bug halves and the chain scripts left to move.
  No other ticket consumes this ticket's surface.

### Abstraction usage
- Used/was specified: yes. Every write goes through the landed tools
  (`tw_open`, `tw_close`, `tw_write_section`, `tw_mark_done`,
  `tw_finalize_map`); grilling sessions delegate to the `grilling` skill,
  research and prototype to their standalone skills. No method restated, no
  parallel machinery built.

### Out-of-scope changes
- `skills/engineering/research/SKILL.md`: one dangling pointer repointed
  from the deleted `implement-task/resources/research.md` to the consolidated
  `wayfinder/resources/research.md`. Forced by the planned deletion; recorded
  here because the file itself is outside the ticket's listed set.
- Foreign test updates (`tests/skills.test.ts`, `tests/skill-rewire.test.ts`,
  and the dispatch/template assertions they carry): all called for by the
  arch spec's prose-seam rule ("updated with each skill rewrite"). The v4
  template-conformance check was narrowed to the `type: task` template
  because the findings template merged into `resources/research.md`.
- `docs/engineering/wayfinder.md` re-synced: project convention for promoted
  skill behavior changes, and the prose-seam tests require it.
- No production code changed. No test was forced green against its intent.

### Ticket doc update needed?
- Yes, minor, for the land-worker's implementation note: record that
  (a) phase prose cannot name `ready_for_spec` literally (ticket 9's guard),
  a wording constraint `to-spec-rescope` inherits, and (b) the
  `implement-task` planning resources are already deleted, narrowing
  ticket 17's remaining move to the feature/bug resources and chain scripts.

### User attention needed?
- No. Scope matches the ticket and the arch spec; no API surface diverged;
  the two deltas above are consequences of already-landed tickets, both
  recorded for the dependent tickets to absorb.
