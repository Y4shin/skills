---
name: finalize-prd
description: Close the loop once all of a PRD's slices are merged into its integration branch — harvest the enriched PRD + the branch diff, fold durable knowledge into the project's permanent docs (design docs, milestone/changelog), tick its epic if any, delete the spent PRD dir, then open the single PRD PR (Closes #prd-issue) into main where the full CI gate runs. On a local forge, the PRD branch merges into main locally. This is the one integration point and the one gate for the whole PRD. Use when a PRD's slices are all done, or the user says "finalize"/"wrap up" a PRD. Don't use it while any slice is still open or unmerged (finish implement-issue first). Provider-aware (gh/fgj/local — local projects use the same branch workflow but merge locally instead of opening a PR).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Finalize PRD

Phase 3 — **the PRD's single integration point.** Every slice has merged into the PRD branch
`prd/<prd-slug>` with no PR of its own; finalize migrates durable knowledge into the repo's
permanent docs, retires the spent PRD dir, and either opens the **one** PR
(`prd/<prd-slug>` → `main`) on hosted forges or **merges the PRD branch into `main` locally**
on a local forge. The **full CI gate** runs here for everything the PRD's slices produced.
Invoked as `/prd-workflow:finalize-prd <slug | prd-issue#>`.

All of finalize's doc work (knowledge harvest, epic tick, PRD-dir deletion) is committed
**onto the PRD branch** so it rides to `main` inside that single PR (hosted forges) or local
merge (local forge) — code, docs, and cleanup land together.

Detected forge: **!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge git_type`**.
Per-provider commands come from `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge <key>`. The artifact-lifecycle
reference is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

The project profile (knowledge destinations) is injected below when available — its
"Knowledge destinations" section is where Step 3 folds durable knowledge. If empty, find the
project's permanent docs (design docs, decision log, changelog) and fold knowledge there:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`

## Step 1 — Preconditions

Check out the PRD integration branch first — the slice docs are GC'd on *that* branch (not on
`main`), so the gate only reads clean there.

**Remote forge** (`gh`/`fgj`) — sync with origin:

```bash
git fetch origin
git checkout prd/<prd-slug>
git merge origin/main          # fold in any main that landed since; resolve conflicts, keep tests green
```

**Local forge** (`local`) — no remote to sync:

```bash
git checkout prd/<prd-slug>
git merge main                 # fold in any main that landed since; resolve conflicts, keep tests green
```

Resolve the PRD and gate on its slices:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" resolve <slug|prd-issue#> --kind prd
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" prd-finalizable <slug|prd-issue#>
```

`prd-finalizable` exits **0** only when `docs/prd/<slug>/slices/` holds no surviving slice docs
(every slice implemented + its doc GC'd by `/prd-workflow:implement-issue`); a non-zero exit
lists the still-open slices. Also confirm the slice issues are **closed** — equivalently, the
PRD issue's native `blocked_by` dependencies are all resolved (it is no longer blocked).

If anything is outstanding, list it and **stop** — do not finalize partial work.

## Step 2 — Harvest

Read the enriched `docs/prd/<slug>/prd.md` in full, especially `## Implementation notes`.
Then review what the PRD branch actually produced vs what the PRD proposed:

```bash
git log --oneline --no-merges main..prd/<prd-slug>     # the PRD's slice commits
git diff main...prd/<prd-slug> -- <relevant paths>     # the full PRD change set
```

That diff **is** the upcoming PRD PR (hosted forges) or local merge (local forge). Note
divergences between the PRD's intent and the implementation.

## Step 3 — Fold into permanent docs

Fold durable knowledge into the destinations the project profile's "Knowledge destinations"
section names, matching each doc's existing voice/structure. Typically that means:
- **Design / architecture docs** — add/update the relevant doc, and append a dated entry to
  the project's decision log for any decision made during implementation.
- **Milestone / changelog** — when the PRD maps to one, update the relevant milestone doc and
  its index.

