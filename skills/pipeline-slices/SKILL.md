---
name: pipeline-slices
description: >
  Pipeline all remaining slices of a task into one big autonomous chain:
  for each slice, run setup → tdd → verify → divergence-check → land.
  The user launches it once and only interacts if the divergence check
  finds plan deviations that affect remaining slices.
  Use instead of manually running implement-slice for each slice.
---

# Pipeline All Slices

Builds ONE chain that implements every remaining slice of a task
sequentially. Each slice goes through the full implement-slice sequence
(setup, TDD, verify, divergence check, land). The parent loop handles
divergence discussions as they arise.

**Result:** one launch, one session — all slices implemented autonomously
with divergence checks between them.

## Pipeline diagram

```
setup(A) → tdd(A) → verify(A) → diverge(A) → land(A) →
setup(B) → tdd(B) → verify(B) → diverge(B) → land(B) →
... → land(last) → done
```

- All steps run in one chain, sequentially.
- The tdd-worker asks the supervisor when uncertain.
- The divergence check after each slice pauses for user discussion only if
  significant deviations affect remaining slices.

## Prerequisites

- Task doc exists with `slices:` list populated. All slices have
  `analysed: true` and `## Test plan` (from create-task).
- `pi-subagents` installed.
- Run `task_slices <slug>` to see what's left. Only non-archived,
  non-done slices are implemented.

## Step 1 — Read task and enumerate slices

```
const taskSlug = "<task-slug>"
const taskPath = "docs/tasks/<task-slug>/task.md"
const taskDoc = task_show(taskSlug)

const slices = task_slices(taskSlug)  // active (non-archived) slices
```

Filter to slices that need implementation:

```
const pendingSlices = slices.filter(s => s.status !== "done")

if (pendingSlices.length === 0) {
  report: "All slices are already done. Run /skill:finalize-task ${taskSlug}."
  return
}
```

Report what will be implemented:

```
Implementing ${pendingSlices.length} slice(s) for task "${taskSlug}":
${pendingSlices.map((s, i) => `  ${i + 1}. ${s.slug}`).join("\n")}
```

## Step 2 — Pipeline slices one at a time

For each pending slice, read the canonical chain from `implement-slice.chain.json`,
substitute per-slice variables, launch as its own async subagent run, and process
to completion before moving to the next slice. State management (status updates,
archive, next_action) is handled by the parent loop, not inside chain steps.

