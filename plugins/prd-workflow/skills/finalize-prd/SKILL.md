---
name: finalize-prd
description: Close the loop once all of a PRD's slices are merged — harvest the enriched PRD + the merged code changes, fold durable knowledge into permanent repo docs (docs/design/, docs/impl/), close the PRD issue (and tick its epic if any), then delete the spent PRD. Use when a PRD's work is complete, or the user says "finalize"/"wrap up" a PRD. Don't use it while any slice is still open or unmerged (finish implement-issue first). Provider-aware (gh/fgj).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Finalize PRD

Phase 3: once every slice of a PRD is implemented and merged, migrate the durable knowledge
into the repo's permanent docs and retire the PRD. Invoked as `/prd-workflow:finalize-prd <slug | prd-issue#>`.

Detected forge: **!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge git_type`**.
Per-provider commands come from `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge <key>`. The artifact-lifecycle
reference is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

## Step 1 — Preconditions

Resolve the PRD (accepts the slug **or** the `prd_issue:` number) and gate on its slices:

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
Then review what actually shipped vs what the PRD proposed:

```bash
git fetch origin
git log --oneline --no-merges origin/main ^<prd-branch-point>   # commits since the PRD started
git diff <prd-branch-point>...origin/main -- <relevant paths>
```

(Use the merged slice PRs / closed issues to bound the range.) Note divergences between the
PRD's intent and the implementation.

## Step 3 — Fold into permanent docs

Match the existing doc voice/structure:
- **Design** — add/update the relevant `docs/design/*` (architecture, plugin/SDK interface)
  and append a dated entry to `docs/design/14-decision-log.md` for any decision made during
  implementation.
- **Milestone** — when the PRD maps to a milestone, add/update `docs/impl/NN-M<NN>-*.md` and
  the `docs/impl/README.md` index/status legend.

Capture *durable* knowledge only — what a future contributor needs — not the slice-by-slice
narrative.

## Step 4 — Close out + delete

- Close the **PRD issue** with a comment linking the doc updates (commit SHA / PR).
  Close form for the detected provider:

  !`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_close_issue`

- **If `prd.md` carries `epic: <epic-slug>`** (check with
  `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" get <slug> epic`): mark this PRD's
  `prds[]` entry done in `docs/prd/epics/<epic-slug>/epic.md` and tick its checklist item on the
  epic issue:

  ```bash
  python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" epic tick <epic-slug> <prd-slug>
  ```

  (When it's the last child — `epic finalizable <epic-slug>` now exits 0 — the user can
  `/prd-workflow:finalize-epic <epic-slug>`.)

- **Confirm with the user**, then delete the entire `docs/prd/<slug>/` and commit alongside
  the doc updates (the PRD has served its purpose and would only drift from here).

Report: docs touched, PRD issue closed, PRD dir removed, and (if under an epic) the epic
checklist updated.

## Error handling

- If `docs/prd/<slug>/slices/` still has docs or any slice issue is open, **stop** (Step 1 gate) —
  list what's outstanding; never finalize partial work.
- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` exits non-zero or emits no command, the repo
  has no recognised GitHub/Forgejo remote — surface its stderr and stop; don't invent CLI calls.
- The PRD-dir deletion is irreversible — only delete after the user confirms (Step 4) and the doc
  updates are committed.

## Constraints

- **Never finalize partial work** — Step 1 is a hard gate.
- Durable knowledge migrates to `docs/`; transient planning detail is discarded with the PRD.
- Doc edits in **English**, matching the surrounding style.
