---
name: prd-workflow-overview
description: "Entry point for PRD/epic/slice questions in repos using the prd-workflow (docs/prd/ tree). Use when: 'is this PRD ready?', 'what's left on PRD X?', 'list the planning tree', 'status of PRD X?', 'is the planning tree valid?', or the first PRD/epic/slice question in a fresh conversation. Routes action requests to the matching workflow skill."
---

# Working with PRDs (prd-workflow)

This repo uses the **prd-workflow**: a planning tree under `docs/prd/` of epics, PRDs, and slices, managed by a set of tools.

Use the registered `prd_*` tools (prd_show, prd_list, prd_get, prd_set, prd_resolve, prd_assert_kind, prd_slices, prd_finalizable, prd_lint, prd_epic_*, prd_forge, prd_reference, prd_profile, prd_workflow_gate) to query and mutate the planning tree. **Prefer these tools over shelling out or hand-editing frontmatter.**

## Answering questions — read-only

| The user asks… | Run tool |
|---|---|
| "Is this PRD ready (to finalize)?" | `prd_finalizable` with the `selector` set to the PRD slug |
| "What's left / which slices are open on PRD X?" | `prd_slices` with the PRD slug |
| "List the PRDs / epics / what's in progress?" | `prd_list` (optionally with `status` or `kind` filter) |
| "Show PRD/epic X (its frontmatter / status)." | `prd_show` with the slug |
| "What's the issue number / file path for X?" | `prd_resolve` |
| "Is the epic done / what are its child PRDs?" | `prd_epic_finalizable` / `prd_epic_prds` |
| "Is the planning tree valid / any malformed docs?" | `prd_lint` |

**"Is this PRD ready?" specifically:** `prd_finalizable` returns "ready to finalize" when every slice has been implemented, or lists the still-open slice numbers otherwise. Treat that as the answer.

## Doing work — route to the right skill

For anything that *creates or changes* artifacts, invoke the matching skill:

- **New PRD or epic** → `/skill:create-prd`
- **Slice an existing PRD into issues** → `/skill:slice-prd`
- **Analyse a slice's test strategy** → `/skill:start-issue`
- **Build a slice (strict TDD)** → `/skill:implement-issue`
- **Close out a PRD (or an epic)** → `/skill:finalize-prd`
- **Backfill a legacy planning doc** → `/skill:adopt-prd`

## Rules

- **Use the prd_* tools** as the only interface to the planning tree. No ad-hoc scripts, no hand-editing frontmatter; ad-hoc approaches drift from the schema and corrupt workflow state.
- Answer read-only questions from the tool's output; for actions, invoke the matching skill.
- The provider (GitHub / Forgejo / local) is detected automatically — use `prd_forge` with the appropriate key to get provider-correct bash commands.