```
const taskSlug = "<task-slug>"
const taskPath = "docs/tasks/<task-slug>/task.md"

// Read the canonical 5-step chain once
const chainDef = JSON.parse(bash("cat chains/implement-slice.chain.json"))

function buildSliceChain(slice, index, total) {
  const sliceSlug = slice.slug
  const slicePath = `docs/tasks/${taskSlug}/slices/${index + 1}-${sliceSlug}.md`

  // Clone and parameterize each step with per-slice output paths
  return chainDef.steps.map(step => ({
    ...step,
    task: step.task
      .replaceAll("{taskSlug}", taskSlug)
      .replaceAll("{sliceSlug}", sliceSlug)
      .replaceAll("{slicePath}", slicePath)
      .replaceAll("{taskPath}", taskPath),
    // Per-slice output paths so results don't collide
    output: step.output && step.output.replace("setup/", `setup/${sliceSlug}-`)
      .replace("tdd/", `tdd/${sliceSlug}-`)
      .replace("verify/", `verify/${sliceSlug}-`)
      .replace("diverge/", `diverge/${sliceSlug}-`)
      .replace("land/", `land/${sliceSlug}-`)
  }))
}

// Iterate over each pending slice, one at a time
for (let i = 0; i < pendingSlices.length; i++) {
  const slice = pendingSlices[i]
  const sliceSlug = slice.slug
  const slicePath = `docs/tasks/${taskSlug}/slices/${i + 1}-${sliceSlug}.md`
  const isLast = (i === pendingSlices.length - 1)

  report: `Pipeline: slice ${i + 1} of ${pendingSlices.length} — ${sliceSlug}`

  // --- Pre-flight: set in-progress state ---
  task_set(slicePath, "status", "in-progress")
  task_state_set("active.slice", sliceSlug)
  task_state_set("last_action", `pipeline: implementing ${sliceSlug} (${i + 1}/${pendingSlices.length})`)

  // --- Launch the slice chain ---
  const sliceChain = buildSliceChain(slice, i, pendingSlices.length)

  const sliceRunId = subagent({
    async: true,
    timeoutMs: chainDef.timeoutMs,
    turnBudget: chainDef.turnBudget,
    chain: sliceChain
  })

  // --- Wait and relay for this slice ---
  let sliceFailed = false
  let retries = 0
  const maxRetries = 2

  while (retries <= maxRetries && !sliceFailed) {
    const runIdToWait = (retries === 0) ? sliceRunId : retryRunId

    while (true) {
      await wait({ id: runIdToWait })
      const pending = await subagent_supervisor({ action: "pending" })

      for (const request of pending) {
        if (request.reason === "interview_request") {
          const { question, context, recommended, reasoning } =
            JSON.parse(request.interview)
          const answer = await ask_user_question({
            header: "Uncertain",
            question: `**Slice:** ${sliceSlug}\n\n**Context:** ${context}\n\n**Question:** ${question}\n\n**Recommended:** ${recommended}\n\n**Reasoning:** ${reasoning}`,
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
          const { summary, affectedSlices, recommendation, options } =
            JSON.parse(request.discussion)
          const decision = await ask_user_question({
            header: "Diverged",
            question: `**Slice:** ${sliceSlug}\n\n**What diverged:** ${summary}\n\n**Affected slices:** ${affectedSlices}\n\n**Recommendation:** ${recommendation}`,
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

      const status = await subagent({ action: "status", id: runIdToWait })
      if (status.state === "complete") break
      if (status.state === "failed" || status.state === "paused") {
        sliceFailed = true
        break
      }
    }

    if (!sliceFailed) {
      // Slice completed successfully
      break
    }

    // --- Retry logic: detect tdd-worker failure, relaunch with continuation ---
    if (retries < maxRetries) {
      retries++
      report: `tdd-worker for ${sliceSlug} did not complete. Retrying (${retries}/${maxRetries})…`

      const tddOutPath = `{chain_dir}/tdd/${sliceSlug}-result.md`
      let priorOutput = ""
      const hasPartial = bash(`test -f ${tddOutPath} && echo yes || echo no`).trim()
      if (hasPartial === "yes") {
        priorOutput = bash(`cat ${tddOutPath}`)
      }

      // Build a minimal retry chain: tdd-worker + slice-verifier
      const retryChain = [
        {
          agent: "skills.tdd-worker",
          as: "retry-tdd",
          phase: "Implementation",
          label: "TDD continuation (retry)",
          task: `CONTINUATION (attempt ${retries + 1}): Implement slice "${sliceSlug}" for task "${taskSlug}".\n\n${hasPartial === "yes" ? `Prior output:\n${priorOutput}\n\nContinue from where the previous attempt left off.` : "Start from scratch."}`,
          output: `tdd/${sliceSlug}-result.md`
        },
        {
          agent: "skills.slice-verifier",
          as: "retry-verify",
          phase: "Verification",
          label: "Verify (retry)",
          outputMode: "file-only",
          task: `Verify slice "${sliceSlug}" for task "${taskSlug}".\n\nRun lint, then tests from the slice doc's ## Test plan.`,
          output: `verify/${sliceSlug}-result.md`
        }
      ]

      const retryRunId = subagent({
        async: true,
        chain: retryChain
      })
      // Loop back to the wait loop above with retryRunId
      sliceFailed = false  // Reset so we re-enter the wait loop
      // Note: the while loop will re-enter with runIdToWait = retryRunId
      continue
    }

    // All retries exhausted — ask user how to proceed
    const action = await ask_user_question({
      header: "Slice failed",
      question: `Slice "${sliceSlug}" failed after ${maxRetries + 1} attempts. How to proceed?`,
      options: [
        { label: "Skip this slice",
          description: "Mark the slice as skipped and continue with remaining slices." },
        { label: "Stop pipeline",
          description: "Abort the entire pipeline. You can resume later." },
        { label: "Retry manually",
          description: "Exit the pipeline. Run implement-slice for this slice manually." }
      ]
    })

    if (action === "Skip this slice") {
      task_set(slicePath, "status", "skipped")
      break  // Continue to the next slice
    } else {
      report: `Pipeline stopped at slice "${sliceSlug}". Resume with /skill:pipeline-slices ${taskSlug}`
      return
    }
  }

  if (sliceFailed && retries >= maxRetries) {
    // Should have been handled above — safety net
    break
  }

  // --- Slice completed successfully: handle landing in the parent ---
  // Read the land output to confirm success, then update state
  const landOut = `{chain_dir}/land/${sliceSlug}-result.md`
  const landExists = bash(`test -f ${landOut} && echo yes || echo no`).trim()
  if (landExists !== "yes") {
    report: `Land result not found for ${sliceSlug} — chain may not have completed landing.`
    // Continue anyway; state updates are done here
  }

  // Archive the slice doc via git mv
  bash(`mkdir -p docs/tasks/${taskSlug}/slices/archive && git mv ${slicePath} docs/tasks/${taskSlug}/slices/archive/${i + 1}-${sliceSlug}.md 2>/dev/null || true`)
  bash(`git add docs/tasks/ && git commit -m "docs(slice): land ${sliceSlug} into ${taskSlug}" 2>/dev/null || true`)

  // State updates (previously in the land step)
  task_set(slicePath, "status", "done")
  task_state_set("active.slice", null)
  task_state_set("last_action", `pipeline: landed ${sliceSlug} (${i + 1}/${pendingSlices.length})`)

  if (isLast) {
    task_state_set("next_action", `finalize-task ${taskSlug}`)
  } else {
    task_state_set("next_action", "")
  }
}
```
```

