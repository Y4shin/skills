---
type: ticket
subtype: feature
title: Write the workflow internals reference
status: deprecated
workflow_state: done
blocked_by: []
size: l
---

## What to build

The agent-facing internals reference: a new `WORKFLOW-INTERNALS.md`
resource under the task-workflow-overview skill (the capitalized sibling of
PHASE-BOUNDARIES.md), giving a stuck agent the big picture and the
mechanical detail of how the skills and `tw_*` tools work, so it reorients
from shipped documentation instead of grepping package source.

The document carries, in order:

1. The big picture: what an effort is, who the actors are, the two graph
   kinds, the phase machine from the front door to the archive.
2. The artifact tree: ASCII layout of `docs/tasks/` and the artifact types,
   verbatim faithful to the scanner's rules.
3. The main flow: a mermaid `flowchart` of idea to ship, including the
   planning graph to ticket graph handoff.
4. The phase-gate state machine: a mermaid `stateDiagram-v2` of open,
   refuse, disclose, request-tool, close.
5. The `tw_*` tools by phase and disclosure scope, including `tw_next`,
   `tw_open`/`tw_close`, and `tw_request_tool` semantics.
6. The refusal shapes and their legal routes (aligned with, not duplicating,
   the doctor's opener-refusal resource; that file stays the tree-side
   detail).
7. The escalation ladder in brief, pointing back to the workflow-failure
   skill as the behavior contract.

Every claimed behavior must be traceable to the skills, tests, or extension
source. Where source and common understanding disagree, the source wins and
the confusion is recorded as a review finding (never an inline src/ fix).

Mermaid diagrams must be syntactically valid mermaid; they are text blocks
only, never rendered or vendored.

This ticket also owns every edit under the task-workflow-overview skill
directory (its exclusive file-ownership ownership): link the resource from
the overview SKILL.md, add the router row that mentions workflow-failure,
and insert the overview's own standardized reference sentence verbatim:
the canonical sentence recorded in the architecture document. No other
ticket touches that directory.

## Acceptance criteria

- [ ] `WORKFLOW-INTERNALS.md` exists with all seven sections in order.
- [ ] Both mermaid diagrams parse as mermaid text (no stray characters);
      the artifact tree is ASCII.
- [ ] Every behavior claim in the doc is true of the shipped skills, tests,
      or extension source as they exist today.
- [ ] The overview SKILL.md references the resource, routes to
      workflow-failure in its Actions/read-only tables where relevant, and
      carries the canonical reference sentence verbatim.
- [ ] No other skill directory is modified.
- [ ] The resource is shipped with the package (it lives under a directory
      the package already ships; verified, not assumed).

## Blocked by

- `create-workflow-failure-skill` (the router row and reference name a
  skill that must exist and ship).

Superseded by workflow-internals-reference.
