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

// Read the chain definition from the extracted chain file
const chainDef = JSON.parse(bash("cat chains/finalize-task.chain.json"))

// Substitute runtime variables into step tasks
const steps = chainDef.steps.map(step => ({
  ...step,
  task: step.task
    .replaceAll("{taskSlug}", taskSlug)
    .replaceAll("{taskPath}", taskPath)
}))

subagent({
  async: true,
  timeoutMs: chainDef.timeoutMs,
  turnBudget: chainDef.turnBudget,
  chain: steps
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