## Step 3 — Report after all slices

After the loop completes, report the outcome:

After the chain completes, read the last land result:

```
// Each land step writes to land/<slug>-result.md
// The chain is done — all slices landed.
```

Report:

```
Pipeline result for task "${taskSlug}":
- ${pendingSlices.length} slice(s) implemented and landed.
- Divergence discussions triggered: <count or "none">.

State: all slices done.
Next: /skill:finalize-task ${taskSlug}
```

## Error handling

### Slice implementation fails

If a tdd-worker or slice-verifier step fails, the per-slice loop retries up to 2 additional times with continuation context. If all retries are exhausted, the parent asks the user how to proceed: skip the slice, stop the pipeline, or retry manually.

The failing slice is still on its feature branch (\`slice/<slug>\`) with its work preserved. Prior slices are already committed and archived.

**Recovery:** Choose from the per-slice prompt, or re-run \`/skill:pipeline-slices <task-slug>\` — it skips done/skipped slices and resumes from the first \`status: todo\` slice. Alternatively, run \`/skill:implement-slice <failed-slug>\` for just that slice.

### Divergence discussion pause

The chain pauses at the divergence-checker step when a `need_decision` is
outstanding. This is expected behavior. The chain resumes after the parent
relays the user's decision.

If the user is unavailable (session ends), the chain pauses. Resume by
re-running `/skill:pipeline-slices <task-slug>` — the pipeline picks up
from where it left off.

### Merge conflicts

If a land step hits merge conflicts (e.g., prior slice changed the same
area), the chain stops. Resolve conflicts manually on the task branch,
then re-run `/skill:pipeline-slices <task-slug>`.

## Constraints

- **All slices must have `analysed: true` and `## Test plan`.** The pipeline
  assumes create-task already ran and every slice is ready to implement.
  If not, run `/skill:create-task` first.
- **Spec-first.** Every test assertion derives from acceptance criteria.
- **No speculative code.** Implement only what each slice requires.
- **No per-slice PR.** Slices merge into the task branch; finalize merges to main.
- **Divergence is expected.** The pipeline handles it gracefully. Minor
  deviations are noted and committed. Significant ones trigger a one-shot
  discussion so the user can update affected slices before they're built.

**Handoff:** "All slices implemented for task `<task-slug>`. Ready for
`/skill:finalize-task <task-slug>`."
