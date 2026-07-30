---
kind: idea
title: Bug workflow (report, track, fix)
slug: bug-workflow
status: in-grilling
created_at: 2026-07-30T14:05:09Z
grilled_at:
converted_to:
---

# Bug workflow (report, track, fix)

The workflow can plan and execute ideas/features/tasks, but has no way to
report, maintain a list of, or fix bugs — except creating a standalone
task, whose interview asks questions irrelevant to bugs (user stories,
boundaries, slice breakdown, per-slice testing strategy). Vague bug reports
get bounced to refine-idea, and implement-task demands arch-spec + slice
chains even for a one-line fix.

Gap is threefold: **report** (lightweight capture without an interview),
**track** (a persistent list with status), **fix** (a lightweight path that
skips arch-spec/chain ceremony for small fixes).

## Proposed design

### New artifact: `docs/bugs/<slug>.md`

Plain markdown + frontmatter, same pattern as ideas — no `task_*` tool
support needed initially (ideas work via grep too).

```yaml
---
title: Crash on empty config file
status: reported        # reported → confirmed → fixing → fixed | wontfix | promoted
severity: major         # critical | major | minor | trivial
reported: 2026-07-30
confirmed_by:           # commit or agent run that reproduced it
fix_commit:             # filled on fixed (direct commit or task merge)
promoted_to:            # task slug, when fix outgrew the lightweight path
---
```

Body sections: Observed / Expected / Reproduction / Suspected area
(agent-filled from codebase exploration, not user interview) / Root cause /
Fix summary.

Key difference from tasks: a bug doc captures a **defect observation**, not
a **change plan**. No user stories, no boundaries, no slices.

**The test rule (applies to every fix path):** a bug fix MUST land
with at least one test that is red when the bug is present (verify by
running it against the unfixed code) and green after the fix. Sole
exception: defects no test can sensibly capture ("the color was off")
— the bug doc must then explicitly record why no test exists. The
exception is documented, never silent.

### New skill: `report-bug` (capture → reproduce → spot-fix/promote)

Single entry point for bugs. Produces *evidence* (bug doc + repro.md);
implement-task's bug.md consumes it. Never interrogate the reporter.

1. **Capture**: parse the free-form input and propose ALL fields
   en-bloc (observed / expected / reproduction / severity); the user
   corrects in one pass. No one-question-at-a-time, no codebase
   exploration at this stage.
2. **Duplicate check** (`grep docs/bugs/`): suspected dupe → ask once;
   confirmed → append note + context to existing doc, commit, done.
3. Write `docs/bugs/<slug>.md`, `status: reported`, commit.
4. **Reproduce**, governed by **`docs/dev-env.md`** in the consuming
   repo: how to start the dev environment, how reproduction should
   work — and it may validly instruct *not* to attempt AI-based
   reproduction (then: record the skip, continue to triage).
   Reproduction writes **no test cases**; it produces a **`repro.md`**
   artifact (next to the bug doc) describing the steps, plus any
   ad-hoc scripts it wrote (e.g. playwright) that repro.md instructs
   how to run. Can't reproduce → one targeted question; still stuck →
   `wontfix` + rationale.
5. **Triage** (agent judgment):
   - **Truly trivial** (typo, one-liner, obvious cause) → fix on the
     spot, TDD-ordered: write the regression test from repro.md, run
     it against the unfixed code (must be **red**), apply the fix
     (**green**), full suite. Commit directly to main, changelog line,
     close the bug doc (`status: fixed`, root cause + fix summary +
     test reference), archive. No branch.
   - **Anything more** → **promote directly to a task**, bypassing
     create-task's interview: the LLM infers the full task doc from the
     bug doc (title, user stories, boundaries, layers touched, ONE
     slice with acceptance criteria, testing strategy), proposes it to
     the user, and on agreement writes `docs/tasks/<slug>/` with
     `type: bug` — repro.md (and its scripts) move next to `task.md`.
     Bug doc: `status: promoted`, `promoted_to: <slug>`.
     Hand off: `/skill:implement-task <slug>`.

   There is no mid-flight escalation path: spot fixes are capped at
   trivial, so a fix that surprises simply stops and promotes.

   **Below the workflow's floor:** if a bug is too small to warrant
   even a report (spotted and fixable in passing), deal with it ad-hoc
   — no doc, no artifacts.

**Reproduction schemas** (follow-up): the package can ship pre-made
repro templates under `skills/report-bug/resources/repro-schemas/`
(e.g. `web-ui-playwright.md`, `cli.md`, `api.md`) that report-bug picks
by bug kind as a starting point.

### report-bug flowchart

