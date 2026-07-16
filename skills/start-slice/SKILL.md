---
name: start-slice
description: >
  Launch the start-slice chain to analyse a slice, determine failure modes,
  design a test strategy, and get user approval. Dispatches grill-agent →
  test-strategist → approval-agent → worker. Use before implement-slice.
---

# Start Slice — Test Strategy (Chain)

Phase 1.5: launch the start-slice chain — grill-agent explores layers and
failure modes, test-strategist writes a test plan draft, approval-agent
presents it for user approval, then a worker persists it.

## Prerequisites

Slice doc exists with `analysed: false`. Use `task_profile` for test
infrastructure conventions. Use `task_reference` for the slice lifecycle.

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

## Step 1 — Fetch context

Read the task's `task.md` and the slice doc at
`docs/tasks/<task-slug>/slices/<n>-<slug>.md` in full.

Read `task_profile` and `task_reference`.

## Step 2 — Launch the interactive chain

Construct the chain, passing the task and slice context:

```
const sliceDoc = `<contents of the slice doc>`
const taskDoc = `<contents of the task.md>`
const profile = `<task_profile output>`
const reference = `<task_reference output>`

subagent({
  async: true,
  chain: [
    {
      agent: "grill-agent",
      task: `Analyse a slice for a task-workflow project and identify its layers
and failure modes.

Task context:
${taskDoc}

Slice doc:
${sliceDoc}

Project profile:
${profile}

Your job:
1. Read the task and slice docs carefully. Explore the codebase to identify
   which layers / surfaces this slice touches end-to-end.
2. Walk the failure-mode tree: what can break? Identify at least two concrete
   failure modes.
3. Ask the user one question at a time via contact_supervisor. For each:
   - If you can answer from the codebase: do it. Move on.
   - If you need the user: give a recommended answer with reasoning.
4. Continue until both questions are resolved:
   a. "What does this slice touch end-to-end? Which layers?"
   b. "What are the failure modes? What can break?"

When done, output a structured summary under ## Interview summary that includes:
- Confirmed layer analysis
- Confirmed failure modes (at least two)
- Any user preferences or constraints discovered`,
      output: "grill/analysis.md",
      acceptance: {
        level: "none",
        reason: "planning/interview step only; workflow-level checks verify the handoff"
      }
    },
    {
      agent: "test-strategist",
      task: `Design a testing strategy for this slice.

Read {chain_dir}/grill/analysis.md for the confirmed layer analysis and
failure modes.

Slice doc path: docs/tasks/<task-slug>/slices/<n>-<slug>.md

Generate a comprehensive test plan covering test types, scope, dependency
strategy, key scenarios, edge cases, error handling, and failure mode
coverage. Persist it as a ## Test plan section in the slice doc.

If you have uncertainties, include ## Questions for the user in your output.`,
      output: "strategy/result.md",
      acceptance: {
        level: "none",
        reason: "planning-doc update only; parent approval and final checks verify the result"
      }
    },
    {
      agent: "approval-agent",
      task: `Present the test strategy and get user approval.

Read the test plan from the slice doc at docs/tasks/<task-slug>/slices/<n>-<slug>.md.

If the test-strategist included ## Questions for the user, resolve each one
via contact_supervisor({ reason: "interview_request" }) one at a time. After
each answer, incorporate it into the test plan in the slice doc.

Once all questions are resolved, present the ENTIRE test strategy (not a
summary — the full test plan as written in the slice doc) to the user for
final verification via contact_supervisor({ reason: "need_decision" }).

If changes are requested, update the slice doc with edit and re-present.
Loop until approved or changes exhausted.`,
      output: "approval/result.md",
      acceptance: {
        level: "none",
        reason: "interactive approval step; supervisor approval is the acceptance signal"
      }
    },
    {
      agent: "worker",
      task: `Finalise the approved test strategy.

1. Read {chain_dir}/approval/result.md to confirm approval.
2. Verify the ## Test plan section exists in the slice doc.
3. Set frontmatter on the slice doc:
   - task_set <slice-path> analysed true
   - task_set <slice-path> status in-progress
   - task_set <slice-path> started_at <ISO now>
4. Update state.yaml:
   - task_state_set active.slice <slice-slug>
   - task_state_set last_action start-slice analysed <slice-slug>
   - task_state_set next_action implement-slice <slice-slug>
5. Commit: docs(slice): add test plan for <slice-slug>`,
      output: "final/result.md",
      acceptance: {
        level: "none",
        reason: "docs/workflow finalization; parent verifies frontmatter and test plan after completion"
      }
    }
  ]
})
```

## Step 3 — Parent loop (handle interactive requests)

**CRITICAL — Parent is a relay, not a decision-maker.** You must NEVER answer
interview questions yourself. Your sole job is to pass every question to the
user via `ask_user_question()` and relay their answer back. If you auto-answer
a question, the user is excluded from their own design process. Every
`interview_request` and every `need_decision` MUST go through
`ask_user_question()` before any reply is sent.

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
        header: "Slice",
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
      // approval-agent is presenting the ENTIRE test strategy for final
      // verification. All questions have been resolved and incorporated.
      const decision = await ask_user_question({
        header: "Verify",
        question: `Review the complete test strategy below:\n\n${request.message}\n\nApprove this test strategy?`,
        options: [
          { label: "Approved",
            description: "Accept the test strategy as written." },
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
        // The custom answer from "Request changes" or typed text
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
    report: "start-slice chain did not complete; inspect status and chain_dir"
    return
  }
}
```

