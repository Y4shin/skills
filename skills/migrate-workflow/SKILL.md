---
name: migrate-workflow
description: >
  Migrate a repository from the old prd-workflow (docs/prd/ directory, forge
  issue tracking) to the new task-workflow (docs/tasks/ directory, internal
  tracking only, archive model). Handles renaming, frontmatter updates, forge
  cleanup, and directory restructuring. Use on repos that already have
  docs/prd/. For fresh repos, use /skill:onboard-workflow instead.
---

# Migrate Workflow — From prd-workflow to task-workflow

## Steps

0. **Remote sync check.**

   ```
   git fetch origin
   ```

   If remote has commits ahead (`git rev-list --count HEAD..@{u}` > 0),
   **stop and ask** before proceeding:

   ```
   const ahead = parseInt(bash("git rev-list --count HEAD..@{u}"))
   if (ahead > 0) {
     const action = await ask_user_question({
       header: "Remote ahead",
       question: `Remote origin/main has ${ahead} new commit(s) not in
your local branch. Pull before continuing?`,
       options: [
         { label: "Pull now",
           description: "Run git pull --rebase to sync." },
         { label: "Skip — continue anyway",
           description: "Proceed without pulling." }
       ]
     })
     if (action === "Pull now") bash("git pull --rebase")
   }
   ```

   If pull fails with conflicts, stop — resolve manually.

1. **Inventory.** Run `task_lint` on the old `docs/prd/` tree. List all
   artifacts: PRDs, epics, slices. For each, note the current forge issue
   numbers (they'll be dropped).

2. **Confirm.** Present the migration plan:
   - N PRDs → N tasks
   - M slices (will keep slugs, drop issue numbers)
   - E epics
   - Forge issues will be referenced in migration notes but no longer tracked.
   Ask: "Proceed with migration? Forge issues will not be modified — you must
   close them manually if desired."

3. **Create new structure.** Run `onboard-workflow` steps 2–4 internally to
   create `docs/tasks/` if it doesn't exist.

4. **Migrate each artifact:**

   **PRD → Task:** `git mv docs/prd/<slug>/prd.md docs/tasks/<slug>/task.md`.
   Update frontmatter: `kind: prd` → `kind: task`. Drop `prd_issue`,
   `milestone`. Convert `slices: [<#a>, <#b>]` to `slices: [<slug-a>,
   <slug-b>]` (resolve each issue number to the corresponding slice slug).
   Keep `status`, `epic` references.

   **Slice:** `git mv docs/prd/<slug>/slices/<n>-<old-slug>.md
   docs/tasks/<slug>/slices/<n>-<slug>.md`. Update frontmatter:
   `kind: prd` → `kind: slice`. Drop `issue`. Update `prd: ../prd.md` →
   `task: ../task.md`. Add `status: done` if previously completed,
   `status: todo` otherwise. Add `blocked_by: []`. Add `size: m` (default).

   **Epic:** `git mv docs/prd/epics/<slug>/epic.md
   docs/tasks/epics/<slug>/epic.md`. Update frontmatter: drop
   `epic_milestone`. In `prds:` → `tasks:`, drop `issue` from each child.

5. **Archive completed artifacts.** For any artifact with `status: done`:
   - If slice: `archive-artifact <slice-path>`
   - If task: `archive-artifact <task-slug>`
   - If epic: `archive-artifact <epic-slug>`

6. **Write migration note.** Append to `docs/tasks/CHANGELOG.md`:
   ```markdown
   ## <date> — Migration from prd-workflow

   Migrated N tasks, M slices, E epics from docs/prd/ to docs/tasks/.
   Forge issue tracking dropped. See git history for old issue references.
   ```

7. **Clean up.** `git rm -r docs/prd/`.

8. **Set state.** Write `state.yaml`:
   - `task_state_set last_action migrate-workflow completed`
   - `task_state_set next_action ""`

   Commit: `chore: migrate from prd-workflow to task-workflow`.

9. **Report.** Summary of what was migrated, what was archived, and what forge
   issues the user may want to close manually.

**Handoff:** → `resume-workflow`