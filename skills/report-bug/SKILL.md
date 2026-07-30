---
name: report-bug
description: Capture, reproduce, and triage a bug. Writes a bug doc under docs/bugs/; spot-fixes trivial defects directly, or promotes the rest to a type:bug task.
---

# Report Bug

**Entry point:** `/skill:report-bug "<free-form report>"`

Lightweight bug intake. Never run the feature-task interview. Produce evidence,
then either fix a trivial bug on the spot or promote it to a task.

## Guardrails

- **No one-question-at-a-time capture.** Propose all inferred fields en-bloc;
  the user corrects in one pass.
- **No codebase exploration during capture.** Reproduction comes later, governed
  by `docs/dev-env.md`.
- **The test rule applies to every fix.** A bug fix MUST land at least one test
  that is red when the bug is present and green after the fix. The sole
  exception is an untestable defect (e.g. visual-only); document the reason
  in the bug doc.
- **Do not require `skills/report-bug/resources/repro-schemas/`.** Use them if
  present; otherwise proceed without them.
- **If `docs/dev-env.md` is missing**, ask the user how to start the dev
  environment and how reproduction should work.

## 1. Capture

Parse the free-form input and propose these fields **en-bloc**:

- `observed` — what happened
- `expected` — what should have happened
- `reproduction` — steps to trigger it
- `severity` — `critical | major | minor | trivial`

Let the user edit the whole set in one response. Do not explore the codebase.

## 2. Duplicate check

Run `grep docs/bugs/` on the observed/expected/reproduction text. If a
suspected duplicate exists, ask **once**: "Is this the same as
`<existing-slug>`?" If yes, append a note plus the reporter's context to the
existing doc and commit; then stop. If no, continue.

## 3. Write bug doc

Derive `<slug>` from the title (kebab-case; check `docs/bugs/` for collisions).
Write `docs/bugs/<slug>.md` with frontmatter:

```yaml
---
title: <short description>
status: reported        # reported → confirmed → fixed | wontfix | promoted
severity: <critical|major|minor|trivial>
reported: <ISO date>
confirmed_by:
fix_commit:
promoted_to:
---
```

Body sections: Observed / Expected / Reproduction / Suspected area /
Root cause / Fix summary.

Commit the new bug doc before proceeding.

## 4. Reproduce

Read the consuming repo's `docs/dev-env.md`.

- **If it forbids AI reproduction**, record the skip in the bug doc and
  continue to triage.
- **Otherwise**, follow `docs/dev-env.md` to start the dev environment and
  reproduce the bug. Write `repro.md` next to the bug doc describing the exact
  steps, plus any ad-hoc scripts (e.g. Playwright) with instructions for how
  to run them.
- **If reproduction fails**, ask **one** targeted question. If still stuck,
  set `status: wontfix`, add the rationale, commit, and stop.
- **If reproduced**, set `status: confirmed` and commit the repro artifacts.

Do not write regression tests at this step.

## 5. Triage

Judge whether the bug is trivial (typo, one-liner, obvious cause).

### Trivial

Fix it directly on the current branch / main. No feature branch.

1. Write the regression test from `repro.md`.
2. Run it against the unfixed code — it must be **red**.
3. Apply the fix — the test is **green**.
4. Run the full suite.
5. Commit directly to `main`, add a CHANGELOG line, and update the bug doc:
   `status: fixed`, fill `fix_commit`, add Root cause and Fix summary
   sections, and reference the regression test.
6. `git mv docs/bugs/<slug>.md docs/bugs/archive/<slug>.md` and commit.
7. Stop.

### Non-trivial

Promote to a task without running the create-task interview.

1. Infer a task doc from the bug doc:
   - Frontmatter: `type: bug`, `bug: <bug-slug>`, title, status, dates.
   - Body: user stories, boundaries, layers touched, ONE default slice
     with title, acceptance criteria, `## Test plan`, `size`, `blocked_by`.
2. Propose the task doc and slice to the user. On agreement:
   - Write `docs/tasks/<slug>/task.md` and `docs/tasks/<slug>/slices/1-<slug>.md`.
   - Move `repro.md` (and any scripts) next to `task.md`.
   - Update the bug doc: `status: promoted`, `promoted_to: <slug>`.
   - Commit.
3. Hand off: `/skill:implement-task <slug>`.

There is no mid-flight escalation path. If a fix surprises you, stop and
promote.
