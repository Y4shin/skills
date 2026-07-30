# Implement Task (feature path)

Implements every non-done slice of a feature task. Steps are: architecture spec (user-approved) → per-slice chain per dependency level → coherence refactor.

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

Each slice runs as a **sequential chain** that shares the repo working directory: `tdd-worker → (slice-verifier ∥ deviation-reporter ∥ ui-noter) → land-worker`. Steps share one cwd, so verify, deviation, and ui-noter see tdd-worker's actual code. `failFast: true` gates landing on verify+deviation. The ui-noter is advisory — it never gates landing.

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
                        },
                        {
                            agent: "ui-noter",
                            as: "ui-note",
                            output: `ui-note-${slice}/result.md`,
                            task: `Detect UI work in slice "${slice}" for task "${taskSlug}".

Implementation: {outputs.tdd}.

Review the diff created by the TDD implementation. Check whether it introduces or modifies any UI surfaces:
- HTML files (*.html, *.htm)
- CSS / style files (*.css, *.scss, *.less, *.sass, *.pcss)
- Component files (*.jsx, *.tsx, *.svelte, *.vue, *.astro)
- Templates (*.hbs, *.mustache, *.ejs, *.php)
- Any file under directories named 'views/', 'templates/', 'components/', 'pages/', or 'ui/'

If NO UI work was found, write "no_ui_work" as the result and exit.

If UI work WAS found, write a handoff note to
docs/tasks/${taskSlug}/impeccable-note-${slice}.md with:

```
### Impeccable Handoff: ${slice}

The implementation created bare-minimum functional UI for this slice.
The following surfaces are ready for design refinement:

#### Surfaces
- \`<path/to/file>\`: <brief description of the surface/component>

#### Suggested commands
- \`/impeccable <command> <path>\` — <why this command fits>

#### Notes
- <what is currently bare-bones, what design decisions are missing>
- <any constraints the designer should know>
```

For the command, choose from: critique, polish, bolder, quieter, distill,
harden, layout, typeset, colorize, animate, delight, adapt, clarify, onboard, shape.
Pick the most appropriate one for the surface. Prefer specific evaluative or refinement
commands over vague ones.

If multiple surfaces exist, suggest a separate command for each, or a single command
targeting the broadest surface noting sub-surfaces are contained within.

This note is advisory. The user runs it after landing. Do NOT gate anything on it.
Do NOT edit any files yourself — only write the note if UI work is found.`
                        }
                    ],
                    concurrency: 3
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

**Cost note:** these refactors are done directly by you (the parent), which
means your full context is loaded. Keep them genuinely small — if a refactor
would require reading more than ~5 files or editing more than ~50 lines,
consider routing it through a subagent instead.

**Final suite gate:** Run the full project test suite. It must be green before Step 3 is complete. If red, this is emergent cross-slice breakage — breakage that only appears when all slices combine and no single slice owns the fix. Apply small/medium root-cause fixes within the task's scope autonomously (same rules as above); escalate large, ambiguous, or API-surface-touching fixes to the user. For test failures: first try re-routing the fix through a subagent before doing it yourself.

**Submit feedback:** `submit_workflow_feedback { message: "Coherence refactor complete for {taskSlug}", tags: ["refactoring"] }`

## Step 4 — Report

Report completed slices, any deviations found and resolved, user interventions.

If any `impeccable-note-*.md` files were created, mention them at the end:
> "UI surfaces were detected in this task. Run `/impeccable <command> <target>` to refine them.
> See `docs/tasks/<taskSlug>/impeccable-note-<slice>.md` for suggestions."

"If all slices done: run `/skill:finalize-task <slug>`"

## Failure toolbelt (parent never implements)

Hard rule: on subagent failure the parent never implements. Its only moves are re-dispatch strategies, applied in this order:

1. **Diagnose first** — read worker outputs and any partial diff. Never blindly redo.
2. **First failure → split** — always split slice N into ad-hoc sub-slices Na, Nb, Nc (`slices/<N>a-<slug>.md`, conforming, chained via `blocked_by`; update the task doc `slices:` list; mark slice N `status: split`). Exception: if the slice is already atomic, skip to retry.
3. **Second attempt → retry +50%** — re-run the chain with maxTurns increased by 50% and the diagnosis/fix instructions in the prompt.
4. **Backstop → escalate** — after two consecutive retries still fail, ask the user: "Two retries for slice {slice} failed. Should I increase budgets further, relax constraints, or skip this slice?"

Hard rule: the parent context is large and expensive; routing through workers is always cheaper than pulling the fix into the parent. The parent never writes code or edits files as a fix.
