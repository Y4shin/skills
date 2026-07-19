---
name: pipeline-slices
description: >
  Pipeline all remaining slices of a task into one autonomous sequence:
  for each slice, run setup → tdd → verify → divergence-check → land.
  Subagents fail with structured artifacts on uncertainty or divergence;
  the parent resolves and retries. No supervisor/intercom needed.
  Use instead of manually running implement-slice for each slice.
---

# Pipeline All Slices

Builds a sequence that implements every remaining slice of a task
sequentially. Each slice goes through the full implement-slice sequence
(setup, TDD, verify, divergence check, land). The parent handles
uncertainty and divergence artifacts as they arise.

## Pipeline diagram

```
setup(A) → tdd(A) → verify(A) → diverge(A) → land(A) →
setup(B) → tdd(B) → verify(B) → diverge(B) → land(B) →
... → land(last) → done
```

## Prerequisites

- Task doc exists with `slices:` list populated. All slices have
  `analysed: true` and `## Test plan` (from create-task).
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

For each pending slice, launch a subagent chain, wait for completion, and
handle any failures (uncertainty or divergence) before moving to the next.

```
const taskSlug = "<task-slug>"
const taskPath = "docs/tasks/<task-slug>/task.md"
const chainDef = JSON.parse(bash("cat chains/implement-slice.chain.json"))

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

  // --- Build per-slice chain ---
  const sliceChain = chainDef.chain.map(step => ({
    ...step,
    task: step.task
      .replaceAll("{taskSlug}", taskSlug)
      .replaceAll("{sliceSlug}", sliceSlug)
      .replaceAll("{slicePath}", slicePath)
      .replaceAll("{taskPath}", taskPath),
    output: step.output && step.output.replace("setup/", `setup/${sliceSlug}-`)
      .replace("tdd/", `tdd/${sliceSlug}-`)
      .replace("verify/", `verify/${sliceSlug}-`)
      .replace("diverge/", `diverge/${sliceSlug}-`)
      .replace("land/", `land/${sliceSlug}-`)
  }))

  // --- Launch and handle failures ---
  let chainRunId = subagent({
    async: true,
    timeoutMs: chainDef.timeoutMs,
    turnBudget: chainDef.turnBudget,
    chain: sliceChain
  })

  let chainStatus = await subagent_wait({ id: chainRunId })
  let retries = 0
  const maxRetries = 2
  let sliceSkipped = false

  while (chainStatus.state !== "complete" && retries <= maxRetries && !sliceSkipped) {
    const tddUncertaintyPath = `{chain_dir}/tdd/${sliceSlug}-uncertainty.md`
    const divergeArtifactPath = `{chain_dir}/diverge/${sliceSlug}-divergence.md`

    if (bash(`test -f ${tddUncertaintyPath} && echo yes || echo no`).trim() === "yes") {
      // ── TDD uncertainty ──────────────────────────────────────
      const uncertainty = read(tddUncertaintyPath)
      const resolution = await ask_user_question({
        header: "Uncertain",
        question: `**Slice ${i + 1}/${pendingSlices.length}:** ${sliceSlug}\n\nThe TDD worker hit an uncertainty:\n\n${uncertainty}\n\nHow should it proceed?`,
        options: [
          { label: "Accept recommended",
            description: "Proceed with the recommended approach." },
          { label: "Custom answer",
            description: "Provide a specific answer." }
        ]
      })

      retries++
      const priorOutput = bash(`test -f {chain_dir}/tdd/${sliceSlug}-result.md && cat {chain_dir}/tdd/${sliceSlug}-result.md || echo ""`)

      chainRunId = subagent({
        async: true,
        chain: [
          {
            agent: "skills.tdd-worker",
            as: "retry-tdd",
            phase: "Implementation",
            label: "TDD continuation (retry)",
            task: `CONTINUATION (attempt ${retries + 1}): Implement slice "${sliceSlug}"
for task "${taskSlug}".

Slice doc: ${slicePath}
Task doc: ${taskPath}

Resolution for uncertainty: ${resolution}

Prior output:
${priorOutput}

Continue from where the previous attempt left off. Follow strict TDD.
Do NOT redo completed work.`,
            output: `tdd/${sliceSlug}-result.md`
          },
          {
            agent: "skills.slice-verifier",
            as: "retry-verify",
            phase: "Verification",
            label: "Verify (retry)",
            outputMode: "file-only",
            task: `Verify slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}

