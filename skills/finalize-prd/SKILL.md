---
name: finalize-prd
description: Close the loop once all of a PRD's slices are merged into its integration branch — harvest knowledge, fold durable knowledge into permanent docs, delete the spent PRD dir, then open the single PRD PR (or merge locally). If the PRD belongs to an epic and it's the last child, also finalize the epic. This is the one integration point and the one gate for the whole PRD. Use when a PRD's slices are all done. Provider-aware (gh, fgj, local).
---

# Finalize PRD (or Epic)

Phase 3 — **the single integration point.** Every slice has merged into the PRD branch `prd/<prd-slug>`.

**Use `prd_forge` for provider-correct commands (PR, close issue, milestone operations).**

**Use `prd_profile` for knowledge destinations and CI commands.**

**Use `prd_list` to see the planning tree.**

**Use `prd_reference` for the lifecycle reference.**

## Step 1 — Preconditions

Check out the PRD integration branch:

**Remote forge** (gh/fgj): `git fetch origin && git checkout prd/<prd-slug> && git merge origin/main`
**Local forge**: `git checkout prd/<prd-slug> && git merge main`

Resolve the PRD and gate:

```bash
prd_resolve <slug> --kind prd
prd_finalizable <slug>
```

If `prd_finalizable` reports open slices, list them and **stop**.

## Step 2 — Harvest

Read `prd.md` in full, especially `## Implementation notes`. Review the branch diff:

```bash
git log --oneline --no-merges main..prd/<prd-slug>
git diff main...prd/<prd-slug> -- <relevant paths>
```

## Step 3 — Fold into permanent docs

Migrate durable knowledge into the project's permanent design docs, decision log, or changelog (check `prd_profile` for "Knowledge destinations" or find them in the repo). Commit onto the PRD branch.

## Step 4 — Tick the epic + delete PRD dir

**If under an epic** (`prd_get <slug> epic`) — tick the epic:

```bash
prd_epic_tick <epic-slug> <prd-slug>
```

If this was the last child (`prd_epic_finalizable <epic-slug>` says ready), **finalize the epic too**: close the epic milestone, fold epic-level knowledge into permanent docs, delete `docs/prd/epics/<epic-slug>/`.

Confirm with the user, then delete `docs/prd/<slug>/`. Commit onto the PRD branch.

## Step 5 — Integrate + CI

Run the project's **full CI gate** (lint, format, whole test suite, type-check). Fix forward until green.

**Remote forge** — push and open one PR (`prd_forge cmd_create_pr`). Do not auto-merge.
**Local forge** — merge into `main` locally (`prd_forge cmd_create_pr` for the merge command), close the PRD issue (`prd_forge cmd_close_issue`).

Report: docs touched, PR URL (or merged locally), PRD dir removed, epic status.

## Error handling

- **Never finalize partial work** — Step 1 is a hard gate.
- If CI fails, fix forward on the PRD branch — never open a red PR.
- The PRD-dir deletion is irreversible — only delete after the user confirms.

## Constraints

- **One PR per PRD** — finalize opens the only PR. No per-slice PRs.
- Durable knowledge migrates to `docs/`; transient planning detail is discarded.