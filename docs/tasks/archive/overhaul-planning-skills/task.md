---
kind: task
type: feature
slug: overhaul-planning-skills
title: Planning-side skills to v4 (wayfinder, to-spec, to-tickets, doctor, router)
map: task-tools-overhaul
status: done
blocked_by:
- overhaul-tw-rename
slices:
- overhaul-planning-skills
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

## Implementation notes

### Slice - overhaul-planning-skills (landed)

Landed on `slice/overhaul-planning-skills` (7 commits, merged into
`task/overhaul-planning-skills`). All eight acceptance criteria landed
test-first in the arch spec's two seams: structure tests in
`tests/skills.test.ts` and tool tests against the v4 fixtures in
`tests/plugin.test.ts`. Gates on the merged branch: 716/716 tests (15
files), `tsc --noEmit` clean; no lint script is configured (typecheck is
the designated gate). Verified independently before landing: same
numbers on the slice branch.

What landed: wayfinder rewritten to the v4 tree (map and decision-task
templates, state pointers set on create and resume, root index step,
the four planning resources moved to v4 templates, `feature.md` and
`bug.md` deleted with feature/bug creation routed to
`/skill:to-tickets`); to-spec writes a frontmattered `spec.md` at the
effort root; to-tickets writes v4 `ticket.md` files with no `slices:`
field and an honest by-hand contract; the doctor gained the OKF
conformance symptom with `resources/okf-conformance-failure.md`
(detection plus per-producer routing) and a v4-rewritten
`missing-tasks-tree.md`; the router tells the v4 story. A
template-conformance seam extracts every frontmatter template from the
five skills' prose plus the four planning resources, substitutes them,
and runs them through the repo's own `parse` + `fromFrontmatter` +
`validateArtifact` + `findAnomalies` with zero anomalies, so prose and
engine rules cannot drift silently.

Carried forward, in priority order:

1. **`tw_list` interface change.** The `map` param is replaced by
   `effort`, `kind` is widened to map|task|ticket|spec, and a
   `workflow_state` filter is added; the implementation is rebuilt on
   the scan layer, excluding any `archive/` path. The v3 plugin test
   "filters by map" flipped to "filters by effort". As a consequence,
   listings on pre-migration v3 trees now include legacy
   `slices/<n>-*.md` files as `(slice)` rows (the `kind` enum has no
   `slice`, so they cannot be kind-filtered). overhaul-execution-skills
   and overhaul-dead-surface should pick this up deliberately.
2. **Docs pages deferred (arch spec approval decision 2).** The docs
   pages for wayfinder, to-spec, to-tickets, task-workflow-doctor, and
   task-workflow-overview are stale relative to their SKILL.md until a
   follow-up docs backfill task runs. Not lost here: it must be
   planned as its own follow-up.
3. **To-spec approval flip needs the full spec path.**
   `tw_set docs/tasks/<effort>/spec.md status stable`, because a bare
   slug shared with `map.md` resolves to the map (resolver type
   priority prefers map). The prose shows the path form.
4. **The doctor's bash sweep is illustrative prose.** Quoted or exotic
   YAML is not matched by it; the engine-level checks (`tw_frontier`
   Anomalies, `findAnomalies`) are the real gate. The sweep also
   includes `archive/` (a deliberate reading, documented in the
   resource).
5. **The repo's own `docs/tasks` tree stays v3 by design** until the
   user runs `/skill:setup-workflow` (migrate branch of the overhaul).

### Finalize harvest

Whole-task code review (fresh-context, two-axis): merge verdict OK with
notes; no P0s, the spec axis clean. The one P1 (an em-dash in the new
deviation report's title, plus the same character in the
deviation-reporter agent template that kept generating it) is fixed,
along with the small test smells (helper extraction, renames); the
whole-task diff now carries zero em-dashes on added lines.

The docs-page deferral is now tracked: the map carries
`backfill-skill-docs-pages` (blocked by overhaul-dead-surface) per the
arch spec approval decision 2.

Durable testing patterns folded into `docs/testing.md` (Skill prose
testing): producer prose is tested by running its extracted frontmatter
templates through the repo's own conformance engine, and rewritten
prose carries a surviving-tool allowlist assertion.
