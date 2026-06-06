---
name: implement-issue
description: Phase 2 — implement a slice issue via strict TDD against the test plan from /prd-workflow:analyse-issue. Cuts a slice branch off the PRD's integration branch, runs red→green→refactor, merges the slice back into the PRD branch (no per-slice PR — only the PRD gets one, at finalize), closes the slice issue, then garbage-collects the slice doc and notes the decision on the PRD. The full CI gate is deferred to finalize-prd; each slice only runs its own test. Use after /prd-workflow:analyse-issue, or when the user says "now implement #n". Don't use it before a test plan exists (run analyse-issue first) or to finalize a completed PRD (use finalize-prd). Provider-aware (gh/fgj/local — local projects use the same branch workflow but skip remotes/PRs and use the built-in tracker).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Implement Issue

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" workflow-gate`

Phase 2: execute the agreed test plan with full repo automation. Requires the slice doc
`docs/prd/<slug>/slices/<n>-<slug>.md` (spec + `## Test plan`) written by `/prd-workflow:analyse-issue`.

**Branching model.** Every slice of a PRD shares one **integration branch**,
`prd/<prd-slug>`, branched from `main`. Each slice is built on its own short-lived branch off
that integration branch and **merged back into it — no per-slice PR**. The PRD branch is the
only thing that ever becomes a PR into `main` (on hosted forges) or gets merged into `main`
locally (on a `local` forge), and that single integration point (opened by
`/prd-workflow:finalize-prd`) is where the **full CI gate** runs. So a slice never waits on the
whole-suite gate: it only writes and passes **its own** test, then merges into the PRD branch.
(On a `local` forge, the branch workflow is identical — only remote operations like fetch, push,
and PRs are skipped.)

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
("Starting implementation. Branch: `slice/<n>-<slug>` off `prd/<prd-slug>`."). Label-edit +
comment form:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_edit_labels`
!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_comment`

## Step 2 — Sync + branch

Ensure the PRD integration branch exists, then cut the slice branch off it.

**Remote forge** (`gh`/`fgj`) — sync with origin first:

```bash
git fetch origin
git checkout main && git pull --ff-only origin main
# PRD integration branch — create off main the first time, else just switch to it:
git checkout prd/<prd-slug> 2>/dev/null || git checkout -b prd/<prd-slug>
git checkout -b slice/<n>-<slug>          # the slice branch, off prd/<prd-slug>
```

**Local forge** (`local`) — no remote to sync; branch directly:

```bash
git checkout main
git checkout prd/<prd-slug> 2>/dev/null || git checkout -b prd/<prd-slug>
git checkout -b slice/<n>-<slug>
```

`<prd-slug>` = the PRD's slug (the `docs/prd/<prd-slug>/` dir name). The slice branch slug =
the issue title, 3–5 words, lowercase, hyphens (matching the `<n>-<slug>.md` slice doc). The
PRD branch accumulates every slice and is the **only** branch that becomes a PR (hosted forges)
or merges into `main` locally (local forge) at finalize.

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

This is the **per-slice** bar — the slice's own test, not the whole-suite gate. The full CI
gate (lint -D warnings, format, whole suite, type-check, generated-artifact checks) runs
**once at `/prd-workflow:finalize-prd`**, on the PRD PR — do **not** run it here.

```
- [ ] Test written before implementation, confirmed failing first (RED)
- [ ] Every acceptance criterion has an assertion
- [ ] Identifier types match the spec (UUID vs numeric — never swap)
- [ ] Error variants / status codes have separate cases
- [ ] The slice's own test (per the `## Test plan`) is green
- [ ] Code conventions honoured: comments English + only where non-obvious
```

Keep the PRD branch green for the next slice: if your change plausibly touches an
already-merged slice's behaviour, re-run that slice's test too before merging. Anything the
slice's own test can't catch is caught by the deferred gate at finalize.

## Step 6 — Merge the slice into the PRD branch + state

Merge the finished slice branch back into the PRD integration branch (**no per-slice PR**; the
work reaches `main` later via the single PRD PR on hosted forges, or a local merge on a local
forge, both opened by `/prd-workflow:finalize-prd`):

```bash
git checkout prd/<prd-slug>
git merge --no-ff slice/<n>-<slug> -m "slice #<n>: <title>"
git branch -d slice/<n>-<slug>
```

The slice's own test went green in Step 5, so the PRD branch stays green for the next slice.
Resolve any merge conflict in favour of keeping both slices working, then re-run the affected
tests.

Then mark the slice issue done and **close it** — it's integrated into the PRD branch, so its
`blocked_by` edge on the PRD resolves (the PRD issue itself stays open until its PR lands).
Label-edit (`status:in-progress` → `status:done`) + close forms:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_edit_labels`
!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_close_issue`

Report that the slice is integrated into `prd/<prd-slug>` and its issue closed.

## Step 7 — Artifact GC + PRD note

1. Append a 2–4 line decision/deviation note to the PRD's `## Implementation notes` in
   `docs/prd/<slug>/prd.md` (what shipped, any divergence from the spec, follow-ups) — this
   is what `/prd-workflow:finalize-prd` harvests.
2. **Delete the slice doc** `docs/prd/<slug>/slices/<n>-<slug>.md`. Commit this (with the PRD
   note) **onto the PRD branch** `prd/<prd-slug>` — it rides to `main` in the PRD PR (hosted
   forges) or local merge (local forge). A surviving slice doc now reliably signals unfinished
   work.
3. Report whether this was the PRD's last slice — if the gate now passes, point the user at
   `/prd-workflow:finalize-prd <slug>` (which integrates the PRD branch and runs the full CI gate):
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" prd-finalizable <slug>
   ```

## Error handling

- If the slice doc `docs/prd/<slug>/slices/<n>-<slug>.md` is missing, or its frontmatter has
  `analysed: false` (or no `## Test plan` section), stop — run `/prd-workflow:analyse-issue <n>`
  first; do not improvise a test strategy here.
- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` prints `NOT_A_GIT_REPO`, the
  directory isn't a git repo — tell the user to run `git init` first and stop.
- If it prints `UNKNOWN_FORGE`, the repo has a remote this workflow doesn't recognise (not
  GitHub/Forgejo) — surface it and stop; don't invent CLI calls. A repo with no remote resolves
  to the built-in `local` tracker — that's expected, not an error; it uses the same branch
  workflow (no remotes/PRs) and drives `prd_tool tracker` for issues.
- If the slice's own test won't go green, fix forward (or report the blocker) — never merge a
  red slice into the PRD branch. (The whole-suite CI gate is finalize-prd's job, not this one.)
- If merging the slice into `prd/<prd-slug>` conflicts, resolve it so both the new and the
  already-merged slices keep working, and re-run their tests before continuing.

## Constraints

- **Spec-first** — never write a test to match a wrong implementation.
- **No speculative code** — implement only what the slice requires.
- **No per-slice PR** — slices merge into the PRD branch; only `/prd-workflow:finalize-prd`
  opens a PR (into `main`) and runs the full CI gate. Don't push slice branches to the host.
- Issue/PR text in **English**.
