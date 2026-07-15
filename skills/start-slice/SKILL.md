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
      output: "grill/analysis.md"
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
      output: "strategy/result.md"
    },
    {
      agent: "approval-agent",
      task: `Present the test strategy and get user approval.

Read the test plan from the slice doc at docs/tasks/<task-slug>/slices/<n>-<slug>.md.

Present a summary of the test strategy to the user via
contact_supervisor({ reason: "need_decision" }). Ask for approval.

If changes are requested, update the slice doc with edit and re-present.
Loop until approved or changes exhausted.`,
      output: "approval/result.md"
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
      output: "final/result.md"
    }
  ]
})
```

## Step 3 — Parent loop (handle interactive requests)

Run the shared parent loop to relay grill-agent questions and approval-agent
decisions:

```
while (true) {
  await wait()

  const pending = await subagent_supervisor({ action: "pending" })
  if (pending.length === 0) break  // chain completed

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
      // approval-agent is asking for approval of the test strategy
      // Present it and ask user to approve, request changes, or chat
      await subagent_supervisor({
        action: "reply",
        replyTo: request.id,
        message: "approved"  // or "changes: <description>" if user requests changes
      })
    }
  }
}
```

For `need_decision` from the approval-agent: the agent's message contains the
test strategy summary. Present it to the user. If the user approves: reply
`"approved"`. If they request changes: reply `"changes: <description>"`.

## Step 4 — Report

After the chain completes, read `{chain_dir}/final/result.md`. Verify the
slice doc has `analysed: true` and a `## Test plan` section.

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

**Handoff:** "Ready for `/skill:implement-slice <slice-slug>`."
