---
name: implement-task
description: Autonomous. Implements all remaining slices of a task in parallel via worktrees. Handles architecture spec approval, TDD, verification, deviation reports, landing, and coherence refactor.
---

# Implement Task

Implements every non-done slice of a task. Steps are: architecture spec (user-approved) → parallel fan-out per dependency level → coherence refactor.

## Step 0 — Prerequisites

Task doc exists with `slices:` list. Each slice has `## Test plan`, `size`, `blocked_by`. Run `task_slices <slug>` to enumerate.

```
const taskSlug = "<task-slug>"
const taskPath = `docs/tasks/${taskSlug}/task.md`
const pendingSlices = task_slices(taskSlug)
  .filter(s => s.status !== "done")
```

If none pending: "All slices done. Run `/skill:finalize-task`."

## Step 1 — Architecture spec (user-approved)

Before any TDD, draft an architecture spec. This is ephemeral — lives in `{chain_dir}/arch-spec.md`.

For each pending slice, draft:
- **Exports:** planned public API surface
- **Existing abstractions to use:** specific modules/interfaces from the codebase
- **Do NOT reimplement:** specific utilities/patterns to avoid
- **Interface contract:** for slices with dependents: what does this slice export that the next slice calls?

Also record in the task doc's `## Architecture notes` section (if the user adds any).

Present the complete spec to the user. One conversation. Iterate if needed.
Once approved, write to `{chain_dir}/arch-spec.md`.

**Submit feedback:** `submit_workflow_feedback { message: "Arch spec approved for {taskSlug}", tags: ["planning"] }`

## Step 2 — Parallel fan-out

Call `task_dependency_levels <taskSlug>` to get BFS levels.

For each level, dispatch tdd-worker + deviation-reporter + slice-verifier + land-worker per slice in parallel worktrees:

```
levels = JSON.parse(task_dependency_levels(taskSlug)).levels

for each level in levels:
    tasks = []
    for each slice in level:
        size = task_get(<slice-path>, "size")
        budgets = { s: [15, 120], m: [30, 300], l: [60, 600], xl: [90, 1200] }
        [maxTurns, timeoutMs] = budgets[size] || budgets.m

        tasks.push({
            agent: "tdd-worker",
            label: `TDD: ${slice}`,
            task: `Implement slice "${slice}" for task "${taskSlug}".

Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Task doc: ${taskPath}
Arch spec: {chain_dir}/arch-spec.md

${sliceArchNotes}

Before writing code:
1. Read the arch spec for this slice's interface contract and abstraction notes.
2. Read the existing source files listed in the arch spec.
3. Call get_guidelines for relevant languages.
4. Commit after each GREEN (checkpoint).`,
            output: `tdd-${slice}/result.md`,
            turnBudget: { maxTurns, graceTurns: Math.ceil(maxTurns / 6) }
        })

        tasks.push({
            agent: "deviation-reporter",
            label: `Deviation: ${slice}`,
            task: `Check slice "${slice}" for deviations from the arch spec and slice doc.

Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Arch spec: {chain_dir}/arch-spec.md
Prior TDD output: {chain_dir}/tdd-${slice}/result.md

Compare the implementation against the spec. Write a deviation report to
{chain_dir}/deviation-reports/${slice}.md covering:
- API surface changes (planned vs actual)
- Abstraction usage (used what was specified?)
- Out-of-scope additions
- Any divergence from the slice doc's acceptance criteria

If the task doc's ## Implementation notes needs updating, note it.`,
            output: `deviation-${slice}/result.md`
        })

        tasks.push({
            agent: "slice-verifier",
            label: `Verify: ${slice}`,
            task: `Verify slice "${slice}" for task "${taskSlug}".
Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Run lint and tests. Block on failure.`,
            output: `verify-${slice}/result.md`,
            timeoutMs
        })

    // Fan out: tdd-worker + deviation-reporter + verifier in parallel worktrees
    results = subagent({
        parallel: tasks,
        worktree: true,
        concurrency: 4
    })

    // Process results
    for each result:
        if result.agent === "tdd-worker" && result has uncertainty.md:
            // Ask user, re-dispatch
            const resolution = ask_user_question({
                header: "Uncertain",
                question: `TDD worker hit uncertainty in slice ${slice}:\n{read uncertainty.md}`
            })
            re-dispatch tdd-worker with resolution
            re-dispatch verifier

        elif result.agent === "slice-verifier" && result failed:
            // Retry: re-dispatch tdd-worker with error output
            re-dispatch tdd-worker with: "Fix these issues: {verifier output}. Do NOT redo."
            re-dispatch verifier

        elif result.agent === "deviation-reporter":
            // Read report, update task doc ## Implementation notes if needed
            // Update arch spec for pending slices if API surfaces changed
            submit_workflow_feedback({
                message: `Deviation in ${slice}: {summary}`,
                tags: ["deviation"]
            })

        // Land completed slices
        subagent({
            agent: "land-worker",
            task: `Land slice "${slice}" for task "${taskSlug}".
Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Task doc: ${taskPath}
Read TDD output at {chain_dir}/tdd-${slice}/result.md for divergence notes.

Merge worktree, archive slice, commit. Set task_set status done on slice.`,
            output: `land-${slice}/result.md`
        })

        task_set <slice-path> status done
        task_state_set task <taskSlug>

    // After each level: clean up worktrees
```

## Step 3 — Coherence refactor

After all slices landed, review the combined diff and all deviation reports.

Read:
- `{chain_dir}/deviation-reports/*.md`
- `{chain_dir}/arch-spec.md`
- Combined diff: `git diff main..task/{taskSlug}`

**Determine scale:**
- If TDD workers refactored out-of-scope code or altered API surfaces not in the spec → **ask user**
- If you'd need large-scale refactors of out-of-scope code to make things coherent → **ask user**
- Otherwise → do small/medium refactors autonomously:
  - Rename symbols for consistency
  - Extract shared helpers duplicated across slices
  - Align error handling patterns
  - Consolidate duplicate test setup
  - Ensure naming conventions are consistent

Do NOT change API surfaces that dependents call without user approval.
Do NOT refactor outside the task's scope.

**Submit feedback:** `submit_workflow_feedback { message: "Coherence refactor complete for {taskSlug}", tags: ["refactoring"] }`

## Step 4 — Report

Report completed slices, any deviations found and resolved, user interventions.
"If all slices done: run `/skill:finalize-task <slug>`"