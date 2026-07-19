---
name: implement-slice
description: >
  Build a slice via strict TDD with autonomous divergence handling. Dispatches
  worker (branch+sync) → tdd-worker (TDD, fails with context on uncertainty) →
  slice-verifier (gate) → worker (divergence check, fails with context) →
  worker (land). No supervisor/intercom needed — subagents fail with
  structured artifacts that the parent handles.
  Use after create-task, or one-at-a-time instead of pipeline-slices.
---

# Implement Slice — Build with TDD (Chain)

Phase 2: build a slice via strict TDD. The slice already has a test plan
(from create-task), so implementation is autonomous. Two escape hatches:
- The tdd-worker, if uncertain, writes an uncertainty artifact and fails
- The divergence check, if significant, writes a divergence artifact and fails
The parent reads the artifact, resolves the question (with user if needed),
and retries.

## Prerequisites

Slice doc has `analysed: true`, `## Test plan`, and `status: todo`.
Use `task_profile` for code conventions and CI commands.

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

## Step 1 — Validate prerequisites

Verify the slice doc has `analysed: true` and a `## Test plan` section.
If not, this slice hasn't been through create-task — run `/skill:create-task`
first.

Read the slice doc and its parent `task.md`. Set the slice to in-progress:

```
task_set <slice-path> status in-progress
task_set <slice-path> started_at <ISO now>
task_state_set active.slice <slice-slug>
task_state_set last_action implement-slice starting <slice-slug>
task_state_set next_action ""
```

## Step 2 — Launch the implementation chain

Construct the chain:

```
const taskSlug = "<task-slug>"
const taskPath = "docs/tasks/<task-slug>/task.md"
const sliceSlug = "<slice-slug>"
const slicePath = "docs/tasks/<task-slug>/slices/<n>-<slice-slug>.md"
const chainDef = JSON.parse(bash("cat chains/implement-slice.chain.json"))

const steps = chainDef.chain.map(step => ({
  ...step,
  task: step.task
    .replaceAll("{taskSlug}", taskSlug)
    .replaceAll("{sliceSlug}", sliceSlug)
    .replaceAll("{slicePath}", slicePath)
    .replaceAll("{taskPath}", taskPath)
}))

const chainRunId = subagent({
  async: true,
  timeoutMs: chainDef.timeoutMs,
  turnBudget: chainDef.turnBudget,
  chain: steps
})
```

## Step 3 — Wait for completion, handle failures

```
let chainStatus = await subagent_wait({ id: chainRunId })

/**
 * The chain can end in three states:
 * 1. complete — all steps succeeded → proceed to landing
 * 2. failed with uncertainty artifact → resolve and retry
 * 3. failed with divergence artifact → ask user and handle
 * 4. other failure → inspect and report
 */

let retries = 0
const maxRetries = 2
let resolvedContext = ""

while (chainStatus.state !== "complete" && retries <= maxRetries) {
  // Check what kind of failure
  const tddResultPath = "{chain_dir}/tdd/result.md"
  const divergeResultPath = "{chain_dir}/diverge/result.md"
  const tddUncertaintyPath = "{chain_dir}/tdd/uncertainty.md"
  const divergeArtifactPath = "{chain_dir}/diverge/divergence.md"

  if (bash(`test -f ${tddUncertaintyPath} && echo yes || echo no`).trim() === "yes") {
    // ── TDD uncertainty: resolve and retry ─────────────────────
    const uncertainty = read(tddUncertaintyPath)
    const resolution = await ask_user_question({
      header: "Uncertain",
      question: `**Slice:** ${sliceSlug}\n\nThe TDD worker hit an uncertainty:\n\n${uncertainty}\n\nHow should it proceed?`,
      options: [
        { label: "Accept recommended approach",
          description: "Proceed with the recommended approach from the uncertainty." },
        { label: "Custom answer",
          description: "Provide a specific answer." }
      ]
    })

    resolvedContext = `Previous attempt got this resolution: ${resolution}\n\n`

    // Re-dispatch tdd-worker + slice-verifier with resolution
    retries++
    chainRunId = subagent({
      async: true,
      chain: [
        {
          agent: "skills.tdd-worker",
          as: "retry-tdd",
          phase: "Implementation",
          label: "TDD continuation (retry)",
          task: `CONTINUATION (attempt ${retries + 1}): Implement slice "${sliceSlug}"
for task "${taskSlug}" using strict TDD.