Run lint, then tests from the ## Test plan. Block on failure.`,
            output: `verify/${sliceSlug}-result.md`
          }
        ]
      })
      chainStatus = await subagent_wait({ id: chainRunId })

    } else if (bash(`test -f ${divergeArtifactPath} && echo yes || echo no`).trim() === "yes") {
      // ── Divergence detected ───────────────────────────────────
      const divergence = read(divergeArtifactPath)
      const decision = await ask_user_question({
        header: "Diverged",
        question: `**Slice ${i + 1}/${pendingSlices.length}:** ${sliceSlug}\n\nThe implementation diverged from the plan:\n\n${divergence}\n\nHow to proceed?`,
        options: [
          { label: "Accept, continue",
            description: "Proceed with landing this slice and continue pipeline." },
          { label: "Stop pipeline",
            description: "Divergence may affect remaining slices. Stop and revise." }
        ]
      })

      if (decision === "Accept, continue") {
        chainRunId = subagent({
          async: true,
          chain: [{
            agent: "skills.worker",
            as: "retry-land",
            phase: "Landing",
            label: "Merge and archive",
            outputMode: "file-only",
            task: `Land slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}
Task doc: ${taskPath}

1. Read slice doc and {chain_dir}/tdd/${sliceSlug}-result.md.
2. Merge: git checkout task/${taskSlug} && git merge --no-ff slice/${sliceSlug}
3. git branch -d slice/${sliceSlug}
4. task_set ${slicePath} status done; task_set ${slicePath} completed_at <ISO now>
5. Archive: mkdir -p docs/tasks/${taskSlug}/slices/archive
   git mv ${slicePath} docs/tasks/${taskSlug}/slices/archive/${i + 1}-${sliceSlug}.md
6. git add docs/tasks/ && git commit -m "docs(slice): land ${sliceSlug} into ${taskSlug}"`,
            output: `land/${sliceSlug}-result.md`
          }]
        })
        chainStatus = await subagent_wait({ id: chainRunId })
      } else {
        report: `Pipeline stopped at slice "${sliceSlug}" due to divergence.`
        sliceSkipped = true
        break
      }
    } else {
      // ── Other failure ─────────────────────────────────────────
      const action = await ask_user_question({
        header: "Slice failed",
        question: `Slice "${sliceSlug}" failed. Inspect {chain_dir} for details. How to proceed?`,
        options: [
          { label: "Skip this slice",
            description: "Continue with remaining slices." },
          { label: "Stop pipeline",
            description: "Abort the entire pipeline." }
        ]
      })
      if (action === "Skip this slice") {
        task_set(slicePath, "status", "skipped")
        sliceSkipped = false  // Continue to next slice
        break
      } else {
        sliceSkipped = true
        break
      }
    }
  }

  if (sliceSkipped) break

  // --- Slice completed successfully: update state ---
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

## Step 3 — Report after all slices

Report:

```
Pipeline result for task "${taskSlug}":
- ${pendingSlices.length} slice(s) implemented and landed.
- Uncertainty resolutions: <count or "none">
- Divergence discussions: <count or "none">

State: all slices done.
Next: /skill:finalize-task ${taskSlug}
```

## Error handling

### Slice implementation fails

If a tdd-worker or slice-verifier step fails, the per-slice loop retries
up to 2 additional times with continuation context. If all retries are
exhausted, the parent asks the user how to proceed.

### Divergence detected

The divergence-checker writes a structured artifact and fails. The parent
reads it and asks the user whether to accept and continue, or stop.

### Merge conflicts

If a land step hits merge conflicts, the chain stops. Resolve conflicts
manually on the task branch, then re-run `/skill:pipeline-slices <task-slug>`.

## Constraints

- **All slices must have `analysed: true` and `## Test plan`.** The pipeline
  assumes create-task already ran and every slice is ready to implement.
- **Spec-first.** Every test assertion derives from acceptance criteria.
- **No speculative code.** Implement only what each slice requires.
- **No per-slice PR.** Slices merge into the task branch; finalize merges to main.
- **Subagents never ask the user questions.** They fail with structured artifacts.
- **Divergence is expected.** The pipeline handles it gracefully.