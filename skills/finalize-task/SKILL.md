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

## Step 2 — Knowledge harvest

Read the task doc, all deviation reports from `{chain_dir}/deviation-reports/` (if available), and the combined diff.

Fold durable knowledge into project docs:
- Update `docs/testing.md` if new patterns/tools were discovered
- Update any other relevant docs under `docs/`
- Append architecture lessons to the task doc's `## Implementation notes`

Commit: `git add -A && git commit -m "docs(task): harvest knowledge for {taskSlug}"`

## Step 3 — Changelog

Write a 3-5 line entry to `docs/tasks/CHANGELOG.md`:
```
## <YYYY-MM-DD> — <title> (<slug>)
<key changes and decisions>. <outcome in one sentence>.
```

Commit: `git add docs/tasks/CHANGELOG.md && git commit -m "docs: changelog {taskSlug}"`

## Step 4 — Task deviation → epic (if applicable)

Read the task doc. If it belongs to an epic (`epic:` field):
- Compare the task's original scope against what was actually delivered
- Check if the epic's task list entry needs updating
- Check if the epic's description needs updating
- If deviations found: update the epic doc. If significant: ask user.

## Step 5 — Archive

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

## Step 6 — Epic finalization (if last child)

If the epic's `task_epic_finalizable` returns ready:
- Summarize the epic to CHANGELOG.md
- Archive the epic: `git mv docs/tasks/epics/<slug>/ docs/tasks/epics/archive/<slug>/`
- Finalize epic doc

## Step 7 — Report

"Task archived, CHANGELOG updated, main branch updated. Epic status: <done/not done>."