---
name: revise-task
description: >
  Revise a task or its slices. Reads the prompt about what needs changing,
  determines the scope (task definition, slice re-analysis, test plan updates,
  or metadata only), composes the right chain of agents on the fly, and
  applies the changes. Use for re-analysing unanalysed slices from older
  tasks, updating the task scope, refreshing outdated test plans, or
  reordering slices.
---

# Revise Task (or Slices)

Dynamically composes a chain based on what needs revising.
No hardcoded chain — the parent agent reads the current state, asks the user
what to change, and builds only the steps that are actually needed.

## When to use

| Situation | What happens |
|---|---|
| Re-analyse unanalysed slices (from pre-v1.2.0 tasks) | grill-agent (per-slice testing) → test-strategist → approval-agent → worker |
| Modify the task definition (scope, layers, boundaries) | grill-agent (task def) → worker |
| Modify task AND re-analyse slices | grill-agent (task def) → grill-agent (per-slice testing) → test-strategist → approval-agent → worker |
| Refresh outdated test plans for specific slices | grill-agent (per-slice for those slices) → test-strategist → approval-agent → worker |
| Just reorder slices / update blocked_by / change sizes | worker only |
| Add new slices to an existing task | grill-agent (per-slice for new slices) → test-strategist → approval-agent → worker |
| Remove slices | worker only |

## Step 0 — Pre-flight

```
git fetch origin
```

If remote ahead, ask whether to pull (same pattern as other skills).

## Step 1 — Read current state

```
const taskSlug = "<task-slug>"
const task = task_show(taskSlug)
const slices = task_slices(taskSlug)

// Classify each slice
const unanalysed = slices.filter(s => !s.analysed && s.status !== "done")
const analysed = slices.filter(s => s.analysed && s.status !== "done")
const done = slices.filter(s => s.status === "done")
```

Report a summary:

```
Task: "<title>" (<taskSlug>) — status: <status>
  ${done.length} done, ${analysed.length} analysed (ready), ${unanalysed.length} unanalysed
```

## Step 2 — Interview: what needs revising?

Ask the user what they want to change:

```
const revisePrompt = await ask_user_question({
  header: "Revise",
  question: `What needs to change on task "${taskSlug}"?\n\nCurrent state: ${unanalysed.length} unanalysed slice(s), ${analysed.length} analysed, ${done.length} done.\n\nDescribe what to revise:`,
  options: [
    { label: "Re-analyse unanalysed slices",
      description: `Run testing-strategy interviews for the ${unanalysed.length} slice(s) with analyset: false.` },
    { label: "Re-analyse ALL non-done slices",
      description: `Refresh test plans for ALL ${unanalysed.length + analysed.length} remaining slices from scratch.` },
    { label: "Modify task definition",
      description: "Change the task's scope, layers, boundaries, or slice breakdown." },
    { label: "Custom — I'll describe",
      description: "Provide a specific description of what needs changing." }
  ]
})
```

Parse the user's answer to determine what needs to happen:

```
const needs = {
  taskDefinition: false,      // Interview about task scope/layers/boundaries/slices
  sliceTesting: [],           // Slice slugs that need (re-)analysis + test plans
  slicePlanGeneration: [],    // Slice slugs that need test plans written
  metadataOnly: [],           // Slice slugs that only need metadata changes
}
```

**Determining scope from the user's answer:**

- "Re-analyse unanalysed slices" →
  `needs.sliceTesting = unanalysed.map(s => s.slug)`
  `needs.slicePlanGeneration = unanalysed.map(s => s.slug)`

- "Re-analyse ALL non-done slices" →
  `needs.sliceTesting = [...unanalysed, ...analysed].map(s => s.slug)`
  `needs.slicePlanGeneration = same`

- "Modify task definition" →
  `needs.taskDefinition = true`
  (Then ask: "Also re-analyse any slices?" and adjust accordingly)

- Custom description → parse for keywords. If the user mentions "scope",
  "layers", "boundaries", "breakdown", or "slices" in a task-level sense →
  `needs.taskDefinition = true`. If they mention specific slice names or
  "test plan" → add to `needs.sliceTesting`. If they mention "order",
  "blocked_by", "size" → `needs.metadataOnly`.

If the determination is ambiguous, ask a clarifying follow-up.

