---
name: finalize-task
description: Autonomous. Run CI gate, harvest knowledge, write changelog, archive task, merge to main. If task belongs to an epic and is the last child, also finalize the epic.
---

# Finalize Task

## Step 0 — Prerequisites

`task_finalizable <slug>` — must return "ready to finalize" (no open slices).

## Step 1 — CI gate

```
git checkout task/{taskSlug}
git merge main 2>/dev/null || true
```

Run the project's CI command (from `task_context` profile or detected from repo tooling). If it fails: STOP. Fix forward on the task branch. Do not merge a red branch.

## Step 2 — Impeccable note check

Check if any `docs/tasks/${taskSlug}/impeccable-note-*.md` files exist.

- **If none exist:** skip this step silently.
- **If any exist:** read them. The handoff notes list UI surfaces that the implementation built as bare-minimum functional HTML/CSS and recommends `/impeccable <command>` calls to refine them.

  Report back to the user:
  > "This task has pending Impeccable handoff notes for UI refinement:
  > <list each note with its suggested commands>
  >
  > Run the suggested commands before finalizing, or tell me to archive the
  > notes unstyled if the design is acceptable as-is."

  Ask the user whether to:
  - Run the suggested `/impeccable` commands now (the agent will route back on completion)
  - Skip / archive the notes as-is (design is acceptable at bare-minimum)
  - Remove specific notes they've already acted on

  Do not proceed past this step without the user's decision.

## Step 3 — Knowledge harvest

Read the task doc, all deviation reports from `{chain_dir}/deviation-reports/` (if available), and the combined diff.

Fold durable knowledge into project docs:
- Update `docs/testing.md` if new patterns/tools were discovered
- Update any other relevant docs under `docs/`
- Append architecture lessons to the task doc's `## Implementation notes`

Also fold in any Impeccable notes that were resolved (user ran the commands):
- If DESIGN.md was updated as part of the design work, note it in the task doc
- Capture any design decisions worth preserving

Commit: `git add -A && git commit -m "docs(task): harvest knowledge for {taskSlug}"`

## Step 4 — Changelog

Write a 3-5 line entry to `docs/tasks/CHANGELOG.md`:
```
## <YYYY-MM-DD> — <title> (<slug>)
<key changes and decisions>. <outcome in one sentence>.
```
If there were UI design notes that were acted on, mention this in the changelog entry.

Commit: `git add docs/tasks/CHANGELOG.md && git commit -m "docs: changelog {taskSlug}"`

## Step 5 — Task deviation → epic (if applicable)

Read the task doc. If it belongs to an epic (`epic:` field):
- Compare the task's original scope against what was actually delivered
- Check if the epic's task list entry needs updating
- Check if the epic's description needs updating
- If deviations found: update the epic doc. If significant: ask user.

## Step 6 — Archive

```
task_epic_tick <epic-slug> {taskSlug}  # if belongs to epic
git mv docs/tasks/{taskSlug}/ docs/tasks/archive/{taskSlug}/
task_state_set task null
task_state_set slice null
git checkout main
git merge --no-ff task/{taskSlug} -m "task: finalize {taskSlug}"
git branch -d task/{taskSlug}
```

If remote exists: `git push origin main`

## Step 7 — Epic finalization (if last child)

If the epic's `task_epic_finalizable` returns ready:
- Summarize the epic to CHANGELOG.md
- Archive the epic: `git mv docs/tasks/epics/<slug>/ docs/tasks/epics/archive/<slug>/`
- Finalize epic doc

## Step 8 — Report

"Task archived, CHANGELOG updated, main branch updated. Epic status: <done/not done>."
