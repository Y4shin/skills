---
name: create-task
description: >
  Launch the create-task chain to interview the user and produce a task doc
  (or epic). Dispatches grill-agent for interview then worker for doc
  creation. Use when starting a new feature, capability, or multi-task outcome.
---

# Create Task (or Epic)

Phase 0: launch the create-task chain — grill-agent interviews the user,
then a worker writes the artifact and slices.

## Prerequisites

`docs/tasks/` exists (run `/skill:onboard-workflow` or `/skill:migrate-workflow`
first). Use `task_list` to avoid slug collisions. Use `task_profile` for
project context. Use `task_reference` for the schema.

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

## Step 1 — Determine scope

Is this a single task or an epic (multi-task outcome)?

- **Single task** → proceed with Step 2.
- **Epic** → use the same chain but seed the grill-agent with epic-level
  context. After the epic doc is written, hand off child tasks serially to
  `/skill:create-task` with `epic: <epic-slug>` seeded.

## Step 2 — Launch the interactive chain

Read `task_profile` and `task_reference`. Construct the chain:

```
subagent({
  async: true,
  chain: [
    {
      agent: "grill-agent",
      task: `Interview the user to define a new task.

Project context (from task_profile):
<... paste task_profile output ...>

Artifact schema reference (from task_reference):
<... paste task_reference output ...>

The user wants to create a new task. Walk the decision tree:
1. Who is the user and what outcome do they get? (user stories)
2. End-to-end behaviour or API surface + first consumer.
3. Layers / surfaces touched — which parts of the system?
4. Boundaries — what's explicitly out of scope.
5. Proposed slice breakdown — independently-mergeable vertical slices.

Explore the codebase to answer what you can. Ask the user one question
at a time via contact_supervisor with a recommended answer and reasoning.
Continue until the decision tree is fully walked.

When done, output a structured interview summary under ## Interview summary
that includes all confirmed decisions and the proposed slice breakdown.`,
      output: "interview/summary.md",
      acceptance: "attested"
    },
    {
      agent: "worker",
      task: `Write a task doc and slice docs from the interview summary.

Read {chain_dir}/interview/summary.md for the interview summary with all confirmed decisions.

1. Determine the task slug (3-5 word kebab of the title, must not collide
   with existing tasks from task_list).

2. Write docs/tasks/<slug>/task.md with frontmatter:
   kind: task
   title: <title>
   slug: <slug>
   slices: []  (will be filled after slice docs are written)
   status: draft
   started_at: <ISO now>
   completed_at: null

   Include sections: Problem/why, User stories/behaviour, End-to-end
   behaviour, Layers touched, Out of scope, Slice breakdown, Open questions,
   Implementation notes.

3. For each slice in the breakdown (in dependency order), write
   docs/tasks/<slug>/slices/<n>-<slice-slug>.md with frontmatter:
   kind: slice
   title: <title>
   slug: <slice-slug>
   task: ../task.md
   mode: hitl | afk
   analysed: false
   status: todo
   size: m  (default; the user adjusts later)
   blocked_by: [<slug>, ...]
   started_at: null
   completed_at: null

   Include: What to build, Acceptance criteria, Blocked by section.

4. Update the task's slices list with task_set_slices.

5. Set task status: task_set <slug> status slices-planned

6. Write state.yaml via task_state_set:
   task_state_set active.task <slug>
   task_state_set last_action create-task created task and slices for <slug>
   task_state_set next_action start-slice <first-slug>

7. Commit: docs(task): add <slug> task with <n> slices.`,
      output: "task/result.md"
    }
  ]
})
```

## Step 3 — Parent loop (handle interactive requests)

Run the shared parent loop to relay grill-agent questions and approval-agent
decisions:

```
const chainRunId = "<id returned by subagent launch>"

while (true) {
  // Supervisor-safe wait: a child blocked in contact_supervisor may not wake
  // an unbounded wait immediately on some pi-subagents versions. Use a short
  // bounded wait, then always inspect pending supervisor requests.
  await wait({ id: chainRunId, timeoutMs: 5000 })

  const pending = await subagent_supervisor({ action: "pending" })
  for (const request of pending) {
    if (request.reason === "interview_request") {
      const { question, context, recommended, reasoning } =
        JSON.parse(request.interview)

      const answer = await ask_user_question({
        header: "Task def",
        question: `**Context:** ${context}\n\n**Question:** ${question}\n\n**Recommended:** ${recommended}\n\n**Reasoning:** ${reasoning}`,
        options: [
          { label: `Accept: ${recommended.slice(0, 55)}`,
            description: "Agree with the recommended answer." },
          { label: "Custom answer",
            description: "Provide a different answer." }
        ]
      })

      await subagent_supervisor({
        action: "reply",
        replyTo: request.id,
        message: JSON.stringify({ answer })
      })
    } else if (request.reason === "need_decision") {
      await subagent_supervisor({
        action: "reply",
        replyTo: request.id,
        message: "approved"
      })
    }
  }

  const chainStatus = await subagent({ action: "status", id: chainRunId })
  if (chainStatus.state === "complete") break
  if (chainStatus.state === "failed" || chainStatus.state === "paused") {
    report: "create-task chain did not complete; inspect status and chain_dir"
    return
  }
}
```

After the chain completes, read `{chain_dir}/task/result.md` and report the
created task with its slices.

## Step 4 — Hand off

Report: task slug, number of slices, first slice slug.
"Next: `/skill:start-slice <first-slug>`."

## Error handling

- If the project has no `docs/tasks/`, run `/skill:onboard-workflow` first.
- If another task is already active, warn before overwriting.
- If the chain fails, inspect `{chain_dir}` for partial output.
- If the grill-agent produces a usable `## Interview summary` but the chain is
  rejected before the worker step, do not re-interview. Re-run only the worker
  step against `{chain_dir}/interview/summary.md` or manually create the task
  artifacts from that summary.
- If status shows a child blocked in `contact_supervisor` but no supervisor
  message is visible, do not wait indefinitely. Call
  `subagent_supervisor({ action: "pending" })`; the bounded wait loop above is
  intentionally used to surface this pi-subagents supervisor-delivery race.

## Learned failure mode

`grill-agent` is an interview/planning step, not an implementation step. It is
expected to finish without repository edits. The chain therefore sets
`acceptance: "attested"` and writes the interview to
`{chain_dir}/interview/summary.md` so the harness does not reject the step for
"completed without making edits" and so recovery can resume from the saved
handoff.

## Constraints

- English only. No speculative scope — anything not justified goes to Open questions.
- The interview is autonomous: grill-agent explores the codebase first, only
  asks the user for things the code can't answer.