## Step 3 — Build the chain dynamically

```
const chain = []

// ── Step 3a: Task definition interview (if needed) ───────────────
if (needs.taskDefinition) {
  chain.push({
    agent: "grill-agent",
    task: `Revise the task definition for "${taskSlug}".

Current task doc: docs/tasks/${taskSlug}/task.md
Read it first — understand the current state.

The user wants to revise the task definition. Walk the decision tree:
1. What has changed about the user outcome or user stories?
2. Has the end-to-end behaviour or API surface changed?
3. Are layers/surfaces touched different now?
4. Have boundaries/out-of-scope shifted?
5. Should the slice breakdown change? (add, remove, reorder slices)

Explore the codebase for context. Ask the user one question at a time
via contact_supervisor with recommended answers. Continue until the
revisions are fully understood.

Output a structured ## Revised task definition with all confirmed changes.`,
    output: "interview/task-summary.md",
    acceptance: {
      level: "none",
      reason: "planning/interview step only"
    }
  })
}

// ── Step 3b: Slice testing interviews (if needed) ────────────────
if (needs.sliceTesting.length > 0) {
  const taskContext = needs.taskDefinition
    ? "Read {chain_dir}/interview/task-summary.md for the revised task definition (including any slice breakdown changes)."
    : `Read docs/tasks/${taskSlug}/task.md for the task definition.`

  const sliceList = needs.sliceTesting.map(slug =>
    `- ${slug} (docs/tasks/${taskSlug}/slices/<n>-${slug}.md)`
  ).join("\n")

  chain.push({
    agent: "grill-agent",
    task: `Interview about testing strategy for specific slices.

${taskContext}

Slices to (re-)analyse:
${sliceList}

For EACH of these slices:
1. Read the slice doc for its acceptance criteria and what-to-build.
2. Explore the codebase — which layers does this slice touch end-to-end?
3. What are the failure modes? What can break? (at least two concrete modes)
4. Testing approach: test types, scope, dependency strategy (mocks vs real),
   key scenarios, edge cases, error handling.

Ask the user one question at a time via contact_supervisor with
recommended answers. Continue until all slices are covered.

Output a ## Per-slice testing strategy with, for each slice: layer
analysis, confirmed failure modes, testing approach, and any user
preferences.`,
    output: "interview/testing-summary.md",
    acceptance: {
      level: "none",
      reason: "planning/interview step only"
    }
  })
}

// ── Step 3c: Test plan generation (if needed) ────────────────────
if (needs.slicePlanGeneration.length > 0) {
  const strategySource = needs.sliceTesting.length > 0
    ? "Read {chain_dir}/interview/testing-summary.md for per-slice testing strategy."
    : `Read the existing slice docs at docs/tasks/${taskSlug}/slices/. The user wants refreshed test plans.`

  chain.push({
    agent: "test-strategist",
    task: `Write test plans for specific slices.

${strategySource}

Slices needing test plans: ${needs.slicePlanGeneration.join(", ")}

For each slice:
1. Write a ## Test plan section. Cover: test types, scope, dependency
   strategy, key scenarios, edge cases, error handling, failure mode
   coverage, and the run command.
2. Every test scenario must derive from the slice's acceptance criteria
   and confirmed failure modes.
3. Write each test plan to {chain_dir}/test-plans/<n>-<slug>.md.

If you have uncertainties, include ## Questions for the user.`,
    output: "strategy/result.md",
    acceptance: {
      level: "none",
      reason: "approval-agent verifies the result"
    }
  })
}

// ── Step 3d: Approval (if there's anything to approve) ───────────
if (needs.slicePlanGeneration.length > 0) {
  chain.push({
    agent: "approval-agent",
    task: `Present the test strategies for approval.

Read every test plan from {chain_dir}/test-plans/.

If the test-strategist left ## Questions for the user, resolve each one
via contact_supervisor({ reason: "interview_request" }) one at a time.

Present ALL test strategies for final verification via
contact_supervisor({ reason: "need_decision" }).

If changes are requested, update the test plan files and re-present.
Loop until approved.`,
    output: "approval/result.md",
    acceptance: {
      level: "none",
      reason: "supervisor approval is the acceptance signal"
    }
  })
}

