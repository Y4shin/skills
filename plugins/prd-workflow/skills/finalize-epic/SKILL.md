---
name: finalize-epic
description: Close the loop on an epic once all its child PRDs are finalized — fold epic-level durable knowledge into permanent repo docs (docs/design/, docs/impl/), close the epic tracking issue, then delete the spent epic dir. Use when every child PRD of an epic is done, or the user says "finalize"/"wrap up" an epic. Don't use it while any child PRD is unfinished (finish finalize-prd first). Provider-aware (gh/fgj).
allowed-tools: Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Finalize Epic

The tier above `/prd-workflow:finalize-prd`: once **every** child PRD of an epic has been
finalized, migrate the epic-level durable knowledge into the repo's permanent docs and retire
the epic. Invoked as `/prd-workflow:finalize-epic <slug | epic-issue#>`.

Detected forge: **!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" git_type`**.
Per-provider commands come from `${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh <key>`. The
artifact-lifecycle reference is injected below.

!`cat "${CLAUDE_PLUGIN_ROOT}/references/artifacts.md"`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

## Step 1 — Preconditions (hard gate)

Resolve the epic (accepts the slug **or** the `epic_issue:` number) and gate on its children:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" resolve <slug|epic-issue#> --kind epic
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" epic prds <slug>          # per-child issue/done state
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" epic finalizable <slug>   # the gate
```

`epic finalizable` exits **0** only when **every** child in `prds:` is ticked done (each
`/prd-workflow:finalize-prd` ticks its entry); a non-zero exit names the unfinished children.
Cross-check that each child's `docs/prd/<child-slug>/` directory is **gone** and each child PRD
issue is **closed** (the epic issue's sub-issue progress reads complete).

If any child is outstanding, list it and **stop** — finalize the remaining child PRDs first
(`/prd-workflow:finalize-prd <child-slug>`). Never finalize a partial epic.

## Step 2 — Harvest

Read `epic.md` in full. The per-PRD durable knowledge already landed in `docs/design/` +
`docs/impl/` via each `/prd-workflow:finalize-prd`; your job here is the **cross-cutting** story
the individual PRDs couldn't tell on their own:
- how the plugins compose to deliver the outcome (the seams, the shared tables/components,
  the navigation/permission wiring);
- any epic-level decision not captured by a single child.

## Step 3 — Fold into permanent docs

Match the existing doc voice/structure:
- **Design** — add/update the relevant `docs/design/*` (especially
  `08-cross-plugin-composition.md` for how the set fits together) and append a dated entry to
  `docs/design/14-decision-log.md` for any epic-level decision.
- **Milestone** — when the epic maps to a milestone (or a band of them), add/update the
  `docs/impl/NN-M<NN>-*.md` doc(s) and the `docs/impl/README.md` index.

Capture *durable, cross-cutting* knowledge only — not what already lives in the child PRDs'
finalized docs.

## Step 4 — Close out + delete

- Close the **epic issue** with a comment linking the doc updates (commit SHA / PR).
  Close form for the detected provider:

  !`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" cmd_close_issue`

- **Confirm with the user**, then delete the entire `docs/prd/epics/<epic-slug>/` and commit
  alongside the doc updates.

Report: docs touched, epic issue closed, epic dir removed.

## Error handling

- If any child PRD dir survives under `docs/prd/` or any child PRD issue is open, **stop** (Step 1
  gate) — list what's outstanding; never finalize a partial epic.
- If `${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh` exits non-zero or emits no command, the repo
  has no recognised GitHub/Forgejo remote — surface its stderr and stop; don't invent CLI calls.
- The epic-dir deletion is irreversible — only delete after the user confirms (Step 4) and the doc
  updates are committed.

## Constraints

- **Never finalize a partial epic** — Step 1 is a hard gate on all children.
- Durable, cross-cutting knowledge migrates to `docs/`; transient planning detail is discarded
  with the epic dir.
- Doc edits in **English**, matching the surrounding style.
