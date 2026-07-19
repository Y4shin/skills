---
name: create-task
description: >
  Interview the user to produce a task doc (or epic) with slice docs that
  include full test plans. The parent agent interviews the user directly
  via ask_user_question — no subagents needed for the interactive parts.
  Dispatches test-strategist (subagent) to write formal test plans from
  the confirmed interview results.
  Use when starting a new feature, capability, or multi-task outcome.
---

# Create Task (or Epic)

Phase 0: the parent agent interviews the user to define the task and its
slices, then dispatches test-strategist to write formal test plans, then
writes the artifacts directly.

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
}
```

If the pull fails with conflicts, stop — the user must resolve them manually.

## Step 1 — Determine scope

Ask the user whether this is a single task or an epic (multi-task outcome):

```
const isEpic = await ask_user_question({
  header: "Scope",
  question: "Is this a single task or an epic (multi-task outcome)?",
  options: [
    { label: "Single task",
      description: "One self-contained outcome with multiple slices." },
    { label: "Epic",
      description: "Multiple child tasks, each with their own slices." }
  ]
})
```

- **Single task** → proceed with Step 2.
- **Epic** → capture the epic-level context, create the epic doc, then
  hand off each child task serially to this same skill with epic context
  pre-seeded.

## Step 2 — Interview: task definition

Read `task_profile` and `task_reference` for context and schema reference.

Interview the user to define the task. Follow this structure, but be
conversational — ask one question at a time, use the codebase to answer
what you can yourself.

### 2a — Task title and description

Ask the user for:
- **Task title** — short, descriptive
- **One-line description** — what outcome does this deliver?
- **User stories** — who benefits and how?

### 2b — Scope and layers

Explore the codebase to understand the architecture. Ask the user about:
- **End-to-end behaviour** — what does the user experience?
- **API surface** — what interfaces change or are added?
- **Layers touched** — which parts of the codebase are involved?
- **Boundaries** — what is explicitly out of scope?

For each area, recommend based on what you find in the codebase. Only ask
when the code can't answer (e.g. user preference, domain knowledge).

### 2c — Slice breakdown

Work with the user to split the task into slices. Each slice should be:
- Independently implementable (adds one capability)
- Vertically scoped (touches all layers, not just one)
- Testable in isolation

For each slice, confirm:
- **Slice title and slug** — short kebab-case identifier
- **Acceptance criteria** — what "done" looks like
- **What to build** — one paragraph of what this slice delivers
- **Estimated size** — S/M/L/XL

### 2d — Slice ordering

Confirm the implementation order:
- Which slices have no dependencies (can be built first)?
- Which depend on earlier slices?
- Record `blocked_by` for dependent slices

## Step 3 — Per-slice testing strategy

For each slice, interview the user about the testing strategy. Ask one
question at a time — do not batch. For each slice:

1. **Layer analysis** — which layers does this slice touch end-to-end?
   (Explore the codebase to answer this yourself.)
2. **Failure modes** — what can break? (At least 2 concrete failure modes
   per slice. Confirm with the user.)
3. **Testing approach** — test types (unit/integration/e2e), dependency
   strategy (mocks vs real), key scenarios, edge cases, error handling.

The test-strategist subagent will later write formal test plans from these
confirmed answers. The interview output is the source of truth.

## Step 4 — Determine the slug

```
// Derive from the task title
const slug = title.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
```

Check for collisions with `task_list`. If the slug already exists, ask the
user for a different title or append a qualifier.

## Step 5 — Write the task doc

Create the task doc using `write`:

```
const taskDoc = `---
kind: task
slug: ${slug}
title: ${title}
description: ${description}
status: todo
slices:
${slices.map((s, i) => `  - ${i + 1}-${s.slug}`).join('\n')}
epic: ${epicSlug || ''}
---

# ${title}

${description}

## User stories

${userStories}

## Scope

### End-to-end behaviour
${behaviour}

### API surface
${apiSurface}

### Layers touched
${layersTouched}

### Out of scope
${outOfScope}

## Slices

${slices.map((s, i) => `### ${i + 1}. ${s.title} (\`${s.slug}\`)
- **Size:** ${s.size}
- **Acceptance criteria:** ${s.acceptanceCriteria}
- **What to build:** ${s.whatToBuild}
- **Dependencies:** ${s.blocked_by || 'none'}`).join('\n\n')}

## Implementation notes

<!-- filled in during implementation -->

`

