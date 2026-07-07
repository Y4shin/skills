---
description: Implement a slice issue via strict TDD against the test plan from /start-issue. Cuts a slice branch off the PRD's integration branch, runs red→green→refactor, merges the slice back into the PRD branch (no per-slice PR), closes the slice issue, then garbage-collects the slice doc. Use after /start-issue. Provider-aware (gh, fgj, local).
---


# Implement Issue

Phase 2: execute the agreed test plan with full repo automation. Requires the slice doc `docs/prd/<slug>/slices/<n>-<slug>.md` (spec + `## Test plan`).

**Branching model.** Every slice of a PRD shares one **integration branch**, `prd/<prd-slug>`, branched from `main`. Each slice is built on its own short-lived branch off that integration branch and **merged back into it — no per-slice PR**. The full CI gate runs once at `/finalize-prd`, not per slice.

**Use `prd_forge` to get provider-correct commands for labels, comments, and closing issues.**

**Use `prd_profile` for code conventions and CI commands.**

**Use `prd_list` to see the planning tree.**

## Step 1 — Set state

Swap the issue's label `status:todo` → `status:in-progress` and add a starting comment. Use `prd_forge cmd_edit_labels` and `prd_forge cmd_comment`.

## Step 2 — Sync + branch

**Remote forge** (gh/fgj):

```bash
git fetch origin
git checkout main && git pull --ff-only origin main
git checkout prd/<prd-slug> 2>/dev/null || git checkout -b prd/<prd-slug>
git checkout -b slice/<n>-<slug>
```

**Local forge** (no remote):

```bash
git checkout main
git checkout prd/<prd-slug> 2>/dev/null || git checkout -b prd/<prd-slug>
git checkout -b slice/<n>-<slug>
```

## Step 3 — Load context

Read the slice doc `docs/prd/<slug>/slices/<n>-<slug>.md` (spec + test plan) **and** its parent `prd.md`. Follow the project's code conventions.

## Step 4 — TDD: red → green → refactor

```
TDD Progress:
- [ ] RED:   test written, confirmed failing
- [ ] GREEN: minimum implementation, test passing
- [ ] REFACTOR: cleaned up, suite still green
```

- **RED** — write the test first; derive every assertion from the spec/acceptance criteria. Run it; it **must fail**.
- **GREEN** — write only what makes the failing test pass.
- **REFACTOR** — remove dead code, rename for clarity.

## Step 5 — Acceptance checklist

```
- [ ] Test written before implementation, confirmed failing first (RED)
- [ ] Every acceptance criterion has an assertion
- [ ] The slice's own test (per the ## Test plan) is green
- [ ] Code conventions honoured
```

## Step 6 — Merge into PRD branch

```bash
git checkout prd/<prd-slug>
git merge --no-ff slice/<n>-<slug> -m "slice #<n>: <title>"
git branch -d slice/<n>-<slug>
```

Then mark the slice issue done (labels `status:in-progress` → `status:done`) and close it:
- Use `prd_forge cmd_edit_labels`
- Use `prd_forge cmd_close_issue`

## Step 7 — Artifact GC + PRD note

1. Append a 2–4 line decision note to the PRD's `## Implementation notes` in `prd.md`.
2. **Delete the slice doc** `docs/prd/<slug>/slices/<n>-<slug>.md`. Commit onto the PRD branch.
3. Check if this was the PRD's last slice: `prd_finalizable <slug>` — if ready, point at `/finalize-prd`.

## Error handling

- If the slice doc is missing or has `analysed: false`, run `/start-issue` first.
- Never merge a red slice into the PRD branch.
- Resolve merge conflicts to keep both the new and already-merged slices working.

## Constraints

- **Spec-first** — never write a test to match a wrong implementation.
- **No speculative code** — implement only what the slice requires.
- **No per-slice PR** — slices merge into the PRD branch; only finalize opens a PR.