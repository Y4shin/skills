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

## Step 2 — Build the mega-chain

For each pending slice, append the full implement-slice sequence.
State updates (task_state_set) are handled by each land step, with the
last land step setting next_action to finalize-task.

```
const taskSlug = "<task-slug>"
const taskPath = "docs/tasks/<task-slug>/task.md"

function implementSliceSteps(slice, index, total) {
  const slicePath = `docs/tasks/${taskSlug}/slices/${index + 1}-${slice.slug}.md`
  const sliceSlug = slice.slug
  const isLast = (index === total - 1)

  return [
    {
      agent: "skills.worker",
      as: "setup",
      phase: "Preparation",
      label: "Prepare branch for slice",
      outputMode: "file-only",
      task: `Prepare the implementation branch for slice "${sliceSlug}"
(task: "${taskSlug}"). Slice ${index + 1} of ${total}.

1. Sync with origin if remote exists:
   git fetch origin 2>/dev/null || true
   git checkout main && git pull --ff-only origin main 2>/dev/null || true

2. Ensure the task integration branch exists:
   git checkout task/${taskSlug} 2>/dev/null || git checkout -b task/${taskSlug}

3. Create the slice feature branch:
   git checkout -b slice/${sliceSlug}

4. Read the slice doc at ${slicePath} and the task doc at ${taskPath}.
   Read docs/testing.md if it exists for project test conventions.

5. Set state:
   task_set ${slicePath} status in-progress
   task_set ${slicePath} started_at <ISO now>
   task_state_set active.slice ${sliceSlug}
   task_state_set last_action "pipeline: implementing ${sliceSlug} (${index + 1}/${total})"
   task_state_set next_action ""

6. Report: branch slice/${sliceSlug} created.`,
      output: `setup/${sliceSlug}-result.md`
    },
    {
      agent: "skills.tdd-worker",
      as: "tdd",
      phase: "Implementation",
      label: "TDD cycle",
      outputMode: "file-only",
      task: `Implement slice "${sliceSlug}" for task "${taskSlug}"
using strict TDD. Slice ${index + 1} of ${total}.

Slice doc: ${slicePath}
Task doc: ${taskPath}

Read the slice doc's acceptance criteria and ## Test plan. Follow the
strict TDD cycle:

1. RED — write a failing test derived from acceptance criteria.
   The test MUST fail before implementation.
2. GREEN — write minimal code to make the test pass. No speculative code.
3. REFACTOR — clean up, improve names, extract helpers. Test must still pass.
4. Repeat for each acceptance criterion.
5. Run the full test suite if available. Fix anything that breaks.

Read docs/testing.md for project conventions. Use get_guidelines for
language-specific best practices. Follow any injected coding guidelines.

── Uncertainty escape hatch ──────────────────────────────────────────
If you encounter ANY of these, ask the supervisor via
contact_supervisor({ reason: "interview_request" }):
- Test plan outdated due to prior slice implementations.
- Ambiguous acceptance criterion even after codebase exploration.
- Failure mode no longer applies, or a new one emerged.
- Design decision not addressed by the test plan.

Include a recommended answer with reasoning. Do NOT guess.

