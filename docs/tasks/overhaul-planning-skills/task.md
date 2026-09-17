---
kind: task
type: feature
slug: overhaul-planning-skills
title: Planning-side skills to v4 (wayfinder, to-spec, to-tickets, doctor, router)
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-tw-rename
slices: [overhaul-planning-skills]
---

## What to build

The planning side of the flow rewritten for the v4 tree, writing
conformant artifacts by construction.

Wayfinder: decision items become tasks under the effort's tasks/
subtree with v4 frontmatter (type, title, subtype, status,
workflow_state, blocked_by; the old kind, slug, and map fields
gone); the feature and bug planning resources are deleted (feature
and bug creation is to-tickets' job, aligned with its Boundary);
the state pointers (effort and task) are set on map creation and on
resume; the root index is regenerated on map creation.

To-spec: writes spec.md with v4 frontmatter (type, title, status)
inside the effort directory.

To-tickets: writes tickets under the effort's tickets/ subtree as
ticket.md with v4 frontmatter (type, title, subtype feature or bug,
status, workflow_state, blocked_by, optional mode, optional size
defaulting to m); stops emitting the killed slice-list field; its
advertised contract is corrected to the truth: files are written by
hand, the tools make the resulting graph queryable.

Doctor: gains a conformance symptom (frontmatter presence,
non-empty type, combination rules) routing to the migration or the
responsible producer skill.

The router map (task-workflow-overview) tells the truth about the
new flow.

## Acceptance criteria

- [ ] Wayfinder produces v4-conformant task files; the feature/bug
      planning resources are gone.
- [ ] State pointers are set on create and resume.
- [ ] The root index regenerates on map creation.
- [ ] To-tickets produces v4 ticket.md files with no slice-list
      field and an honest contract description.
- [ ] To-spec writes frontmattered spec.md.
- [ ] The doctor reports a planted conformance failure and routes
      it (migration or producer skill).
- [ ] The router map describes the v4 flow accurately.
- [ ] Structure tests cover skill registration facts and the
      deleted resources.

## Blocked by

- overhaul-tw-rename (prose is written against final tool names).
