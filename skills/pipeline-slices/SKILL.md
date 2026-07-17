---
name: pipeline-slices
description: >
  Pipeline all slices of a task: start-slice interviews run sequentially,
  but each implement-slice starts as soon as its analysis finishes — while
  the next slice's analysis is already under way. Skips already-analysed
  and already-completed slices so it works on partially-progressed tasks.
  Use instead of manually looping start-slice → implement-slice → etc.
---

# Pipeline All Slices

Replaces the manual loop: run ALL `start-slice` + `implement-slice` steps
for every slice of a task in a pipelined fashion. Start-slices (interactive)
run one at a time; implement-slices (non-interactive) queue up and execute
sequentially, with each implement starting as soon as its start finishes —
overlapping with the *next* slice's start interview.

**Result:** the user does one session of approvals; implementations run in
the background while later slices are being analysed.

## Pipeline diagram

```
            start(A)──┤approval──┤worker   start(B)──┤approval──┤worker   start(C)...
                         │                      │
                         └── implement(A) ──────┤
                                                 └── implement(B) ──── ...
```

- `start(A)` is interactive (grill-agent + approval-agent relay).
- As soon as `start(A)` finishes, `implement(A)` launches in the background.
- `start(B)` begins immediately (user continues approving) while `implement(A)` runs.
- When `implement(A)` finishes AND `start(B)` finishes, `implement(B)` launches.
- Repeat for all slices.

## Prerequisites

- Task doc exists with `slices:` list populated.
- `pi-subagents` installed.
- Each slice doc has `analysed: false` (unless already done).
- Run `task_finalizable` to check: it should say "not finalizable / open slices" — that's expected.

## State model

The **parent agent** owns all `task_state_set` calls. Chain workers only write
slice frontmatter and code. This avoids races between a completing implement
and a concurrently running start.

## Step 1 — Read task and enumerate slices

```
const taskSlug = "<task-slug>"
const slices = task_slices {taskSlug}  // list active (non-archived) slices
const slicesData = await Promise.all(slices.map(s => task_show(s)))
```

For each slice determine:

| Field | Meaning |
|-------|---------|
| `status: done` | Slice already completed — skip entirely |
| `analysed: true` and not done | Test plan written — skip start, queue implement directly |
| `analysed: false` | Needs analysis — run start-slice first |

```
const allSlices = slicesData.map((doc, i) => ({
  slug: doc.slug,
  path: `docs/tasks/${taskSlug}/slices/${i + 1}-${doc.slug}.md`,
  analysed: doc.analysed ?? false,
  done: (doc.status === "done")
}))

const skipped = allSlices.filter(s => s.done)
const preAnalyzed = allSlices.filter(s => s.analysed && !s.done)
const needsStart = allSlices.filter(s => !s.analysed && !s.done)
```

Report to the user:
- `skipped` — already done, skipped
- `preAnalyzed` — test plan exists, queuing implementation directly
- `needsStart` — needs analysis (interactive)

If `needsStart` is empty AND `preAnalyzed` is empty: nothing to do. Report
and stop.