── Divergence tracking ────────────────────────────────────────────────
Include a ## Divergence from plan section:
- List every decision where implementation differed from the slice doc.
- Rate each as "minor" or "significant".
- If significant divergences exist, end with ## Significant divergences.`,
      output: `tdd/${sliceSlug}-result.md`
    },
    {
      agent: "skills.slice-verifier",
      as: "verify",
      phase: "Verification",
      label: "Run lint and tests",
      outputMode: "file-only",
      task: `Verify slice "${sliceSlug}" for task "${taskSlug}".
Slice ${index + 1} of ${total}.

Slice doc: ${slicePath}

Run the quality gate:
1. Find and run the lint command. Skip with warning if none configured.
2. Find and run the test command from ## Test plan → Run command.

If lint fails: STOP. If tests fail: STOP.
Only proceed if both are clean.`,
      output: `verify/${sliceSlug}-result.md`
    },
    {
      agent: "skills.worker",
      as: "diverge",
      phase: "Divergence",
      label: "Check plan divergence",
      task: `Check for plan divergence that could affect remaining slices.
Slice ${index + 1} of ${total}.

Read {chain_dir}/tdd/${sliceSlug}-result.md for the ## Divergence from plan.

Read the slice doc at ${slicePath} for the original plan.

If NO significant divergences: output "no significant divergence" and stop.

If significant divergences exist:
1. Read the task doc at ${taskPath}. Note the full slice breakdown.
2. Read EVERY remaining slice doc (slices ${index + 2} through ${total})
   at docs/tasks/${taskSlug}/slices/. Focus on ## Test plan and
   acceptance criteria.
3. For each remaining slice, determine if this divergence affects it.
4. If NO remaining slices are affected: explain why. Proceed.

5. If any remaining slices ARE affected, prepare a discussion request via
   contact_supervisor({ reason: "need_discussion" }) with:
   - summary: what diverged and why.
   - affectedSlices: which remaining slices are affected and how.
   - recommendation: your suggested action.
   - options: [
       { label: "Update slice docs", description: "Apply changes to affected slices." },
       { label: "Continue anyway", description: "Accept the risk." },
       { label: "Pause and replan", description: "Stop and revisit the plan." }
     ]

   After the supervisor replies, apply any updates to the affected slice docs.
   Output "divergence handled" and proceed.`,
      output: `diverge/${sliceSlug}-result.md`,
      acceptance: {
        level: "none",
        reason: "interactive divergence discussion; supervisor decision is the acceptance signal"
      }
    },
    {
      agent: "skills.worker",
      as: "land",
      phase: "Landing",
      label: "Merge and archive slice",
      outputMode: "file-only",
      task: `Land slice "${sliceSlug}" for task "${taskSlug}".
Slice ${index + 1} of ${total}.${isLast ? " LAST SLICE." : ""}

Slice doc: ${slicePath}
Task doc: ${taskPath}

1. Read the slice doc and {chain_dir}/tdd/${sliceSlug}-result.md.

2. Merge into the task branch:
   git checkout task/${taskSlug}
   git merge --no-ff slice/${sliceSlug} -m "slice(${taskSlug}): <slice title>"
   git branch -d slice/${sliceSlug}

3. Record completion:
   task_set ${slicePath} status done
   task_set ${slicePath} completed_at <ISO now>

4. Append implementation note to the task's ## Implementation notes:
   what was built, any deviations, and affected slice updates if any.

5. Archive the slice:
   mkdir -p docs/tasks/${taskSlug}/slices/archive
   git mv ${slicePath} docs/tasks/${taskSlug}/slices/archive/${index + 1}-${sliceSlug}.md

6. Commit: git add docs/tasks/ && git commit -m "docs(slice): land ${sliceSlug} into ${taskSlug}"

${isLast ? `
7. THIS IS THE LAST SLICE:
   task_set ${taskSlug} status done
   task_set ${taskSlug} completed_at <ISO now>
   task_state_set active.slice null
   task_state_set last_action "pipeline: all slices landed for ${taskSlug}"
   task_state_set next_action finalize-task ${taskSlug}
` : `
7. task_state_set active.slice null
   task_state_set last_action "pipeline: landed ${sliceSlug} (${index + 1}/${total})"
   task_state_set next_action ""  (next slice will set it)
`}`,
      output: `land/${sliceSlug}-result.md`
    }
  ]
}

// Build the chains array
const allSteps = []
pendingSlices.forEach((slice, i) => {
  allSteps.push(...implementSliceSteps(slice, i, pendingSlices.length))
})

subagent({
  async: true,
  timeoutMs: 600_000,
  turnBudget: { maxTurns: 60, graceTurns: 8 },
  chain: allSteps
})
```

## Step 3 — Parent loop (handle interactive requests)

Two types of requests: `interview_request` (tdd-worker uncertain) and
`need_discussion` (divergence check found problems).

```
const chainRunId = "<id returned by subagent launch>"

