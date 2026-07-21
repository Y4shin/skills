---
name: implement-task
description: Autonomous. Implements all remaining slices of a task via per-slice chains. Handles architecture spec approval, TDD, verification, deviation reports, landing, and coherence refactor.
---

# Implement Task

Implements every non-done slice of a task. Steps are: architecture spec (user-approved) → per-slice chain per dependency level → coherence refactor.

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

Before any TDD, draft an architecture spec. It lives at `docs/tasks/${taskSlug}/arch-spec.md` (stable and shared across all slice chains).

For each pending slice, draft:
- **Exports:** planned public API surface
- **Existing abstractions to use:** specific modules/interfaces from the codebase
- **Do NOT reimplement:** specific utilities/patterns to avoid
- **Interface contract:** for slices with dependents: what does this slice export that the next slice calls?

Also record in the task doc's `## Architecture notes` section (if the user adds any).

Present the complete spec to the user. One conversation. Iterate if needed.
Once approved, write to `docs/tasks/${taskSlug}/arch-spec.md`.

**Submit feedback:** `submit_workflow_feedback { message: "Arch spec approved for {taskSlug}", tags: ["planning"] }`

## Step 2 — Per-slice chain dispatch

Call `task_dependency_levels <taskSlug>` to get BFS levels.

Each slice runs as a **sequential chain** that shares the repo working directory: `tdd-worker → (slice-verifier ∥ deviation-reporter) → land-worker`. Steps share one cwd, so verify and deviation see tdd-worker's actual code (the prior `parallel` + `worktree` design ran them against empty worktrees). `failFast: true` gates landing on a green verify.

Slices within a level run **sequentially** (chains share the repo cwd, so parallel slices would clash). Levels remain strict barriers: level N+1 starts only after every slice in level N has landed.

```
levels = JSON.parse(task_dependency_levels(taskSlug)).levels

for each level in levels:
    for each slice in level:   // sequential: chains share the repo cwd
        size = task_get(<slice-path>, "size")
        budgets = { s: [15, 120], m: [30, 300], l: [60, 600], xl: [90, 1200] }
        [maxTurns, timeoutMs] = budgets[size] || budgets.m

        result = subagent({
            chain: [
                {
                    agent: "tdd-worker",
                    as: "tdd",
                    output: `tdd-${slice}/result.md`,
                    task: `Implement slice "${slice}" for task "${taskSlug}".

Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Task doc: ${taskPath}
Arch spec: docs/tasks/${taskSlug}/arch-spec.md

${sliceArchNotes}

Before writing code:
1. Read the arch spec for this slice's interface contract and abstraction notes.
2. Read the existing source files listed in the arch spec.
3. Call get_guidelines for relevant languages.
4. Commit after each GREEN (checkpoint).

If uncertain, write docs/tasks/${taskSlug}/.work/uncertainty.md and stop.`,
                    turnBudget: { maxTurns, graceTurns: Math.ceil(maxTurns / 6) }
                },
                {
                    parallel: [
                        {
                            agent: "slice-verifier",
                            as: "verify",
                            output: `verify-${slice}/result.md`,
                            task: `Verify slice "${slice}".
Implementation: {outputs.tdd}.
Run lint and tests. Block on failure.`,
                            timeoutMs
                        },
                        {
                            agent: "deviation-reporter",
                            as: "deviation",
                            output: `deviation-${slice}/result.md`,
                            task: `Check slice "${slice}" for deviations from the arch spec and slice doc.

Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Arch spec: docs/tasks/${taskSlug}/arch-spec.md
Implementation: {outputs.tdd}.

Compare the implementation against the spec. Write a deviation report to
docs/tasks/${taskSlug}/deviation-reports/${slice}.md covering:
- API surface changes (planned vs actual)
- Abstraction usage (used what was specified?)
- Out-of-scope additions
- Any divergence from the slice doc's acceptance criteria

If the task doc's ## Implementation notes needs updating, note it.`
                        }
                    ],
                    concurrency: 2
                },
                {
                    agent: "land-worker",
                    as: "land",
                    output: `land-${slice}/result.md`,
                    task: `Land slice "${slice}" for task "${taskSlug}".
Slice doc: docs/tasks/${taskSlug}/slices/<n>-${slice}.md
Task doc: ${taskPath}
TDD output: {outputs.tdd}. Verify output: {outputs.verify}.

Merge the slice branch into the task branch, archive the slice doc, commit.
Set task_set status done on slice.`
                }
            ],
            failFast: true
        })

        // Process the chain result
        if exists docs/tasks/${taskSlug}/.work/uncertainty.md:
            // tdd-worker hit uncertainty and stopped (failFast aborted before verify/land)
            resolution = ask_user_question({
                header: "Uncertain",
                question: `TDD worker hit uncertainty in slice ${slice}:\n{read docs/tasks/${taskSlug}/.work/uncertainty.md}`
            })
            delete the uncertainty file
            re-run the chain for this slice, appending the resolution to the tdd task
            continue

        if chain failed (e.g. verify failed -> failFast aborted before land):
            // Retry: re-run the chain with a corrective tdd task
            re-run the chain, prefixing the tdd task with:
            "Fix these issues: {verify output}. Do NOT redo from scratch."
            continue

        // success path: slice landed
        task_set <slice-path> status done
        task_state_set task <taskSlug>

    // After each level: read deviation reports for slices that flagged
    // user-attention-needed. Update the arch spec for pending slices if API
    // surfaces changed. If a deviation reveals a workflow/planning problem
    // (ambiguous spec, wrong interface contract), call submit_workflow_feedback.
    // Do NOT call it for the deviation itself — that's a project finding.
```

## Step 3 — Coherence refactor

After all slices landed, review the combined diff and all deviation reports.

Read:
- `docs/tasks/${taskSlug}/deviation-reports/*.md`
- `docs/tasks/${taskSlug}/arch-spec.md`
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

**Final suite gate:** Run the full project test suite. It must be green before Step 3 is complete. If red, this is emergent cross-slice breakage — breakage that only appears when all slices combine and no single slice owns the fix. Apply small/medium root-cause fixes within the task's scope autonomously (same rules as above); escalate large, ambiguous, or API-surface-touching fixes to the user. This is a safety net behind the per-slice full-suite gate (Step 2's slice-verifier), not a replacement for it.

**Submit feedback:** `submit_workflow_feedback { message: "Coherence refactor complete for {taskSlug}", tags: ["refactoring"] }`

## Step 4 — Report

Report completed slices, any deviations found and resolved, user interventions.
"If all slices done: run `/skill:finalize-task <slug>`"