For `need_decision` from the approval-agent: the agent's message contains the
**entire** test strategy (read from the slice doc, with all questions resolved
and incorporated). Present the full strategy to the user via
`ask_user_question` as shown above — this is their last chance to review
before it's committed. If the user approves: reply `"approved"`. If they
request changes: reply `"changes: <description>"`.

### Verify chain completion

After the `while` loop exits, `wait()` returned — but `wait()` returns when
*any* active run finishes, not specifically the chain. You MUST verify the
chain completed through all 4 steps:

```
const chainStatus = await subagent({ action: "status", id: "<chain-run-id>" })
if (chainStatus.state !== "complete" || chainStatus.currentStep < 3) {
  // Chain did NOT complete. The run that finished was likely a
  // revived single step, not the chain. Report the failure.
  report: "<describe what went wrong, which steps ran, what's missing>"
  return  // Do NOT proceed to Step 4 — do not edit the slice doc yourself.
}
```

**The parent must never edit the slice doc directly.** Only the chain worker
(step 4) touches the slice doc frontmatter and test plan. If the chain didn't
complete, report the failure — do not try to compensate by doing the worker's
job yourself.

## Step 4 — Report

After verifying the chain completed all 4 steps:

1. Read `{chain_dir}/final/result.md` to confirm the worker's actions.
2. Verify the slice doc has `analysed: true` and a `## Test plan` section
   (use `task_show` on the slice slug).
3. If either check fails, the chain did not complete correctly — report it,
   do not try to fix it yourself.

Report: "Slice `<slug>` analysed — test plan written. Ready for
`/skill:implement-slice <slug>`."

## Error handling

- If the slice doc is missing, confirm the task/slug.
- If `analysed: true` already, confirm the existing test plan is still valid.
- If the chain fails at any step, inspect the corresponding `{chain_dir}`
  output file for partial results.

## Constraints

- Spec-first — every scenario and assertion must derive from acceptance criteria.
- Failure modes before strategy — understand what can break before designing how to catch it.
- Don't start implementing here.
- `grill-agent` is an interview/planning step, not an implementation step. It
  is expected to finish without repository edits; the chain disables the
  generic subagent acceptance gate for this step and stores its handoff in
  `{chain_dir}/grill/analysis.md`.
- Generic subagent acceptance is disabled for all start-slice chain steps because
  the workflow has its own gates: user approval, worker finalization, and parent
  verification of slice frontmatter plus the `## Test plan` section. This avoids
  implementation-oriented evidence requirements such as `tests-added` on a
  planning-only workflow.
- **Do not interrupt the chain.** The grill-agent can be slow while exploring
  the codebase — this is expected. Only interrupt if the chain has had zero
  activity for 15+ minutes. Use `subagent({ action: "status" })` to check
  rather than assuming it is stuck. Interrupting the chain destroys it;
  sequential steps (test-strategist → approval-agent → worker) are lost on
  resume because `resume` revives only the current step as a single run, not
  the full chain.
- **Do not edit the slice doc yourself.** The parent is a relay and reporter,
  not a worker. Only the chain's worker step (step 4) edits the slice doc
  frontmatter and test plan. If the chain fails, report the failure — never
  try to compensate by editing the slice doc directly.
- If status shows a child blocked in `contact_supervisor` but no supervisor
  message is visible, do not wait indefinitely. Call
  `subagent_supervisor({ action: "pending" })`; the bounded wait loop above is
  intentionally used to surface this pi-subagents supervisor-delivery race.
- **Verify chain completion before reporting success.** After `wait()` returns,
  check the chain's actual `status.json` via
  `subagent({ action: "status", id: "..." })`. Confirm `state === "complete"`
  and all steps ran. `wait()` returns when any run finishes — the completed
  run might be a revived single step, not the full chain.

**Handoff:** "Ready for `/skill:implement-slice <slice-slug>`."