write(`docs/tasks/${slug}/task.md`, taskDoc)
```

## Step 6 — Write slice docs

For each slice, create its slice doc:

```
for (const [i, slice] of slices.entries()) {
  const sliceDoc = `---
kind: slice
slug: ${slice.slug}
title: ${slice.title}
parent_task: ${slug}
status: todo
size: ${slice.size}
analysed: false
blocked_by: ${slice.blocked_by || ''}
---

# ${slice.slug}

## Acceptance criteria

${slice.acceptanceCriteria}

## What to build

${slice.whatToBuild}

## Failure modes

${slice.failureModes.map(fm => `- ${fm}`).join('\n')}

## Test plan

<!-- filled in by test-strategist -->
`

  write(`docs/tasks/${slug}/slices/${i + 1}-${slice.slug}.md`, sliceDoc)
}
```

Set the slices list:

```
task_set_slices(slug, slices.map((_, i) => `${i + 1}-${s.slug}`))
```

## Step 7 — Dispatch test-strategist

Launch the test-strategist subagent to write formal test plans for all
slices. This is a non-interactive subagent — it reads the slice docs and
the interview notes, and writes the `## Test plan` sections.

```
const sliceList = slices.map((s, i) =>
  `docs/tasks/${slug}/slices/${i + 1}-${s.slug}.md`
).join(' ')

subagent({
  chain: [{
    agent: "skills.test-strategist",
    as: "strategy",
    phase: "Planning",
    label: "Write test plans for all slices",
    task: `Write test plans for ALL slices of task "${slug}".

Slices to write test plans for:
${slices.map((s, i) => `  ${i + 1}. ${s.slug} (docs/tasks/${slug}/slices/${i + 1}-${s.slug}.md)`).join('\n')}

Interview notes for each slice (confirmed with user):

${slices.map((s, i) => `### ${s.slug}
- **Layer analysis:** ${s.layerAnalysis}
- **Failure modes:** ${s.failureModes.join(', ')}
- **Testing approach:** ${s.testingApproach}
- **Key scenarios:** ${s.keyScenarios}
- **Edge cases:** ${s.edgeCases}
- **Error handling:** ${s.errorHandling}
`).join('\n')}

For each slice:
1. Read the slice doc to understand the acceptance criteria.
2. Read docs/testing.md for project test conventions.
3. Write a ## Test plan section covering: test types, scope, dependency
   strategy, key scenarios (Given/When/Then), edge cases, failure mode
   coverage, error handling, test file path, and run command.
4. Append the test plan to the slice doc using edit.
5. Set frontmatter: task_set <path> analysed true

If you have uncertainties, include ## Questions for the user in your
output — but try to resolve them from the project conventions in
docs/testing.md first.`,
    output: "strategy/result.md",
    outputMode: "file-only"
  }]
})
```

Since the test-strategist is non-interactive, no parent loop is needed.
Wait for the chain to complete:

```
await wait({ all: true })
```

Check the chain result. If the test-strategist left `## Questions for the
user`, resolve them manually:

```
const strategyResult = read("{chain_dir}/strategy/result.md")
if (strategyResult.includes("## Questions for the user")) {
  // Extract questions and ask the user
  // Then re-dispatch test-strategist with the answers
}
```

## Step 8 — Commit

```
bash(\`git add docs/tasks/${slug}/ && git commit -m "docs(task): create ${slug}"\`)
```

## Step 9 — Hand off

Report the task slug, number of slices, and that all slices have test plans.

"Task is fully planned with test strategies. Next: `/skill:pipeline-slices <slug>` to implement all slices, or `/skill:implement-slice <first-slug>` to do them one at a time."

## Error handling

- If the project has no `docs/tasks/`, run `/skill:onboard-workflow` first.
- If another task is already active, warn before overwriting.
- If the test-strategist leaves `## Questions for the user`, resolve them
  before proceeding. Do not commit with unresolved questions.
- If the test-strategist chain fails, inspect `{chain_dir}` for partial
  output and re-dispatch.

## Constraints

- English only. No speculative scope — anything not justified goes to Open questions.
- The parent agent explores the codebase first, only asks the user for things
  the code can't answer.
- Ask one question at a time. Never batch questions.
- Always provide a recommended answer with reasoning before asking.
- This is the ONLY interactive phase. After create-task completes, implementation
  runs autonomously via `/skill:pipeline-slices` or `/skill:implement-slice`.
- Slices are created with `analysed: false` initially, then set to `analysed: true`
  by the test-strategist after writing the test plan.