while (true) {
  await wait({ id: chainRunId })

  const pending = await subagent_supervisor({ action: "pending" })
  for (const request of pending) {
    if (request.reason === "interview_request") {
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
    // Detect which slice's tdd-worker failed by checking output files.
    // The chain processes slices sequentially, so the first slice without
    // a tdd result is the one that failed.
    let failedSlice = null
    let failedIndex = -1
    for (let i = 0; i < pendingSlices.length; i++) {
      const s = pendingSlices[i]
      const tddPath = `{chain_dir}/tdd/${s.slug}-result.md`
      const exists = bash(`test -f ${tddPath} && echo yes || echo no`).trim()
      if (exists === "no") {
        failedSlice = s
        failedIndex = i
        break
      }
    }

    if (failedSlice) {
      let retries = 0
      const maxRetries = 2
      const sliceSlug = failedSlice.slug
      const slicePath = `docs/tasks/${taskSlug}/slices/${failedIndex + 1}-${sliceSlug}.md`

      while (retries < maxRetries) {
        retries++
        report: `tdd-worker for ${sliceSlug} did not complete (attempt ${retries}/${maxRetries + 1}). Retrying…`

        // Check if there's partial output
        const tddResultPath = `{chain_dir}/tdd/${sliceSlug}-result.md`
        let priorOutput = ""
        const hasPartial = bash(`test -f ${tddResultPath} && echo yes || echo no`).trim()
        if (hasPartial === "yes") {
          priorOutput = bash(`cat ${tddResultPath}`)
        }

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
Slice ${failedIndex + 1} of ${pendingSlices.length}.

Slice doc: ${slicePath}
Task doc: ${taskPath}

The previous attempt did not complete.${hasPartial === "yes" ? ` Here is what was accomplished:

${priorOutput}

Continue from where the previous attempt left off.` : " Start from scratch."} Do NOT redo completed work.
Follow the strict TDD cycle.`,
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

Run lint, then tests from ## Test plan → Run command.
Stop on first failure.`,
              output: `verify/${sliceSlug}-result.md`
            }
          ]
        })

        // Wait for retry, relay interview requests
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
          if (retryStatus.state === "complete") break
          if (retryStatus.state === "failed" || retryStatus.state === "paused") break
        }

        const retryFinalStatus = await subagent({ action: "status", id: retryRunId })
        if (retryFinalStatus.state === "complete") {
          // Retry succeeded — rebuild the remaining chain (diverge + land
          // for this slice, then all remaining slices in full) and launch
          const remainingSteps = []

          // Diverge + land for the retried slice
          remainingSteps.push(
            {
              agent: "skills.worker",
              as: "retry-diverge",
              phase: "Divergence",
              label: "Divergence check (retry)",
              task: `Check for plan divergence for slice "${sliceSlug}".
Slice ${failedIndex + 1} of ${pendingSlices.length}.
Read {chain_dir}/tdd/${sliceSlug}-result.md and ${slicePath}.
If no significant divergences, output "no significant divergence".
If significant divergences affect remaining slices,
use contact_supervisor({ reason: "need_discussion" }).`,
              output: `diverge/${sliceSlug}-result.md`,
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
Merge, record done, archive, commit.`,
              output: `land/${sliceSlug}-result.md`
            }
          )

          // Append remaining slices (full implementSliceSteps)
          for (let j = failedIndex + 1; j < pendingSlices.length; j++) {
            remainingSteps.push(...implementSliceSteps(pendingSlices[j], j, pendingSlices.length))
          }

          const tailRunId = subagent({
            async: true,
            chain: remainingSteps
          })

          // Relay any divergence discussions from the tail
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
            if (tailStatus.state === "failed" || tailStatus.state === "paused") {
              report: "tail chain did not complete; inspect chain_dir"
              return
            }
          }
          break  // Retry succeeded
        }
      }

      if (retries >= maxRetries) {
        report: `tdd-worker for ${sliceSlug} did not complete after ${maxRetries + 1} attempts. Inspect {chain_dir}/tdd/${sliceSlug}-result.md.`
        return
      }
    } else {
      report: "pipeline chain did not complete; inspect status and chain_dir"
      return
    }
  }
}
```

## Step 4 — Report

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

If a tdd-worker or slice-verifier step fails, the chain stops at that slice.
The land steps for prior slices have already committed — those are done.
The failing slice is still on its feature branch (`slice/<slug>`) with
its work preserved.

**Recovery:** Fix the issue, then either:
- Re-run `/skill:pipeline-slices <task-slug>` — it skips already-done slices
  and resumes from the first `status: todo` slice.
- Or run `/skill:implement-slice <failed-slug>` for just that slice.

### Divergence discussion pause

The chain pauses at the divergence-checker step when a `need_discussion` is
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
