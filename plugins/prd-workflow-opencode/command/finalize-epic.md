---
description: Close the loop on an epic once all its child PRDs are finalized —
  fold epic-level durable knowledge into the project's permanent docs (design
  docs, changelog), close the epic milestone (an epic is a milestone, not an
  issue), then delete the spent epic dir. Use when every child PRD of an epic is
  done, or the user says "finalize"/"wrap up" an epic. Don't use it while any
  child PRD is unfinished (finish finalize-prd first). Provider-aware
  (gh/fgj/local).
model: openrouter/deepseek/deepseek-v4-flash
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


# Finalize Epic

Wherever a command below is written as `prd_tool`, run it as the absolute command printed
here (the bundled CLI) — `prd_tool` is shorthand, not a binary on your PATH:

!`node ".opencode/scripts/prd-tool.js" toolpath`

!`node ".opencode/scripts/prd-tool.js" workflow-gate`

The tier above `/finalize-prd`: once **every** child PRD of an epic has been
finalized, migrate the epic-level durable knowledge into the repo's permanent docs and retire
the epic. Invoked as `/finalize-epic <slug | epic-milestone#>`.

Detected forge: **!`node ".opencode/scripts/prd-tool.js" forge git_type`**.
Per-provider commands come from `prd_tool forge <key>`. The
artifact-lifecycle reference is injected below.

!`node ".opencode/scripts/prd-tool.js" reference`

`prd_tool` is the bundled helper that reads/writes this frontmatter — invoke it as
`prd_tool <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`node ".opencode/scripts/prd-tool.js" list`

The project profile (knowledge destinations) is injected below when available — its
"Knowledge destinations" section is where Step 3 folds epic-level durable knowledge. If empty,
find the project's permanent docs (design docs, decision log, changelog) and fold knowledge there:

!`node ".opencode/scripts/prd-tool.js" profile`

## Step 1 — Preconditions (hard gate)

Resolve the epic (accepts the slug **or** the `epic_milestone:` number) and gate on its children:

```bash
prd_tool resolve <slug|epic-milestone#> --kind epic
prd_tool epic prds <slug>          # per-child issue/done state
prd_tool epic finalizable <slug>   # the gate
```

`epic finalizable` exits **0** only when **every** child in `prds:` is ticked done (each
`/finalize-prd` ticks its entry); a non-zero exit names the unfinished children.
Cross-check that each child's `docs/prd/<child-slug>/` directory is **gone** and each child PRD
issue is **closed** (the epic milestone shows all its issues closed).

If any child is outstanding, list it and **stop** — finalize the remaining child PRDs first
(`/finalize-prd <child-slug>`). Never finalize a partial epic.

## Step 2 — Harvest

Read `epic.md` in full. The per-PRD durable knowledge already landed in the project's
permanent docs via each `/finalize-prd`; your job here is the **cross-cutting**
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

- Close the **epic milestone** (`epic_milestone:`). Close form for the detected provider:

  !`node ".opencode/scripts/prd-tool.js" forge cmd_close_milestone`

- **Confirm with the user**, then delete the entire `docs/prd/epics/<epic-slug>/` and commit
  alongside the doc updates.

Report: docs touched, epic milestone closed, epic dir removed.

## Error handling

- If any child PRD dir survives under `docs/prd/` or any child PRD issue is open, **stop** (Step 1
  gate) — list what's outstanding; never finalize a partial epic.
- If `prd_tool forge` prints `NOT_A_GIT_REPO`, the
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
