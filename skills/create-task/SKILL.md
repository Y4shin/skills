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
subagent({
  async: true,
  timeoutMs: 600_000,
  turnBudget: { maxTurns: 50, graceTurns: 6 },
  control: { enabled: true, needsAttentionAfterMs: 300_000, notifyChannels: ["event"] },
  chain: [
    {
      agent: "skills.grill-agent",
      as: "task-summary",
      phase: "Planning",
      label: "Interview: define task and slice breakdown",
      task: `Interview the user to define a new task.

Project context (from task_profile):
<... paste task_profile output ...>

Artifact schema reference (from task_reference):
<... paste task_reference output ...>

Walk the task definition decision tree:
1. Who is the user and what outcome do they get? (user stories)
2. End-to-end behaviour or API surface + first consumer.
3. Layers / surfaces touched — which parts of the system?
4. Boundaries — what's explicitly out of scope.
5. Proposed slice breakdown — independently-mergeable vertical slices
   in dependency order.

Explore the codebase to answer what you can. Ask the user one question
at a time via contact_supervisor with a recommended answer and reasoning.
Continue until the decision tree is fully walked.

When done, output a structured summary under ## Task definition that
includes all confirmed decisions and the proposed slice breakdown
(with slice slugs and a one-line description of each).`,
      output: "interview/task-summary.md",
      acceptance: {
        level: "none",
        reason: "planning/interview step only; final worker verifies the handoff"
      }
    },
    {
      agent: "skills.grill-agent",
      as: "testing-summary",
      phase: "Planning",
      label: "Interview: testing strategy per slice",
      task: `Interview the user about testing strategy for every slice.

Read {chain_dir}/interview/task-summary.md for the task definition and
slice breakdown confirmed in the previous step.

Project context (from task_profile):
<... paste task_profile output ...>

For EACH slice in the breakdown (in dependency order):
1. Which layers does this slice touch end-to-end?
2. What are the failure modes? What can break? (at least two concrete modes)
3. Testing approach: test types (unit/integration/e2e), scope, dependency
   strategy (mocks vs real), key scenarios, edge cases, error handling.

Explore the codebase to answer what you can. Ask the user one question
at a time via contact_supervisor with a recommended answer and reasoning.
Continue until all slices are covered.

When done, output a structured summary under ## Per-slice testing strategy
that includes, for each slice: layer analysis, confirmed failure modes
(at least two), testing approach, and any user preferences or constraints.`,
      output: "interview/testing-summary.md",
      acceptance: {
        level: "none",
        reason: "planning/interview step only; final worker verifies the handoff"
      }
    },
    {
      agent: "skills.test-strategist",
      as: "strategy",
      phase: "Planning",
      label: "Write test plans from interviews",
      outputMode: "file-only",
      task: `Write a test plan for every slice from the interview summaries.

Read {chain_dir}/interview/task-summary.md for the task definition
and slice breakdown.

Read {chain_dir}/interview/testing-summary.md for per-slice layer
analysis, failure modes, and testing approach.

For EACH slice in the breakdown:
1. Write a ## Test plan section. Cover: test types, scope, dependency
   strategy, key scenarios, edge cases, error handling, failure mode
   coverage, and the run command to execute.
2. Every test scenario must derive from the slice's acceptance criteria
   and confirmed failure modes.
3. Write the test plan to {chain_dir}/test-plans/<n>-<slice-slug>.md
   (one file per slice). The final worker will copy them into the
   actual slice docs.

If you have uncertainties, include ## Questions for the user in your output.`,
      output: "strategy/result.md",
      acceptance: {
        level: "none",
        reason: "planning-doc update only; parent approval and final checks verify the result"
      }
    },
    {
      agent: "skills.approval-agent",
      as: "approval",
      phase: "Approval",
      label: "User approves all test strategies",
      outputMode: "file-only",
      task: `Present the COMPLETE testing strategy for ALL slices and get
one-shot user approval.

Read every test plan from {chain_dir}/test-plans/.
Read the slice breakdown from {chain_dir}/interview/task-summary.md.

If the test-strategist left ## Questions for the user, resolve each one via
contact_supervisor({ reason: "interview_request" }) one at a time.

Once all questions are resolved, present EVERY slice's ENTIRE test strategy
(all test plan files) to the user for final verification via
contact_supervisor({ reason: "need_decision" }).

If changes are requested, update the affected test plan files in
{chain_dir}/test-plans/ and re-present. Loop until approved or
changes exhausted.`,
      output: "approval/result.md",
      acceptance: {
        level: "none",
        reason: "interactive approval step; supervisor approval is the acceptance signal"
      }
    },
    {
      agent: "skills.worker",
      as: "task-artifacts",
      phase: "Landing",
      label: "Create task and slice docs",
      outputMode: "file-only",
      task: `Create the task doc and all slice docs with their approved test plans.

Read {chain_dir}/approval/result.md to confirm approval.
Read {chain_dir}/interview/task-summary.md for the task definition.
Read every test plan from {chain_dir}/test-plans/.

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
   analysed: true
   status: todo
   size: m  (default; the user adjusts later)
   blocked_by: [<slug>, ...]
   started_at: null
   completed_at: null

   Include: What to build, Acceptance criteria, Blocked by section, and
   the ## Test plan section copied from {chain_dir}/test-plans/<n>-<slice-slug>.md.

4. Update the task's slices list with task_set_slices.

5. Set task status: task_set <slug> status slices-planned

6. Write state.yaml via task_state_set:
   task_state_set active.task <slug>
   task_state_set last_action create-task created task and <n> slices with test plans for <slug>
   task_state_set next_action pipeline-slices <slug>

7. Commit: docs(task): add <slug> task with <n> slices and test plans.`,
      output: "task/result.md"
    }
  ]
})
```

## Step 3 — Parent loop (handle interactive requests)

Run the shared parent loop to relay grill-agent questions and approval-agent
decisions. Both grill-agents use `interview_request`; the approval-agent uses
`need_decision`.

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
      // approval-agent is presenting ALL slice test strategies for final
      // verification. All questions have been resolved and incorporated.
      const decision = await ask_user_question({
        header: "Verify",
        question: `Review the complete test strategy for ALL slices below:\n\n${request.message}\n\nApprove these test strategies?`,
        options: [
          { label: "Approved",
            description: "Accept all test strategies as written." },
          { label: "Request changes",
            description: "Describe what needs to change." }
        ]
      })

      if (decision === "Approved") {
        await subagent_supervisor({
          action: "reply",
          replyTo: request.id,
          message: "approved"
        })
      } else {
        await subagent_supervisor({
          action: "reply",
          replyTo: request.id,
          message: `changes: ${decision}`
        })
      }
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