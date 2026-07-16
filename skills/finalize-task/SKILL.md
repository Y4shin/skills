---
name: finalize-task
description: >
  Launch the finalize-task chain to close out a completed task. Dispatches
  worker (CI gate + harvest) → task-summarizer (changelog) → worker (archive
  + epic tick + merge). If the task belongs to an epic and it's the last
  child, also finalize the epic.
---

# Finalize Task (or Epic) — Chain

Phase 3: launch the finalize-task chain — worker runs CI and harvests
knowledge, task-summarizer writes the changelog entry, worker archives
the task and integrates into main.

## Prerequisites

All slices archived. `task.md` has `status: done` and `## Implementation notes`.
Use `task_profile` for knowledge destinations and CI commands.

## Step 0 — Pre-flight (remote sync check)

Before doing any work, check whether the local branch is behind the remote:

```
git fetch origin
```

If the remote has commits ahead of local (`git rev-list --count HEAD..@{u}`
is non-zero), **stop and ask the user** before proceeding:

```
const ahead = parseInt(bash("git rev-list --count HEAD..@{u}"))
if (ahead > 0) {
  const action = await ask_user_question({
    header: "Remote ahead",
    question: `Remote origin/main has ${ahead} new commit(s) not in your
local branch. Pull before continuing?`,
    options: [
      { label: "Pull now",
        description: "Run git pull --rebase to sync before starting." },
      { label: "Skip — continue anyway",
        description: "Proceed without pulling. You may get conflicts later." }
    ]
  })

  if (action === "Pull now") {
    bash("git pull --rebase")
  }
  // If skip, proceed with a warning but don't block.
}
```

If the pull fails with conflicts, stop — the user must resolve them manually.

## Step 1 — Validate prerequisites

```
task_finalizable <slug>
```

If it reports open slices, list them and **stop**.

## Step 2 — Launch the finalization chain

```
const taskSlug = "<task-slug>"
const taskPath = "docs/tasks/<task-slug>/task.md"

subagent({
  async: true,
  chain: [
    {
      agent: "worker",
      task: `Run the CI gate and harvest knowledge for task "${taskSlug}".

Task doc: ${taskPath}

1. Checkout and sync:
   git checkout task/${taskSlug}
   git merge main 2>/dev/null || true

2. Run the project's full CI command (from task_profile or detected from
   repo tooling). If it fails: STOP. Report failures. Do not proceed.

3. Read ${taskPath} in full, especially ## Implementation notes.
   Review the branch diff:
   git log --oneline --no-merges main..task/${taskSlug}

4. Fold durable knowledge into the project's permanent docs:
   - Update docs/testing.md if this task introduced new testing patterns,
     tools, conventions, or infrastructure lessons.
   - Update any other project docs as needed.

5. Commit the harvested changes onto the task branch.`,
      output: "ci-harvest/result.md"
    },
    {
      agent: "task-summarizer",
      task: `Write a changelog entry for task "${taskSlug}".

Task doc: ${taskPath}

1. Read the task doc — capture title, problem statement, implementation notes.
2. Review git log: git log --oneline --no-merges main..task/${taskSlug}
3. Draft a 3-5 line summary: date, title, key changes, outcome.
4. Append to docs/tasks/CHANGELOG.md as:
   ## <YYYY-MM-DD> — <title> (\`<slug>\`)
   <Key changes and decisions>. <Outcome in one sentence>.

5. Commit the changelog update.`,
      output: "summary/result.md"
    },
    {
      agent: "worker",
      task: `Archive task "${taskSlug}" and integrate into main.

Task doc: ${taskPath}

1. If this task belongs to an epic (check epic field in frontmatter):
   - task_epic_tick <epic-slug> ${taskSlug}
   - If task_epic_finalizable <epic-slug> returns ready:
     a. task_set <epic-slug> completed_at <ISO now>
     b. git mv docs/tasks/epics/<epic-slug>/ docs/tasks/epics/archive/<epic-slug>/
     c. Summarize the epic to CHANGELOG.md

2. Archive the task:
   git mv docs/tasks/${taskSlug}/ docs/tasks/archive/${taskSlug}/

3. Clear state:
   task_state_set active.task null
   task_state_set active.slice null
   task_state_set last_action finalize-task completed ${taskSlug}
   task_state_set next_action ""
   (Keep active.epic if more tasks remain under the epic.)

4. Integrate into main:
   git checkout main
   git merge --no-ff task/${taskSlug} -m "task: finalize ${taskSlug}"
   git branch -d task/${taskSlug}
   (If remote exists, push main.)

5. Commit: docs(task): finalize ${taskSlug}`,
      output: "archive/result.md"
    }
  ]
})
```

## Step 3 — Wait for completion

```
await wait({ all: true })
```

Read `{chain_dir}/archive/result.md` to confirm archiving and integration.

## Step 4 — Report

Report: task archived, CHANGELOG updated, epic status (if any), main branch
updated.

## Error handling

- Never finalize partial work — Step 1 is a hard gate.
- If CI fails, fix forward on the task branch — never merge a red branch.
- The task archive is a git mv, preserving history.
- If the task has no `## Implementation notes`, the worker will add them from
  the git log before harvesting.

## Constraints

- CI must be green before archiving.
- Knowledge harvesting is mandatory — every task leaves the docs better than it found them.
- No per-task PR — only the finalize merge goes to main.
