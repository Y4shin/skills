---
name: finalize-epic
description: Close the loop on an epic once all its child PRDs are finalized — fold epic-level durable knowledge into the project's permanent docs (design docs, milestone/changelog), close the epic tracking issue, then delete the spent epic dir. Use when every child PRD of an epic is done, or the user says "finalize"/"wrap up" an epic. Don't use it while any child PRD is unfinished (finish finalize-prd first). Provider-aware (gh/fgj/local).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Finalize Epic

The tier above `/prd-workflow:finalize-prd`: once **every** child PRD of an epic has been
finalized, migrate the epic-level durable knowledge into the repo's permanent docs and retire
the epic. Invoked as `/prd-workflow:finalize-epic <slug | epic-issue#>`.

Detected forge: **!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge git_type`**.
Per-provider commands come from `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge <key>`. The
artifact-lifecycle reference is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

The project profile (knowledge destinations) is injected below when available — its
"Knowledge destinations" section is where Step 3 folds epic-level durable knowledge. If empty,
find the project's permanent docs (design docs, decision log, changelog) and fold knowledge there:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`

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

Read `epic.md` in full. The per-PRD durable knowledge already landed in the project's
permanent docs via each `/prd-workflow:finalize-prd`; your job here is the **cross-cutting**
story the individual PRDs couldn't tell on their own:
- how the components compose to deliver the outcome (the seams, the shared
  data/components, the cross-cutting wiring);
- any epic-level decision not captured by a single child.

## Step 3 — Fold into permanent docs

Fold cross-cutting knowledge into the destinations the project profile's "Knowledge
destinations" section names, matching each doc's existing voice/structure. Typically that means:
- **Design / architecture docs** — add/update the relevant doc (especially whatever describes
  how components compose) and append a dated entry to the project's decision log for any
  epic-level decision.
- **Milestone / changelog** — when the epic maps to a milestone (or a band of them),
  add/update the relevant milestone doc(s) and their index.

If no profile exists, locate these destinations in the repo yourself. Capture *durable,
cross-cutting* knowledge only — not what already lives in the child PRDs' finalized docs.

## Step 4 — Close out + delete

- Close the **epic issue** with a comment linking the doc updates (commit SHA / PR).
  Close form for the detected provider:

  !`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_close_issue`

- **Confirm with the user**, then delete the entire `docs/prd/epics/<epic-slug>/` and commit
  alongside the doc updates.

Report: docs touched, epic issue closed, epic dir removed.

## Error handling

- If any child PRD dir survives under `docs/prd/` or any child PRD issue is open, **stop** (Step 1
  gate) — list what's outstanding; never finalize a partial epic.
- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` prints `NOT_A_GIT_REPO`, the
  directory isn't a git repo — tell the user to run `git init` first and stop.
- If it prints `UNKNOWN_FORGE`, the repo has a remote this workflow doesn't recognise (not
  GitHub/Forgejo) — surface it and stop; don't invent CLI calls. A repo with no remote resolves
  to the built-in `local` tracker — that's expected, not an error; it uses the same branch
  workflow (no remotes/PRs) and drives `prd_tool tracker` for issues.
- The epic-dir deletion is irreversible — only delete after the user confirms (Step 4) and the doc
  updates are committed.

## Constraints

- **Never finalize a partial epic** — Step 1 is a hard gate on all children.
- Durable, cross-cutting knowledge migrates to `docs/`; transient planning detail is discarded
  with the epic dir.
- Doc edits in **English**, matching the surrounding style.
