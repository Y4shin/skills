---
name: revise-task
description: >
  Revise a task or its slices. Reads the current state, interviews the user
  about what needs changing, then applies changes directly. No subagents
  needed for the interactive parts — the parent agent owns the interview
  and applies edits directly. For re-analysing unanalysed slices, dispatches
  test-strategist (subagent) to write new test plans.
  Use for re-analysing unanalysed slices from older tasks, updating task
  scope, refreshing outdated test plans, or reordering slices.
---

# Revise Task (or Slices)

The parent agent reads the current state, asks the user what to change,
and applies edits directly. No subagent chain — everything inline.

## When to use

| Situation | What happens |
|---|---|
| Re-analyse unanalysed slices (from pre-v1.2.0 tasks) | Parent re-interviews per-slice testing strategy, dispatches test-strategist |
| Modify the task definition (scope, layers, boundaries) | Parent interviews, edits task doc directly |
| Modify task AND re-analyse slices | Parent interviews both, applies both |
| Refresh outdated test plans for specific slices | Parent re-interviews for those slices, dispatches test-strategist |
| Just reorder slices / update blocked_by / change sizes | Direct task_set calls |
| Add new slices to an existing task | Parent interviews for new slices, dispatches test-strategist |
| Remove slices | Direct file operations |

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
const reviseChoice = await ask_user_question({
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
  taskDefinition: false,
  sliceTesting: [],           // Slice slugs needing re-interview + new test plans
  metadataOnly: [],           // Slice slugs needing only metadata changes
}
```

- "Re-analyse unanalysed slices" →
  `needs.sliceTesting = unanalysed.map(s => s.slug)`
- "Re-analyse ALL non-done slices" →
  `needs.sliceTesting = [...unanalysed, ...analysed].map(s => s.slug)`
- "Modify task definition" →
  `needs.taskDefinition = true`
  (Then ask: "Also re-analyse any slices?")
- Custom description → parse for keywords. If ambiguous, ask a clarifying
  follow-up question.

## Step 3a — Modify task definition (if needed)

Interview the user about what changed:
- What has changed about the user outcome or user stories?
- Has the end-to-end behaviour or API surface changed?
- Are layers/surfaces touched different now?
- Have boundaries/out-of-scope shifted?
- Should the slice breakdown change? (add, remove, reorder slices)

For each question, explore the codebase first, only ask the user for things
the code can't answer. Provide a recommended answer with reasoning.

Apply the changes directly:

```
const taskPath = `docs/tasks/${taskSlug}/task.md`
// Read the current task doc, apply edits, write back
// Use edit() for targeted changes
```

## Step 3b — Per-slice testing interview (if needed)

For each slice needing re-analysis, interview the user:
1. **Layer analysis** — which layers does this slice touch end-to-end?
   (Explore the codebase to answer as much as you can.)
2. **Failure modes** — what can break? (At least 2, confirm with user.)
3. **Testing approach** — test types, dependency strategy, key scenarios,
   edge cases, error handling.

One question at a time. Always provide a recommended answer.

## Step 3c — Apply metadata changes (if only metadata)

If the user only wanted to reorder, update blocked_by, or change sizes:

```
// Direct task_set calls
task_set(`docs/tasks/${taskSlug}/slices/<n>-<slug>.md`, "size", "M")
// etc.
```

## Step 4 — Dispatch test-strategist (if slices were re-analysed)

If any slices were re-analysed in Step 3b, dispatch test-strategist to
write the formal test plans:

```
if (needs.sliceTesting.length > 0) {
  subagent({
    chain: [{
      agent: "skills.test-strategist",
      as: "strategy",
      phase: "Planning",
      label: "Write revised test plans",
      task: `Write test plans for slices of task "${taskSlug}".

Slices needing test plans: ${needs.sliceTesting.join(", ")}

Interview notes (confirmed with user):
${slicesNeedingTesting.map(s => `### ${s.slug}
- Layer analysis: ${s.layerAnalysis}
- Failure modes: ${s.failureModes}
- Testing approach: ${s.testingApproach}
`).join('\n')}

For each slice:
1. Read the slice doc to understand acceptance criteria.
2. Read docs/testing.md for project conventions.
3. Write a ## Test plan section covering: test types, scope,
   dependency strategy, key scenarios, edge cases, failure mode
   coverage, error handling, test file path, run command.
4. Append to the slice doc using edit.
5. Set frontmatter: task_set <path> analysed true`,
      output: "strategy/result.md",
      outputMode: "file-only"
    }]
  })

  await wait({ all: true })
}
```

## Step 5 — Commit

```
bash(`git add docs/tasks/${taskSlug}/ && git commit -m "docs(task): revise ${taskSlug}"`)
```

## Step 6 — Report

Report:
- What was revised (task definition, n slice test plans, metadata)
- Any remaining unanalysed slices
- Next action:
  - All slices ready → `/skill:pipeline-slices <task-slug>`
  - More to do → `/skill:revise-task <task-slug>` again

## Example: re-analysing unanalysed slices from an old task

```
User: /skill:revise-task config-db-migrations
Agent: Task "Config DB Migrations" — 1 done, 2 analysed, 2 unanalysed.
       What needs to change?
User: Re-analyse unanalysed slices
Agent: [interviews per-slice testing strategy for 2 slices]
       [dispatches test-strategist]
Agent: Done. Both slices now have test plans and analyset: true.
       All 4 remaining slices ready. Next: /skill:pipeline-slices
```

## Constraints

- **Parent agent owns the interview.** No subagents ask the user questions.
  The parent uses `ask_user_question` directly.
- **Only dispatch test-strategist if slices were re-analysed.** If only
  metadata changed, skip it.
- **Explore first, ask second.** The codebase can answer many questions;
  only ask the user for things the code can't tell you.