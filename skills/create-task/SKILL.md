---
name: create-task
description: >
  Launch the create-task chain to interview the user and produce a task doc
  (or epic) with slice docs that include full test plans. This is the ONLY
  interactive phase — after this, implementation runs autonomously.
  Dispatches two grill-agents (task definition + per-slice testing strategy),
  test-strategist, approval-agent, and worker.
  Use when starting a new feature, capability, or multi-task outcome.
---

# Create Task (or Epic)

Phase 0: launch the create-task chain — two focused grill-agents interview
the user (task definition, then per-slice testing strategy), test-strategist
writes test plans, approval-agent presents everything for one-shot approval,
then a worker writes the artifacts.

Once this completes, slices are ready for autonomous implementation —
no further analysis or approval steps needed.

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
- **Epic** → use the same chain but seed the grill-agents with epic-level
  context. After the epic doc is written, hand off child tasks serially to
  `/skill:create-task` with `epic: <epic-slug>` seeded.

## Step 2 — Launch the interactive chain

Read `task_profile` and `task_reference`. Construct the chain:

```
const profileOutput = bash("task_profile")
const referenceOutput = bash("task_reference")

// Read the chain definition from the extracted chain file
const chainDef = JSON.parse(bash("cat chains/create-task.chain.json"))

// Substitute runtime values into step tasks
const steps = chainDef.steps.map(step => ({
  ...step,
  task: step.task
    .replaceAll("{task_context}", profileOutput)
    .replaceAll("{task_reference}", referenceOutput)
}))

subagent({
  async: true,
  timeoutMs: chainDef.timeoutMs,
  turnBudget: chainDef.turnBudget,
  control: { enabled: true, needsAttentionAfterMs: 300_000, notifyChannels: ["event"] },
  chain: steps
})
```

## Step 3 — Parent loop (handle interactive requests)

Run the shared parent loop to relay grill-agent questions. The approval-agent writes
the plan to its output file; the parent handles the review cycle via the plan review tools.

```
const chainRunId = "<id returned by subagent launch>"

while (true) {
  await wait({ id: chainRunId })

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
      // Handle legacy need_decision (some agents may still use it)
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

After the chain completes, handle the approval result via plan review.

```
const planPath = "{chain_dir}/approval/result.md"
const planExists = bash(`test -f ${planPath} && echo yes || echo no`).trim()

if (planExists === "yes") {
  const submitResult = submit_plan_for_review({ planFilePath: planPath })
  report: submitResult
  
  const slugMatch = submitResult.match(/plans\/([a-zA-Z0-9_-]+)\.md/)
  const slug = slugMatch ? slugMatch[1] : null

  if (slug) {
    // Review loop
    while (true) {
      await ask_user_question({
        header: "Plan reviewed?",
        question: `Have you finished reviewing the plan at plans/${slug}.md?`,
        options: [
          { label: "Yes, parse it", description: "Parse the reviewed plan." },
          { label: "Not yet", description: "Keep the file open." }
        ]
      })

      const parseResult = parse_plan_review({ slug })

      if (parseResult.startsWith("ERROR:")) {
        report: parseResult
        continue  // Let user fix and retry
      }

      report: parseResult

      if (parseResult.startsWith("OK: accepted")) break
      if (parseResult.startsWith("OK: discarded")) {
        report: "Plan review discarded."
        return
      }
      if (parseResult.startsWith("OK: rejected")) {
        const feedbackLines = parseResult.split("\n").filter(l => l.startsWith("line "))
        // Relaunch approval-agent with feedback
        subagent({
          async: true,
          chain: [{
            agent: "skills.approval-agent",
            as: "approval-revision",
            phase: "Approval",
            label: "Revise plan from feedback",
            task: `Revise the plan at {chain_dir}/approval/result.md.\n\nFeedback:\n${feedbackLines.join("\n")}`,
            output: "approval/result.md"
          }]
        })
        await wait({ all: true })
        // Re-submit
        const newResult = submit_plan_for_review({ planFilePath: planPath })
        report: newResult
        continue
      }
      break
    }
  }
}
```

After the chain and review complete, read `{chain_dir}/task/result.md` and report the
created task with its slices (each now has a test plan, `analysed: true`,
`status: todo`).

## Step 4 — Hand off

Report: task slug, number of slices, note that all slices have test plans.

"Task is fully planned with test strategies. Next: `/skill:pipeline-slices <slug>` to implement all slices, or `/skill:implement-slice <first-slug>` to do them one at a time."

## Error handling

- If the project has no `docs/tasks/`, run `/skill:onboard-workflow` first.
- If another task is already active, warn before overwriting.
- If the chain fails, inspect `{chain_dir}` for partial output.
- If either grill-agent produces a usable summary but the chain is rejected
  before the worker step, do not re-interview. Re-run only from the failed
  step onward using the saved summaries in `{chain_dir}`.
- If status shows a child blocked in `contact_supervisor` but no supervisor
  message is visible, do not wait indefinitely. Call
  `subagent_supervisor({ action: "pending" })`; the event-driven wait loop above is
  intentionally used to surface this pi-subagents supervisor-delivery race.

## Constraints

- English only. No speculative scope — anything not justified goes to Open questions.
- The interview is autonomous: grill-agents explore the codebase first, only
  ask the user for things the code can't answer.
- Two separate grill-agents keep context focused: the first defines the task
  and slice breakdown; the second (with that breakdown in hand) designs the
  testing strategy for each slice. Each has a clean, focused session.
- This is the ONLY interactive phase. After create-task completes, implementation
  runs autonomously via `/skill:pipeline-slices` or `/skill:implement-slice`.
  No per-slice interviews or approvals are needed.
- Slices are created with `analysed: true, status: todo` — ready for immediate
  implementation.