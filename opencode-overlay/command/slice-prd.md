---
description: Break a PRD into independently-grabbable issues as tracer-bullet slices, wire the PRD issue + slices with native dependencies (and assign the PRD issue to the epic's milestone when under an epic), and write committed slice docs. Use after /create-prd. Provider-aware (gh, fgj, local).
---


# Slice PRD → Issues

Phase 1: convert a `kind: prd` artifact into a set of tracked issues.

**Use `prd_assert_kind <slug> prd` to verify the artifact is a PRD.**

**Use `prd_forge auth_check` to verify provider authentication.**

**Use `prd_forge ensure_labels` to ensure the label scheme exists (idempotent).**

**Use `prd_list` to check existing artifacts.**

**Use `prd_profile` to load project context (architecture layers, test infrastructure).**

**Use `prd_reference` to load the slice doc template.**

## Step 1 — Explore

Read the PRD doc at `docs/prd/<slug>/prd.md` in full. Explore the codebase if needed.

## Step 2 — Draft vertical slices

Break the PRD into **tracer bullet** slices. Each cuts a narrow but COMPLETE path through every relevant layer end-to-end — NOT a horizontal slice of one layer. Each slice is:
- **HITL** (needs human interaction — a design/architecture decision) or **AFK** (implementable autonomously)
- Demoable / verifiable on its own
- Preferably thin

Prefer AFK where possible.

## Step 3 — Quiz the user

Present the breakdown: per slice — **Title**, **Type (HITL/AFK)**, **Blocked by**, **Behaviour covered**. Iterate until approved.

## Step 4 — Publish

Detect the provider with `prd_forge git_type`. Use `prd_forge cmd_create_issue`, `prd_forge cmd_add_dependency`, etc. for provider-correct commands.

Check `prd_get <slug> epic`:

- **If under an epic:** the PRD issue **already exists** as a placeholder (created by create-prd). Edit it with `prd_forge cmd_edit_issue`. Get its number with `prd_epic_prd_issue <epic-slug> <prd-slug>`.
- **If standalone:** create a fresh issue with `prd_forge cmd_create_issue`.

Record the PRD issue: `prd_set <slug> prd_issue <#>`.

For each slice, in dependency order:
1. Create the issue with appropriate labels (`kind:prd`, `mode:hitl|afk`, `status:todo`).
2. Add PRD `blocked_by` this slice (using `prd_forge cmd_add_dependency`).
3. For each blocker in the slice's `## Blocked by`, add slice `blocked_by` blocker.
4. Write `docs/prd/<slug>/slices/<n>-<slug>.md` from the template.

Record the slices and update status:
```bash
prd_set_slices <slug> <#a> <#b> ...
prd_set <slug> status issues-created
```

**If under an epic:** `prd_set <epic-slug> status in-progress`.

Report: `#<n> · <title> · HITL|AFK · blocked-by: …` per slice, the PRD issue number, and epic milestone if any.

## Slices issue template

```
## Part of
#<prd> (PRD: `docs/prd/<slug>/prd.md`)

## What to build
<end-to-end behaviour>

## Acceptance criteria
- [ ] …

## Blocked by
- #<n> — <reason>   |   None — can start immediately
```

## Slice doc template (`slices/<n>-<slug>.md`)

```markdown
---
kind: prd
title: <short human title>
slug: <kebab-slug>
issue: <#n>
prd: ../prd.md
mode: hitl | afk
analysed: false
---

# Slice #<n> — <title>

## What to build
<end-to-end behaviour>

## Acceptance criteria
- [ ] …

## Blocked by
- #<n> — <reason>  |  None — can start immediately

## Test plan          ← appended by start-issue
…
```

## Error handling

- If `prd_assert_kind` fails, the artifact isn't a PRD. Use the correct skill.
- If the forge can't be detected (NOT_A_GIT_REPO / UNKNOWN_FORGE), surface the error to the user.

## Constraints

- **English**; **no speculative scope**.
- An epic is a milestone; PRD↔slice and all ordering are native dependencies. No epic issues or sub-issues.