Slice doc: ${slicePath}
Task doc: ${taskPath}

${resolvedContext}Resolution for the uncertainty: ${resolution}

${bash(`test -f ${tddResultPath} && echo "Prior output:\\n" + cat(tddResultPath) || ""`)}

Continue from where the previous attempt left off. Follow strict TDD.
Do NOT redo completed work.`,
          output: "tdd/result.md"
        },
        {
          agent: "skills.slice-verifier",
          as: "retry-verify",
          phase: "Verification",
          label: "Verify (retry)",
          outputMode: "file-only",
          task: `Verify slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}

Run the quality gate:
1. Find and run the lint command. Skip with warning if none configured.
2. Find and run the test command from ## Test plan → Run command.

If lint fails: STOP. If tests fail: STOP.`,
          output: "verify/result.md"
        }
      ]
    })

    chainStatus = await subagent_wait({ id: chainRunId })

  } else if (bash(`test -f ${divergeArtifactPath} && echo yes || echo no`).trim() === "yes") {
    // ── Divergence detected: ask user how to proceed ────────────
    const divergence = read(divergeArtifactPath)
    const decision = await ask_user_question({
      header: "Diverged",
      question: `**Slice:** ${sliceSlug}\n\nThe implementation diverged from the plan:\n\n${divergence}\n\nHow to proceed?`,
      options: [
        { label: "Accept divergence, continue",
          description: "The divergence is fine — proceed with landing." },
        { label: "Need to adjust remaining slices",
          description: "Divergence affects other slices. Stop and revise." },
        { label: "Stop and review",
          description: "Stop the implementation for manual review." }
      ]
    })

    if (decision === "Accept divergence, continue") {
      // Re-dispatch the remaining steps (diverge + land)
      chainRunId = subagent({
        async: true,
        chain: [
          {
            agent: "skills.worker",
            as: "retry-land",
            phase: "Landing",
            label: "Merge and archive",
            outputMode: "file-only",
            task: `Land slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}
Task doc: ${taskPath}

1. Read the slice doc and {chain_dir}/tdd/result.md.
2. Merge into task branch:
   git checkout task/${taskSlug}
   git merge --no-ff slice/${sliceSlug} -m "slice(${taskSlug}): <slice title>"
   git branch -d slice/${sliceSlug}
3. Record completion:
   task_set ${slicePath} status done
   task_set ${slicePath} completed_at <ISO now>
4. Append implementation note to task's ## Implementation notes.
5. Archive the slice: mkdir -p docs/tasks/${taskSlug}/slices/archive
   git mv ${slicePath} docs/tasks/${taskSlug}/slices/archive/<n>-<slug>.md
6. Commit: git add docs/tasks/ && git commit -m "docs(slice): land ${sliceSlug}"
7. If last slice: set task done.
8. Task state: task_state_set last_action implement-slice landed ${sliceSlug}`,
            output: "land/result.md"
          }
        ]
      })
      chainStatus = await subagent_wait({ id: chainRunId })
    } else {
      report: `Divergence in ${sliceSlug} affects remaining slices. Run /skill:revise-task ${taskSlug} to update affected slice plans before continuing.`
      return
    }
  } else {
    // ── Other failure ───────────────────────────────────────────
    report: `implement-slice chain failed. Inspect {chain_dir} for details.`
    return
  }
}
```

After the chain completes, read `{chain_dir}/land/result.md` to confirm
landing was successful.

## Step 4 — Report

Report the outcome:

- Slice implemented, verified, and landed
- Any divergences from the plan (and how they were resolved)
- Number of remaining slices
- If all slices done: "Run `/skill:finalize-task <task-slug>`"
- If more remain: "Next: `/skill:implement-slice <next-slug>` or `/skill:pipeline-slices <task-slug>`"

## Error handling

- If `analysed: false` or no `## Test plan`, run `/skill:create-task` first.
- If the verifier fails, inspect `{chain_dir}/verify/result.md` and restart.
- If merge conflicts arise, resolve manually.
- Never merge a red slice into the task branch.
- If all retries exhausted for TDD uncertainty, ask the user to review
  `{chain_dir}/tdd/result.md` and decide next steps.

## Constraints

- Spec-first — never write a test to match a wrong implementation.
- No speculative code — implement only what the slice requires.
- No per-slice PR — slices merge into the task branch; only finalize merges to main.
- Subagents never ask the user questions — they fail with structured artifacts.
- Divergence is expected — the plan is a plan, not a contract.