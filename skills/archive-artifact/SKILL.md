---
name: archive-artifact
description: >
  Move a done slice, task, or epic to its archive directory using git mv.
  Called by land-slice (for slices) and finalize-task (for tasks and epics).
  Can also be invoked directly to archive any artifact.
---

# Archive Artifact

## Steps

1. Determine artifact kind from frontmatter (`task_assert_kind <selector>`).

2. **Slice:** `git mv docs/tasks/<task-slug>/slices/<n>-<slug>.md
   docs/tasks/<task-slug>/slices/archive/<n>-<slug>.md`
   (Create `archive/` dir if missing with `mkdir -p`.)

3. **Task:** `git mv docs/tasks/<slug>/ docs/tasks/archive/<slug>/`

4. **Epic:** `git mv docs/tasks/epics/<slug>/
   docs/tasks/epics/archive/<slug>/`

5. Report what was archived and where.