```
              /skill:report-bug "<free-form report>"
                              │
                              ▼
              ┌───────────────────────────────┐
              │ PARSE input → propose ALL     │ fields inferred from prompt:
              │ fields EN-BLOC; user corrects │ observed/expected/repro/severity
              └───────────────┬───────────────┘ (no codebase exploration)
                              ▼
                  grep docs/bugs/ — duplicate?
                              │
              ┌───────────────┴───────────────┐
              ▼ suspected                     ▼ none
        ask once: dupe?               write docs/bugs/<slug>.md
              │                       status: reported → commit
     ┌────────┴────────┐                      │
     ▼ yes             ▼ no                   │
 append note+context   │                      │
 → commit → END        └──────────┬───────────┘
                                  ▼
                    read docs/dev-env.md
                    (how to start env, how to repro,
                     MAY FORBID AI reproduction)
                                  │
            ┌─────────────────────┴──────────────────────┐
            ▼ repro forbidden                            ▼ attempt reproduction
       skip reproduction                           follow dev-env.md; may write
       (record skip in bug doc)                    ad-hoc scripts (playwright etc.)
            │                                      artifact: repro.md (+ scripts)
            │                                                │
            │                                  ┌─────────────┴─────────────┐
            │                                  ▼ reproduced                ▼ can't repro
            │                            status: confirmed           one targeted question
            │                                                            │
            │                                                ┌───────────┴─────────┐
            │                                                ▼ resolved            ▼ dead end
            │                                                retry           status: wontfix
            │                                                                + rationale → END
            └──────────────────────┬─────────────────────────┘
                                   ▼
                    TRIVIAL? (typo, one-liner, obvious cause)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼ yes                                     ▼ no
       TDD-ORDERED FIX: write                     ┌────────────────────┐
       regression test from repro.md,            │ PROMOTE            │
       run vs UNFIXED code → RED,                │ infer task doc     │
       apply fix → GREEN, full suite             │ (type: bug) +      │
       summary → status: fixed →                 │ CONFORMING SLICES: │
       commit DIRECT to main,                    │ slices/ dir, each  │
       CHANGELOG line → archive →                │ w/ acceptance,     │
       commit → END                              │ Test plan, size,   │
                                                 │ blocked_by         │
                                                 │ (default: 1 slice) │
                                                 │ propose → user ok  │
                                                 │                    │
                                                 │ docs/tasks/<slug>/ │
                                                 │ task.md + repro.md │
                                                 │ (moved next to     │
                                                 │ task.md)           │
                                                 │ bug: promoted,     │
                                                 │ promoted_to        │
                                                 │ commit → END       │
                                                 │ handoff:           │
                                                 │ /skill:implement-  │
                                                 │ task <slug>        │
                                                 │ → resources/bug.md │
                                                 └────────────────────┘
```

### Task `type:` frontmatter + implement-task wrapper

- Task docs gain `type: feature | bug` (absent key = `feature`).
- `implement-task` becomes a thin wrapper: read `type`, then follow
  `skills/implement-task/resources/feature.md` (current behavior,
  moved) or `resources/bug.md` (bug-tuned execution, to be designed).
- Bug tasks are never created via create-task's interview; promotion
  from report-bug is the only path.

### Integration points

- task-overview routing: report → `/skill:report-bug`; triage queue =
  `grep -l "status: reported" docs/bugs/*.md`.
- `onboard-workflow` creates a `docs/dev-env.md` template (like
  `docs/testing.md`): how to start the dev env, how reproduction
  should work, or an explicit "do not attempt AI reproduction".
- implement-task workers can write a `docs/bugs/` doc for out-of-scope
  product defects found mid-task (bridge to existing deviation channels).
- Severity → priority stays human-owned; no auto-scheduling.

### Non-goals (v1)

- No severity automation, SLAs, assignment.
- No `task_*` tool / state.yaml extension — bugs live outside the planning
  tree until promoted. Add a `bug` kind later only if grep gets painful.

## Open questions

- [x] Two skills or one? → **Superseded by user redesign**:
  report-bug absorbs capture + spot-fix + promote (one entry point,
  resumable); bug-specific execution lives in
  `implement-task/resources/bug.md`, selected via task `type:`
  frontmatter. Open: does fix-bug still exist as a resume point?
  (Recommendation: no — make report-bug resumable on existing slug.)
- [x] fix-bug's fate → **Dissolved**: report-bug owns capture →
  reproduce → triage → promote end-to-end. Resume point for abandoned
  sessions = `status: reported` without `promoted_to`.
- [x] Promotion threshold → **Strict, sharpened by user**: the gate
  collapses to trivial-vs-not. Truly trivial bugs bypass the workflow
  entirely ("if it is TRULY small, bypassing the workflow is best");
  everything else promotes. No mid-flight escalation mechanism — direct
  fixes are capped at trivial, so surprises stop and promote.
- [x] Duplicate handling → **Ask once, fold in**: report-bug greps
  `docs/bugs/` before writing. Suspected duplicate → one question
  (duplicate or distinct?). Duplicate → append note + reporter context to
  the existing doc, no new file. Distinct → new doc.
- [x] Deviation-reporter for bug fixes? → **Resolved by design**:
  non-trivial fixes go through the full task flow (which has deviation
  reports); trivial fixes are one-liners where it adds nothing.
- [x] Trivial fixes → **Doc always required once in the workflow, then
  direct commit to main** (no branch). Below the workflow's floor
  (too small to report), bugs are fixed ad-hoc with no artifacts.