If no profile exists, locate these destinations in the repo yourself. Capture *durable*
knowledge only — what a future contributor needs — not the slice-by-slice narrative. **Commit
these doc updates onto the PRD branch** — they ride to `main` in the PRD PR (hosted forges) or
local merge (local forge).

## Step 4 — Tick the epic + delete the spent PRD dir

- **If `prd.md` carries `epic: <epic-slug>`** (check with
  `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" get <slug> epic`): mark this PRD's
  `prds[]` entry done in `docs/prd/epics/<epic-slug>/epic.md` and tick its checklist item on the
  epic issue:

  ```bash
  python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" epic tick <epic-slug> <prd-slug>
  ```

  (When it's the last child — `epic finalizable <epic-slug>` now exits 0 — the user can
  `/prd-workflow:finalize-epic <epic-slug>`.)

- **Confirm with the user**, then delete the entire `docs/prd/<slug>/` (the PRD has served its
  purpose and would only drift from here).

Commit the epic tick and the dir deletion onto the PRD branch too — every finalize change
belongs in the single integration point (PR on hosted forges, local merge on local forge).

## Step 5 — Integrate the PRD branch + run the full CI gate

1. Run the project's **full CI gate** (the profile's "CI" command — lint, format, whole suite,
   type-check, generated-artifact checks) on the PRD branch. This is the gate every slice
   skipped; **fix forward until it's green** (re-run after each fix). Never integrate red.

**Remote forge** (`gh`/`fgj`) — push and open the one PR:

2. Push the PRD branch and open **one** PR with `--base main`, head `prd/<prd-slug>`, title =
   the PRD title, body = a summary of the slices + the met acceptance criteria + `Closes
   #<prd-issue>`. PR form for the detected provider:

   !`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_create_pr`

3. The host re-runs CI on the PR. A human reviews and merges it — this is the PRD's single
   review gate. **On merge**, all the slice work + the doc updates + the PRD-dir deletion land
   on `main`, and `Closes #<prd-issue>` closes the PRD issue. Don't auto-merge; report the PR
   and let the user merge.

**Local forge** (`local`) — no remote; merge the PRD branch into `main` locally and close the
issue:

2. Merge form:

   !`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_create_pr`

3. Close the PRD issue:

   !`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_close_issue`

   All the slice work + the doc updates + the PRD-dir deletion are now on `main`.

Report: docs touched, the PRD PR URL (hosted forges) or that the PRD branch is merged into
`main` and the PRD issue is closed (local), that the PRD dir is removed, and — if under an
epic — the updated epic checklist.

## Error handling

- If `docs/prd/<slug>/slices/` still has docs or any slice issue is open, **stop** (Step 1 gate) —
  list what's outstanding; never finalize partial work.
- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` prints `NOT_A_GIT_REPO`, the
  directory isn't a git repo — tell the user to run `git init` first and stop.
- If it prints `UNKNOWN_FORGE`, the repo has a remote this workflow doesn't recognise (not
  GitHub/Forgejo) — surface it and stop; don't invent CLI calls. A repo with no remote resolves
  to the built-in `local` tracker — that's expected, not an error; it uses the same branch
  workflow (no remotes/PRs) and drives `prd_tool tracker` for issues.
- If the full CI gate fails (Step 5), **fix forward on the PRD branch** (or report the blocker) —
  never open the PRD PR with a red suite or skipped checks. This gate covers all the slices at once.
- The PRD-dir deletion is irreversible — only delete after the user confirms (Step 4); on a
  hosted forge it lands only when the PRD PR merges, so it's recoverable until then.

## Constraints

- **Never finalize partial work** — Step 1 is a hard gate.
- **One PR per PRD** — finalize opens the only PR the PRD ever gets; the full CI gate runs here,
  not per slice. Don't open per-slice PRs.
- Durable knowledge migrates to `docs/`; transient planning detail is discarded with the PRD.
- Doc edits in **English**, matching the surrounding style.
