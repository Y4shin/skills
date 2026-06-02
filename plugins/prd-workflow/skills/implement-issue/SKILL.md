---
name: implement-issue
description: Phase 2 — implement a slice issue via strict TDD against the test plan from /prd-workflow:analyse-issue. Creates the branch, runs red→green→refactor, opens a PR (Closes #n), sets issue state, then garbage-collects the slice doc and notes the decision on the PRD. Use after /prd-workflow:analyse-issue, or when the user says "now implement #n". Don't use it before a test plan exists (run analyse-issue first) or to finalize a completed PRD (use finalize-prd). Provider-aware (gh/fgj/local — non-git projects skip the branch/PR and use the built-in tracker).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Implement Issue

Phase 2: execute the agreed test plan with full repo automation. Requires the slice doc
`docs/prd/<slug>/slices/<n>-<slug>.md` (spec + `## Test plan`) written by `/prd-workflow:analyse-issue`.

Detected forge: **!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge git_type`**.
Per-provider commands come from `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge <key>`, injected at the step that
uses them. The artifact-lifecycle reference is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

The project profile (code conventions, CI command, orientation docs) is injected below when
available — its "Code conventions" and "CI" sections drive Steps 3 and 5. If empty, explore
the codebase for the lint/format config and CI command yourself:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`

## Step 1 — Set state

Swap the issue's label `status:todo` → `status:in-progress` and add a starting comment
("Starting implementation. Branch: `feature/<n>-<slug>`."). Label-edit + comment form:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_edit_labels`
!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_comment`

## Step 2 — Sync + branch

**Git project** (forge `git_type` is `gh`/`fgj`) — sync `main` and cut a branch:

```bash
git fetch origin
git checkout main && git pull --ff-only origin main
git checkout -b feature/<n>-<slug>
```

Slug = issue title, 3–5 words, lowercase, hyphens.

**Non-git project** (forge `git_type` is `local`) — there is no branch; you implement
directly on the working tree. Skip the git commands above and continue to Step 3.

## Step 3 — Load context

Read the committed slice doc `docs/prd/<slug>/slices/<n>-<slug>.md` (spec + test plan) **and**
its parent `docs/prd/<slug>/prd.md` — this is the in-repo context the canonical dir exists
to provide. Re-read repo conventions if not in context.

**Repo non-negotiables:** Follow the project profile's "Code conventions" section to the
letter, and read any config files it references (lint/format config, manifest contracts) for
the full rules. If no profile exists, infer the conventions from the existing code, the
lint/format config, and any contributor guide before writing anything.

## Step 4 — TDD: red → green → refactor

The slice doc's `## Test plan` is the source of truth for test type, file path, run
command, and assertions. Never skip or merge phases.

```
TDD Progress:
- [ ] RED:      test written, confirmed failing
- [ ] GREEN:    minimum implementation, test passing
- [ ] REFACTOR: cleaned up, suite still green
```

- **RED** — write the test first; derive every assertion from the spec/acceptance criteria,
  never from the implementation. Run it; it **must fail**. (A test passing before code
  exists is wrong — rewrite it.) Use the test file path and run command recorded in the slice
  doc's `## Test plan` (which `/prd-workflow:analyse-issue` derived from the project profile's
  test infrastructure).
- **GREEN** — write only what makes the failing test pass; apply Step 3 conventions; re-run
  after each logical change.
- **REFACTOR** — remove dead code, rename for clarity; no speculative abstractions; re-run.

## Step 5 — Acceptance checklist

```
- [ ] Test written before implementation, confirmed failing first (RED)
- [ ] Every acceptance criterion has an assertion
- [ ] Identifier types match the spec (UUID vs numeric — never swap)
- [ ] Error variants / status codes have separate cases
- [ ] The project profile's CI command passes with zero skips (if no profile, the project's
      full lint+test gate passes)
- [ ] Any profile "Code conventions" follow-ups done (e.g. regenerated artifacts/checks the
      conventions call for)
- [ ] Code conventions honoured: comments English + only where non-obvious
```

## Step 6 — Land + state

**Git project** — push the branch and open a PR with `--base main`, title `<issue title>`,
body listing the met acceptance criteria and `Closes #<n>`:

```bash
git push -u origin feature/<n>-<slug>
```

PR form for the detected provider:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_create_pr`

**Non-git project (`local`)** — there is no push or PR; the work is already on the working
tree. The snippet above prints the local guidance (skip straight to recording state below).

Then set the issue label `status:in-progress` → `status:needs-review`. (On a git host there's
no task list to tick — the slice is wired as a native dependency of its PRD; merging the PR
`Closes #<n>` auto-resolves it. On the local tracker, closing the slice on finalize resolves
its `blocked_by` edge.) Label-edit form:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_edit_labels`

Report the PR URL (or, for a local project, that the slice is implemented and marked
`status:needs-review`).

## Step 7 — Artifact GC + PRD note

1. Append a 2–4 line decision/deviation note to the PRD's `## Implementation notes` in
   `docs/prd/<slug>/prd.md` (what shipped, any divergence from the spec, follow-ups) — this
   is what `/prd-workflow:finalize-prd` harvests.
2. **Delete the slice doc** `docs/prd/<slug>/slices/<n>-<slug>.md` (on a git project, commit
   it with the PRD note). A surviving slice doc now reliably signals unfinished work.
3. Report whether this was the PRD's last slice — if the gate now passes, point the user at
   `/prd-workflow:finalize-prd <slug>`:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" prd-finalizable <slug>
   ```

## Error handling

- If the slice doc `docs/prd/<slug>/slices/<n>-<slug>.md` or its `## Test plan` is missing, stop —
  run `/prd-workflow:analyse-issue <n>` first; do not improvise a test strategy here.
- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` prints `UNKNOWN_FORGE`, the repo has a
  remote this workflow doesn't recognise (not GitHub/Forgejo) — surface it and stop; don't invent CLI
  calls. A repo with no remote (or no git at all) instead resolves to the built-in `local` tracker —
  that's expected, not an error; its snippets drive `prd_tool tracker` against `docs/prd/tracker.json`.
- If the project's CI command (per the profile) fails, fix forward (or report the blocker) —
  never open the PR with a red suite or skipped checks.

## Constraints

- **Spec-first** — never write a test to match a wrong implementation.
- **No speculative code** — implement only what the slice requires.
- Issue/PR text in **English**.
