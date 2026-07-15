---
name: implement-slice
description: >
  Launch the implement-slice chain to build a slice via strict TDD. Dispatches
  worker (branch+sync) → tdd-worker (TDD) → slice-verifier (gate) → worker
  (land). Use after start-slice.
---

# Implement Slice — Build with TDD (Chain)

Phase 2: launch the implement-slice chain — worker sets up the branch,
tdd-worker implements via TDD, slice-verifier runs the quality gate, and
worker lands the result.

## Prerequisites

Slice doc has `analysed: true` and `## Test plan`. Use `task_profile` for
code conventions and CI commands.

## Step 1 — Validate prerequisites

Verify `analysed: true` on the slice doc. If not, run `/skill:start-slice`
first. Read the slice doc and its parent `task.md`.

## Step 2 — Launch the implementation chain

Construct the chain:

```
const taskSlug = "<task-slug>"
const sliceSlug = "<slice-slug>"
const slicePath = "docs/tasks/<task-slug>/slices/<n>-<slice-slug>.md"
const taskPath = "docs/tasks/<task-slug>/task.md"

subagent({
  async: true,
  chain: [
    {
      agent: "worker",
      task: `Prepare the implementation branch for slice "${sliceSlug}"
(task: "${taskSlug}").

1. Sync with origin if remote exists:
   git fetch origin 2>/dev/null || true
   git checkout main && git pull --ff-only origin main 2>/dev/null || true

2. Ensure the task integration branch exists:
   git checkout task/${taskSlug} 2>/dev/null || git checkout -b task/${taskSlug}

3. Create the slice feature branch:
   git checkout -b slice/${sliceSlug}

4. Read the slice doc at ${slicePath} and the task doc at ${taskPath}.
   Read docs/testing.md if it exists for project test conventions.

5. Report: branch slice/${sliceSlug} created, context loaded.`,
      output: "setup/result.md"
    },
    {
      agent: "tdd-worker",
      task: `Implement slice "${sliceSlug}" for task "${taskSlug}" using strict TDD.

Slice doc: ${slicePath}
Task doc: ${taskPath}

Read the slice doc's acceptance criteria and test plan. Follow the
strict TDD cycle:

1. RED — write a failing test derived from acceptance criteria.
   The test MUST fail before implementation.
2. GREEN — write minimal code to make the test pass. No speculative code.
3. REFACTOR — clean up, improve names, extract helpers. Test must still pass.
4. Repeat for each acceptance criterion.
5. Run the full test suite if available. Fix anything that breaks.

Read docs/testing.md for project conventions. Use get_guidelines for
language-specific best practices. Follow any injected coding guidelines.`,
      output: "tdd/result.md"
    },
    {
      agent: "slice-verifier",
      task: `Verify slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}

Run the quality gate:
1. Find and run the lint command (from package.json scripts or linter configs).
   Skip with a warning if no lint tool is configured.
2. Find and run the test command from the slice doc's ## Test plan →
   Run command.

If lint fails: STOP and report. If tests fail: STOP and report.
Only proceed if both are clean.`,
      output: "verify/result.md"
    },
    {
      agent: "worker",
      task: `Land slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}
Task doc: ${taskPath}

1. Read the slice doc for title, acceptance criteria, and test plan.

2. Merge the slice into the task branch:
   git checkout task/${taskSlug}
   git merge --no-ff slice/${sliceSlug} -m "slice(${taskSlug}): <slice title>"
   git branch -d slice/${sliceSlug}

3. Record completion on the slice doc:
   task_set ${slicePath} status done
   task_set ${slicePath} completed_at <ISO now>

4. Append a 2-4 line implementation note to the task's ## Implementation notes:
   what was built, any decisions made, any guideline deviations.

5. Archive the slice:
   mkdir -p docs/tasks/${taskSlug}/slices/archive
   git mv ${slicePath} docs/tasks/${taskSlug}/slices/archive/<n>-<slug>.md

6. Commit the landing artifacts:
   git add docs/tasks/
   git commit -m "docs(slice): land ${sliceSlug} into ${taskSlug}"

7. Check remaining slices via task_slices ${taskSlug}:
   - If last slice: task_set ${taskSlug} status done,
     task_set ${taskSlug} completed_at <ISO now>,
     task_state_set active.slice null,
     task_state_set next_action finalize-task ${taskSlug}
   - If more remain: task_state_set active.slice null,
     task_state_set next_action start-slice <next-slug>

8. Set task_state_set last_action implement-slice landed ${sliceSlug}`,
      output: "land/result.md"
    }
  ]
})
```

## Step 3 — Wait for completion

This is a non-interactive chain — no grill-agent or approval-agent.

```
await wait({ all: true })
```

Read `{chain_dir}/land/result.md` to confirm landing was successful.

## Step 4 — Report

Report the outcome:

- Slice implemented, verified, and landed
- Number of remaining slices
- If all slices done: "Run `/skill:finalize-task <task-slug>`"
- If more remain: "Next: `/skill:start-slice <next-slug>`"

## Error handling

- If `analysed: false`, run `/skill:start-slice` first.
- If the verifier fails, inspect `{chain_dir}/verify/result.md` and restart
  the chain (the tdd-worker will fix issues and retry).
- If merge conflicts arise, resolve them to keep both new and already-merged
  slices working.
- Never merge a red slice into the task branch.

## Constraints

- Spec-first — never write a test to match a wrong implementation.
- No speculative code — implement only what the slice requires.
- No per-slice PR — slices merge into the task branch; only finalize merges to main.