If `needsStart` is empty and `preAnalyzed` is non-empty: run implementations
for pre-analysed slices sequentially, then finalize. (This is the "all slices
already started" case.)

## Step 2 — Define chain templates

These are the same as `start-slice` and `implement-slice` chains, but with
**all `task_state_set` calls removed** from worker steps. The parent handles
state updates.

### start-slice chain (no state writes)

```typescript
const taskDoc = `<content of task.md>`
const profile = `<task_profile output>`
const reference = `<task_reference output>`

function startSliceChain(slicePath: string, sliceSlug: string, sliceDoc: string) {
  return [
    {
      agent: "grill-agent",
      task: `Analyse a slice for a task-workflow project and identify its layers
and failure modes.

Task context:
${taskDoc}

Slice doc:
${sliceDoc}

Project profile:
${profile}

Your job:
1. Read the task and slice docs carefully. Explore the codebase to identify
   which layers / surfaces this slice touches end-to-end.
2. Walk the failure-mode tree: what can break? Identify at least two concrete
   failure modes.
3. Ask the user one question at a time via contact_supervisor. For each:
   - If you can answer from the codebase: do it. Move on.
   - If you need the user: give a recommended answer with reasoning.
4. Continue until both questions are resolved:
   a. "What does this slice touch end-to-end? Which layers?"
   b. "What are the failure modes? What can break?"

When done, output a structured summary under ## Interview summary that includes:
- Confirmed layer analysis
- Confirmed failure modes (at least two)
- Any user preferences or constraints discovered`,
      output: `grill/${sliceSlug}-analysis.md`,
      acceptance: { level: "none", reason: "planning/interview step only" }
    },
    {
      agent: "test-strategist",
      task: `Design a testing strategy for this slice.

Read {chain_dir}/grill/${sliceSlug}-analysis.md for the confirmed layer
analysis and failure modes.

Slice doc path: ${slicePath}

Generate a comprehensive test plan covering test types, scope, dependency
strategy, key scenarios, edge cases, error handling, and failure mode
coverage. Persist it as a ## Test plan section in the slice doc.

If you have uncertainties, include ## Questions for the user in your output.`,
      output: `strategy/${sliceSlug}-result.md`,
      acceptance: { level: "none", reason: "planning-doc update only" }
    },
    {
      agent: "approval-agent",
      task: `Present the test strategy and get user approval.

Read the test plan from the slice doc at ${slicePath}.

If the test-strategist included ## Questions for the user, resolve each one
via contact_supervisor({ reason: "interview_request" }) one at a time. After
each answer, incorporate it into the test plan in the slice doc.

Once all questions are resolved, present the ENTIRE test strategy (not a
summary — the full test plan as written in the slice doc) to the user for
final verification via contact_supervisor({ reason: "need_decision" }).

If changes are requested, update the slice doc with edit and re-present.
Loop until approved or changes exhausted.`,
      output: `approval/${sliceSlug}-result.md`,
      acceptance: { level: "none", reason: "interactive approval step" }
    },
    {
      agent: "worker",
      task: `Finalise the approved test strategy for slice "${sliceSlug}".

1. Read {chain_dir}/approval/${sliceSlug}-result.md to confirm approval.
2. Verify the ## Test plan section exists in the slice doc at ${slicePath}.
3. Set frontmatter on the slice doc:
   - task_set ${slicePath} analysed true
   - task_set ${slicePath} status in-progress
   - task_set ${slicePath} started_at <ISO now>
4. Commit: docs(slice): add test plan for ${sliceSlug}

Note: do NOT call task_state_set. The pipeline parent handles state.`,
      output: `final/${sliceSlug}-result.md`,
      acceptance: { level: "none", reason: "docs finalization" }
    }
  ]
}
```

### implement-slice chain (no state writes)

```typescript
function implementSliceChain(taskSlug: string, sliceSlug: string, slicePath: string) {
  return [
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

4. Read the slice doc at ${slicePath} and the task doc at
   docs/tasks/${taskSlug}/task.md.
   Read docs/testing.md if it exists for project test conventions.

5. Report: branch slice/${sliceSlug} created, context loaded.`,
      output: `setup/${sliceSlug}-result.md`
    },
    {
      agent: "tdd-worker",
      task: `Implement slice "${sliceSlug}" for task "${taskSlug}" using strict TDD.

Slice doc: ${slicePath}
Task doc: docs/tasks/${taskSlug}/task.md

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
      output: `tdd/${sliceSlug}-result.md`
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
      output: `verify/${sliceSlug}-result.md`
    },
    {
      agent: "worker",
      task: `Land slice "${sliceSlug}" for task "${taskSlug}".

Slice doc: ${slicePath}
Task doc: docs/tasks/${taskSlug}/task.md

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

Note: do NOT call task_state_set. The pipeline parent handles state.`,
      output: `land/${sliceSlug}-result.md`,
      acceptance: { level: "none", reason: "pipeline parent handles state" }
    }
  ]
}
```

## Step 3 — Parent loop helper

The parent loop for start-slice chains is identical to the one in
`start-slice`. It relays `contact_supervisor` requests between the
chain's interactive agents (grill-agent, approval-agent) and the user.

Use `wait({ id: chainRunId })` to block for the specific chain. Do NOT
use `wait()` without an id — other async runs (previously queued
implementations) may finish first.

```typescript
async function runParentLoop(chainRunId: string) {
  while (true) {
    await wait({ id: chainRunId })

    const pending = await subagent_supervisor({ action: "pending" })
    for (const request of pending) {
      if (request.reason === "interview_request") {
        const { question, context, recommended, reasoning } =
          JSON.parse(request.interview)

        const answer = await ask_user_question({
          header: "Slice",
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
      } else if (request.reason === "need_decision") {
        const decision = await ask_user_question({
          header: "Verify",
          question: `Review the complete test strategy below:\n\n${request.message}\n\nApprove this test strategy?`,
          options: [
            { label: "Approved",
              description: "Accept the test strategy as written." },
            { label: "Request changes",
              description: "Describe what needs to change." }
          ]
        })

        if (decision === "Approved") {
          await subagent_supervisor({
            action: "reply",
            replyTo: request.id,
            message: "approved"
          })
        } else {
          await subagent_supervisor({
            action: "reply",
            replyTo: request.id,
            message: `changes: ${decision}`
          })
        }
      }
    }

    const status = await subagent({ action: "status", id: chainRunId })
    if (status.state === "complete") break
    if (status.state === "failed" || status.state === "paused") {
      throw new Error(`pipeline: start-slice chain ${chainRunId} failed`)
    }
  }
}
```

**CRITICAL — Parent is a relay, not a decision-maker.** You must NEVER answer
interview questions yourself. Every `interview_request` and every
`need_decision` MUST go through `ask_user_question()` before any reply is sent.

## Step 4 — Pipeline loop

Now run the pipeline. This is the core of the skill.

```typescript
// ── State tracking ────────────────────────────────────────────────
let lastImplId: string | null = null  // ID of the last launched implement chain

// ── Phase A: Queue implements for pre-analysed slices ─────────────
// These go first in the implement sequence, one at a time.
const slicePaths: string[] = []  // ordered list for final state update

for (const slice of preAnalyzed) {
  slicePaths.push(slice.slug)

  if (lastImplId) {
    // Wait for previous implement before starting this one
    await wait({ id: lastImplId })
  }

  task_state_set next_action "pipeline: implement pre-analysed ${slice.slug}"
  task_state_set active.slice ""

  const implRun = subagent({
    async: true,
    chain: implementSliceChain(taskSlug, slice.slug, slice.path)
  })
  lastImplId = implRun.id

  // Don't wait — let this implement run in background while we
  // process the next iteration (or skip to Phase B if no needsStart)
}

// ── Phase B: Pipeline loop (start + implement for each needs-start) ─
for (const slice of needsStart) {
  slicePaths.push(slice.slug)

  // 1. Launch start-slice (interactive chain)
  task_state_set active.task taskSlug
  task_state_set active.slice slice.slug
  task_state_set last_action "pipeline: launching start-slice ${slice.slug}"
  task_state_set next_action ""

  const sliceDoc = `<content of ${slice.path}>`
  const startRun = subagent({
    async: true,
    chain: startSliceChain(slice.path, slice.slug, sliceDoc)
  })

  // 2. Parent loop — relays interactive questions to the user
  //    While this runs, the previous implement (if any) executes
  //    in the background — THIS IS THE PIPELINE OVERLAP.
  try {
    await runParentLoop(startRun.id)
  } catch (e) {
    // Start-slice failed. Stop the pipeline.
    task_state_set last_action "pipeline: FAILED at start-slice ${slice.slug}"
    report: `pipeline: start-slice failed for "${slice.slug}".
Previous implementation (if any) is still running at ${lastImplId}.
Fix the issue and re-run /skill:pipeline-slices ${taskSlug}.
The pipeline will skip already-analysed slices.`
    return
  }

  // 3. Start-slice done. Update state.
  task_state_set last_action "pipeline: start-slice completed ${slice.slug}"
  task_state_set active.slice ""

  // 4. Wait for previous implement (sequential constraint)
  if (lastImplId) {
    await wait({ id: lastImplId })
  }

  // 5. Queue this slice's implementation
  task_state_set next_action "pipeline: implement ${slice.slug}"

  const implRun = subagent({
    async: true,
    chain: implementSliceChain(taskSlug, slice.slug, slice.path)
  })
  lastImplId = implRun.id
  // implement(slice) runs in background while next start is interactive
}

// ── Phase C: Wait for last implement ──────────────────────────────
if (lastImplId) {
  task_state_set next_action "pipeline: waiting for final implementation"
  await wait({ id: lastImplId })
}

// ── Phase D: Update state for next step ───────────────────────────
// All slices are now complete. The parent was the sole state writer,
// so state.yaml is consistent.
task_state_set last_action "pipeline: all slices implemented"
task_state_set active.task ""
task_state_set active.slice ""
const hasMoreSlices = task_slices(taskSlug).filter(s => s.status !== "done").length > 0
if (hasMoreSlices) {
  // Shouldn't happen in normal flow, but handle gracefully
  task_state_set next_action "start-slice <next-unanalysed-slug>"
} else {
  task_state_set next_action "finalize-task ${taskSlug}"
}
```

## Step 5 — Report

Report the pipeline result:

- Number of slices processed (skipped, pre-analysed, newly analysed)
- Any failures during start-slice or implement-slice
- Next action: `finalize-task` or resolve issues

```
Pipeline result for task "${taskSlug}":
- Skipped (already done): ${skipped.map(s => s.slug).join(", ") || "none"}
- Pre-analysed (implement only): ${preAnalyzed.map(s => s.slug).join(", ") || "none"}
- Newly analysed + implemented: ${needsStart.map(s => s.slug).join(", ") || "none"}

State: all slices implemented.
Next: /skill:finalize-task ${taskSlug}
```

If any implement-slice failed, report which slice and include the
`{chain_dir}` path for inspection.

## Error handling

### Start-slice fails

Stop the pipeline. The current start-slice chain needs investigation.
Previous implementations (if launched) continue running, but no new
starts or implements are launched. Report the failure and the last
`{chain_dir}` path.

**Partial recovery:** After fixing the issue, re-run
`/skill:pipeline-slices <task-slug>`. The pipeline skips already-analysed
slices and resumes from the first unanalysed one.

### Implement-slice fails

Because implementations are sequential async chains, a failure in the
middle doesn't automatically stop the pipeline (the parent is in a
different loop). Detect the failure by checking `status.state`:

```
// After Phase C wait({ id: lastImplId }):
const finalStatus = await subagent({ action: "status", id: lastImplId })
if (finalStatus.state === "failed" || finalStatus.currentStep < 3) {
  report: "Last implement-slice failed. Check {chain_dir}/verify/ for details."
}
```

For earlier failed implements during Phase B: the parent already waited
for each via `wait({ id: lastImplId })` but didn't check status. To catch
these, add a status check after each `wait({ id: lastImplId })`:

```typescript
function checkImplSuccess(implId: string, sliceSlug: string): boolean {
  const status = await subagent({ action: "status", id: implId })
  if (status.state === "complete") return true
  report: `pipeline: implement-slice "${sliceSlug}" did not complete (state=${status.state})`
  return false
}
```

After Phase C, list any failed slices and suggest re-running just those.

### User interruption

If the user needs to stop mid-pipeline (e.g. start-slice reveals a design
issue that invalidates remaining slices), use `wait()` returning attention
from the start chain. The parent loop relays the signal. The user can:

1. Stop the current start-slice chain.
2. Fix the design.
3. Re-run `/skill:pipeline-slices <task-slug>` with a fresh
   analysis of remaining slices.

Partially completed implements continue to run; the pipeline parent waits
for them and then reports.

## State recovery after partial run

If the pipeline is interrupted (e.g. Ctrl+C or session loss), state.yaml
may be inconsistent because:

- Some slices have `analysed: true` but no implement queued
- Some implements completed but state wasn't updated
- `next_action` points to an intermediate pipeline state

**Recovery:** Re-run `/skill:pipeline-slices <task-slug>`. The pipeline
reads actual slice status from frontmatter and skips already-done and
already-analysed slices. It overwrites `state.yaml` with consistent values
at the end.

## Constraints

- **Parent owns state.** Chain workers must NOT call `task_state_set`.
- **Spec-first.** Every test assertion derives from acceptance criteria.
- **No speculative code.** Implement only what the slice requires.
- **No per-slice PR.** Slices merge into the task branch; finalize merges to main.
- **Do not interrupt the start chain.** The grill-agent can be slow while
  exploring the codebase. Only interrupt if zero activity for 15+ minutes.
  Interrupting mid-chain destroys it; sequential steps are lost on resume.
- **The parent loop is a relay, not a decision-maker.** Never auto-answer
  interview questions.

**Handoff:** "All slices processed for task `<task-slug>`. Ready for
`/skill:finalize-task <task-slug>`."
