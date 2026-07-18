---
name: implement-slice
description: >
  Build a slice via strict TDD with autonomous divergence handling. Dispatches
  worker (branch+sync) → tdd-worker (TDD, asks when uncertain) →
  slice-verifier (gate) → worker (divergence check) → worker (land).
  No prior start-slice needed — slice already has its test plan from create-task.
  Use after create-task, or one-at-a-time instead of pipeline-slices.
---

# Implement Slice — Build with TDD (Chain)

Phase 2: build a slice via strict TDD. The slice already has a test plan
(from create-task), so implementation is autonomous with two escape hatches:
the tdd-worker asks when uncertain, and a divergence check after verification
flags plan deviations that could affect remaining slices.

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
  // If skip, proceed with a warning but don't block.
}
```

If the pull fails with conflicts, stop — the user must resolve them manually.

## Step 1 — Validate prerequisites

Verify the slice doc has `analysed: true` and a `## Test plan` section.
If not, this slice hasn't been through create-task — run `/skill:create-task`
first to plan the task with test strategies.

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
// Read the chain definition from the extracted chain file
const chainDef = JSON.parse(bash("cat chains/implement-slice.chain.json"))

// Substitute runtime variables into step tasks
const steps = chainDef.steps.map(step => ({
  ...step,
  task: step.task
    .replaceAll("{taskSlug}", taskSlug)
    .replaceAll("{sliceSlug}", sliceSlug)
    .replaceAll("{slicePath}", slicePath)
    .replaceAll("{taskPath}", taskPath)
}))

subagent({
  async: true,
  timeoutMs: chainDef.timeoutMs,
  turnBudget: chainDef.turnBudget,
  chain: steps
})
```

## Step 3 — Parent loop (handle interactive requests)

Two types of requests may arrive during implementation:

1. **interview_request** — tdd-worker is uncertain about the test plan or
   acceptance criteria.
2. **need_discussion** — divergence-checker found plan deviations that affect
   remaining slices.

```
const chainRunId = "<id returned by subagent launch>"

