---
name: land-slice
description: >
  Merge a verified slice into its task integration branch with a conventional
  commit, record timestamps, archive the slice doc, clean up the feature
  branch, and update state. Called by implement-slice after verify-slice passes.
---

# Land Slice — Merge and archive

## Prerequisites

`verify-slice` has passed. On branch `slice/<slug>`.

## Steps

1. **Merge.** Construct commit message: `slice(<task-slug>): <slice title>`.

   ```bash
   git checkout task/<task-slug>
   git merge --no-ff slice/<slug> -m "slice(<task-slug>): <slice title>"
   git branch -d slice/<slug>
   ```

2. **Record completion.** Use `task_set` on the slice doc:
   - `task_set <slice-path> status done`
   - `task_set <slice-path> completed_at <ISO now>`

3. **Append implementation note.** Add a 2–4 line note to the task's
   `## Implementation notes`: what was built, any decisions made. If any
   coding guidelines were broken (see `get_guidelines` / `list_guidelines`),
   include a line explaining which rule was broken and why — this ensures
   the user sees it in the work summary rather than buried in tool call
   output.

4. **Archive the slice.** Use `archive-artifact <slice-path>`.

5. **Commit.** `docs(slice): land <slice-slug> into <task-slug>`.

6. **Update state.** Check if more slices remain (`task_slices <task-slug>`):
   - **If last slice:** `task_set <task-slug> status done` and
     `task_set <task-slug> completed_at <ISO now>`. Set `task_state_set next_action finalize-task <task-slug>`.
   - **If more remain:** Set `task_state_set next_action start-slice <next-slug>`.
   Clear `active.slice` via `task_state_set active.slice null`.

**Handoff:** Reports what's next — either "all slices done" or "next slice."