// ── Step 3e: Worker — apply everything ────────────────────────────
const workerTask = buildWorkerTask()

chain.push({
  agent: "worker",
  task: workerTask,
  output: "revise/result.md"
})
```

### Building the worker task

The worker task is assembled from what needs doing:

```
function buildWorkerTask() {
  const parts = [`Apply revisions to task "${taskSlug}".`]
  const actions = []

  if (needs.taskDefinition) {
    actions.push(`1. Read {chain_dir}/interview/task-summary.md.
2. Update docs/tasks/${taskSlug}/task.md with the revised definition.
3. If the slice breakdown changed (slices added/removed/reordered):
   - Create or remove slice docs as needed.
   - Update task_set_slices with the new order.`)
  }

  if (needs.slicePlanGeneration.length > 0) {
    actions.push(`- Read {chain_dir}/approval/result.md to confirm approval.
- For each slice in [${needs.slicePlanGeneration.join(", ")}]:
  - Copy the test plan from {chain_dir}/test-plans/<n>-<slug>.md
    into the slice doc's ## Test plan section (creating or replacing it).
  - Set frontmatter: task_set <slice-path> analysed true
  - If status is todo: task_set <slice-path> status todo (keep as todo)
- Commit: docs(task): revise test plans for <task-slug>`)
  }

  if (needs.metadataOnly.length > 0) {
    actions.push(`- Update metadata for slices: [${needs.metadataOnly.join(", ")}].
- Commit: docs(task): revise slice metadata for <task-slug>`)
  }

  actions.push(`- Set task_state_set last_action revise-task updated <task-slug>
- If all slices now have analyset: true:
    task_state_set next_action pipeline-slices <task-slug>
  Else:
    task_state_set next_action revise-task <task-slug> (unanalysed remain)`)

  return parts.concat(actions).join("\n")
}
```

## Step 4 — Launch and run parent loop

```
const chainRunId = subagent({ async: true, chain })

while (true) {
  await wait({ id: chainRunId })

  const pending = await subagent_supervisor({ action: "pending" })
  for (const request of pending) {
    if (request.reason === "interview_request") {
      const { question, context, recommended, reasoning } =
        JSON.parse(request.interview)

      const answer = await ask_user_question({
        header: "Revise",
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
      const decision = await ask_user_question({
        header: "Verify",
        question: `Review the revised test strategies:\n\n${request.message}\n\nApprove?`,
        options: [
          { label: "Approved",
            description: "Accept as written." },
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

  const status = await subagent({ action: "status", id: chainRunId })
  if (status.state === "complete") break
  if (status.state === "failed" || status.state === "paused") {
    report: "revise-task chain did not complete; inspect status and chain_dir"
    return
  }
}
```

## Step 5 — Report

After the chain completes:

```
const result = read("{chain_dir}/revise/result.md")

Report:
- What was revised (task definition, n slice test plans, metadata)
- Any remaining unanalysed slices
- Next action:
  - All slices ready → "/skill:pipeline-slices <task-slug>"
  - More unanalysed → "/skill:revise-task <task-slug>" again
```

## Example: re-analysing unanalysed slices from an old task

```
User: /skill:revise-task config-db-migrations
Agent: Task "Config DB Migrations" — 1 done, 2 analysed, 2 unanalysed.
       What needs to change?
User: Re-analyse unanalysed slices
Agent: [builds chain: grill-agent(per-slice for 2 slices) →
       test-strategist → approval-agent → worker]
       [launches, runs parent loop for grill + approval]
Agent: Done. Both slices now have test plans and analyset: true.
       All 4 remaining slices ready. Next: /skill:pipeline-slices
```

## Constraints

- **Dynamic chain composition.** The parent agent builds the chain array at
  runtime based on what needs changing. There is no predefined chain.
- **Only includes necessary steps.** If nothing needs a grill-agent, don't
  include one. If there's nothing to approve, skip the approval-agent.
- **Context flows through {chain_dir}.** Each step reads what the previous
  steps wrote. The task definition interview writes to
  `interview/task-summary.md`. The slice testing interview reads it.
- **Handles both new and old tasks.** Pre-v1.2.0 tasks with `analysed: false`
  slices work. Post-v1.2.0 tasks work too — useful for updating test plans
  when the codebase evolved.