while (true) {
  await wait({ id: chainRunId })

  const pending = await subagent_supervisor({ action: "pending" })
  for (const request of pending) {
    if (request.reason === "interview_request") {
      // tdd-worker hit something uncertain — test plan outdated, criterion
      // ambiguous, or a design decision not covered by the plan.
      const { question, context, recommended, reasoning } =
        JSON.parse(request.interview)

      const answer = await ask_user_question({
        header: "Uncertain",
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

    } else if (request.reason === "need_discussion") {
      // divergence-checker found significant plan deviations that affect
      // remaining slices. This is a ONE-SHOT discussion — the agent prepared
      // everything, now the user decides.
      const { summary, affectedSlices, recommendation, options } =
        JSON.parse(request.discussion)

      const decision = await ask_user_question({
        header: "Diverged",
        question: `**What diverged:** ${summary}\n\n**Affected slices:** ${affectedSlices}\n\n**Recommendation:** ${recommendation}\n\nChoose how to proceed:`,
        options: options.map(opt => ({
          label: opt.label,
          description: opt.description
        }))
      })

      await subagent_supervisor({
        action: "reply",
        replyTo: request.id,
        message: JSON.stringify({ decision })
      })
    }
  }

  const chainStatus = await subagent({ action: "status", id: chainRunId })
  if (chainStatus.state === "complete") break
  if (chainStatus.state === "failed" || chainStatus.state === "paused") {
    // Check if tdd-worker exhausted its turn budget (the most common
    // failure mode). If so, retry with learnings from the partial output.
    const tddResultPath = "{chain_dir}/tdd/result.md"
    const tddResultExists = bash(`test -f ${tddResultPath} && echo yes || echo no`).trim()

    if (tddResultExists === "yes") {
      let retries = 0
      const maxRetries = 2

      while (retries < maxRetries) {
        retries++
        report: `tdd-worker did not complete (attempt ${retries}/${maxRetries + 1}). Retrying with prior output…`

        // Read partial output for context on what remains
        const priorOutput = bash(`cat ${tddResultPath}`)

        // Re-launch tdd-worker with continuation context
        const retryRunId = subagent({
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

The previous attempt did not complete. Here is what was accomplished:

${priorOutput}

Continue from where the previous attempt left off. Follow the same
strict TDD cycle. Do NOT redo work that was already completed —
pick up from the first unfinished acceptance criterion.`,
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

        // Wait for retry chain, relay any interview requests
        while (true) {
          await wait({ id: retryRunId })
          const pendingRetry = await subagent_supervisor({ action: "pending" })
          for (const req of pendingRetry) {
            if (req.reason === "interview_request") {
              const { question, context, recommended, reasoning } =
                JSON.parse(req.interview)
              const answer = await ask_user_question({
                header: "Uncertain",
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
                replyTo: req.id,
                message: JSON.stringify({ answer })
              })
            }
          }
          const retryStatus = await subagent({ action: "status", id: retryRunId })
          if (retryStatus.state === "complete") {
            // Retry succeeded — patch the main chain status by manually
            // running the remaining steps (diverge + land)
            const tailRunId = subagent({
              async: true,
              chain: [
                {
                  agent: "skills.worker",
                  as: "retry-diverge",
                  phase: "Divergence",
                  label: "Divergence check (retry)",
                  task: `Check for plan divergence that could affect remaining slices.

Read {chain_dir}/tdd/result.md for the ## Divergence from plan section
and any ## Significant divergences.

Read the slice doc at ${slicePath} for the original plan.

If NO significant divergences: output "no significant divergence" and stop.

If significant divergences exist:
1. Read the task doc at ${taskPath}.
2. Read EVERY remaining slice doc at docs/tasks/${taskSlug}/slices/.
3. For each remaining slice, determine if the divergence affects it.
4. If NO remaining slices are affected: explain why. Proceed.
5. If any remaining slices ARE affected, use
   contact_supervisor({ reason: "need_discussion" }) with summary,
   affectedSlices, recommendation, and options.
   After the supervisor replies, apply updates. Output "divergence handled".`,
                  output: "diverge/result.md",
                  acceptance: {
                    level: "none",
                    reason: "interactive divergence discussion"
                  }
                },
                {
                  agent: "skills.worker",
                  as: "retry-land",
                  phase: "Landing",
                  label: "Merge and archive (retry)",
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
5. Archive the slice:
   mkdir -p docs/tasks/${taskSlug}/slices/archive
   git mv ${slicePath} docs/tasks/${taskSlug}/slices/archive/<n>-<slug>.md
6. Commit: git add docs/tasks/ && git commit -m "docs(slice): land ${sliceSlug} into ${taskSlug}"
7. Check remaining slices. If last: set task done.
8. Set task_state_set last_action implement-slice landed ${sliceSlug}`,
                  output: "land/result.md"
                }
              ]
            })

            // Relay any divergence discussions from the tail chain
            while (true) {
              await wait({ id: tailRunId })
              const pendingTail = await subagent_supervisor({ action: "pending" })
              for (const req of pendingTail) {
                if (req.reason === "need_discussion") {
                  const { summary, affectedSlices, recommendation, options } =
                    JSON.parse(req.discussion)
                  const decision = await ask_user_question({
                    header: "Diverged",
                    question: `**What diverged:** ${summary}\n\n**Affected slices:** ${affectedSlices}\n\n**Recommendation:** ${recommendation}`,
                    options: options.map(opt => ({
                      label: opt.label,
                      description: opt.description
                    }))
                  })
                  await subagent_supervisor({
                    action: "reply",
                    replyTo: req.id,
                    message: JSON.stringify({ decision })
                  })
                }
              }
              const tailStatus = await subagent({ action: "status", id: tailRunId })
              if (tailStatus.state === "complete") break
              if (tailStatus.state === "failed") {
                report: "retry chain tail did not complete; inspect chain_dir"
                return
              }
            }
            break  // Retry succeeded, exit the outer retry loop
          }
          if (retryStatus.state === "failed" || retryStatus.state === "paused") {
            break  // Retry also failed, fall through to next iteration or escalation
          }
        }

        // If retry chain completed successfully, break out of retry loop
        const finalStatus = await subagent({ action: "status", id: retryRunId })
        if (finalStatus.state === "complete") break
      }

      // If all retries exhausted, escalate to user
      const finalCheck = await subagent({ action: "status", id: chainRunId })
      if (retries >= maxRetries) {
        report: `tdd-worker did not complete after ${maxRetries + 1} attempts. Inspect {chain_dir}/tdd/result.md and decide next steps.`
        return
      }
    } else {
      report: "implement-slice chain did not complete; inspect status and chain_dir"
      return
    }
  }
}
```

After the chain completes, read `{chain_dir}/land/result.md` to confirm
landing was successful.

## Step 4 — Report

Report the outcome:

- Slice implemented, verified, and landed
- Any divergences from the plan (and whether they triggered a discussion)
- Number of remaining slices
- If all slices done: "Run `/skill:finalize-task <task-slug>`"
- If more remain: "Next: `/skill:implement-slice <next-slug>` or `/skill:pipeline-slices <task-slug>`"

## Error handling

- If `analysed: false` or no `## Test plan`, run `/skill:create-task` first —
  the slice wasn't planned properly.
- If the verifier fails, inspect `{chain_dir}/verify/result.md` and restart
  the chain (the tdd-worker will fix issues and retry).
- If merge conflicts arise, resolve them to keep both new and already-merged
  slices working.
- Never merge a red slice into the task branch.
- If the divergence-checker's `need_discussion` isn't answered within a
  reasonable time (the user walked away), the chain pauses — this is expected.
  Resume via `subagent({ action: "resume", id: "..." })` with the decision.

## Constraints

- Spec-first — never write a test to match a wrong implementation.
- No speculative code — implement only what the slice requires.
- No per-slice PR — slices merge into the task branch; only finalize merges to main.
- Ask when uncertain — guessing compounds across slices.
- Divergence is expected — the plan is a plan, not a contract. Minor deviations
  are normal. The divergence check exists to catch the ones that matter.
