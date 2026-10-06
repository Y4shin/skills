---
type: ticket
subtype: feature
title: Planning transition tools and the ready_for_spec checking tool
status: stable
workflow_state: ready
blocked_by: [schema5-artifact-model]
size: l
---

## What to build

The first half of the named transition surface, covering every planning and
map write. Free `tw_set` is removed here, in this ticket, so the tree has
exactly one kind of writer from this point on.

Add `tw_write_section`, the map-section writer that writes `## Non-goals`
and `## Non-negotiable facts` (including the effort-level success test) and
is the only way a skill updates the map body. Every planning write through
this tool or through a plan write clears `ready_for_spec`, because a
post-reconcile plan change must force one more Wayfinder pass.

Add `tw_finalize_map`, the checking tool that sets `ready_for_spec: true`
on the map frontmatter. It runs every precondition: the planning frontier is
empty, `## Non-goals` exists and is non-empty, and `## Non-negotiable
facts` exists, is non-empty, and names the success test. Any failed check
refuses and reports exactly what is missing. It is the only setter of the
flag, and it sets it last.

Add the planning half of `tw_mark_done`: the preconditions for marking a
planning task done, including that its recorded results were written back to
the map first.

Preconditions read the real tree through the existing `art.ts`/`graph.ts`
seams. No gate logic lives in skill prose.

## Acceptance criteria

- [ ] `tw_set` is gone from the registered surface; no test or skill depends
      on it.
- [ ] `tw_write_section` writes both map sections and clears
      `ready_for_spec` on every map or plan write, including a reordered
      success test or a reopened task.
- [ ] `tw_finalize_map` refuses with a named missing item when the planning
      frontier is non-empty, `## Non-goals` is missing or empty, or
      `## Non-negotiable facts` is missing, empty, or lacks a success test.
- [ ] `tw_finalize_map` sets the flag only when every check passes, and sets
      it last.
- [ ] A post-reconcile plan edit clears the flag, so `to-spec` would be
      refused again.
- [ ] Every writer that can change the plan clears the flag.
- [ ] Tool-contract tests drive the real factory over fixture trees.

## Blocked by

- schema5-artifact-model (the model must read `ready_for_spec` and the
  section names before the writing tool can set them).

## Implementation notes

- Landed `ticket/planning-transition-tools` into `task/planning-transition-tools`
  (no-ff) at `e6ea48c`, five wip commits on top of the `migrate-v4-to-v5`
  landing. `tw_set` is removed from the registered surface; `tw_write_section`,
  `tw_finalize_map`, and planning `tw_mark_done` (with the write-back
  precondition and `ready_for_spec` auto-clear) are in. Full suite after the
  merge: 866 passed, 0 failed, 17 files; typecheck clean.
- Divergences recorded in the deviation report
  (`deviation-reports/planning-transition-tools.md`), notably: the section
  writer accepts any named `##` section so wayfinder write-backs work, the
  write-back precondition is a slug-token reference in the map body, and
  planning done-marking also clears `ready_for_spec`.
