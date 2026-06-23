---
name: prd-workflow-overview
description: "Auto-invoke whenever the user asks about the epics, PRDs, or slices in this repo's docs/prd tree — e.g. is this PRD ready, what's left on X, list the PRDs, what's the status of the epic, is the planning tree valid — or before any PRD/epic/slice work. Steers you to the native prd_* tools and the /… workflow commands instead of improvising: never hand-write scripts, never invent or call an API, never hand-parse or hand-edit the YAML frontmatter."
compatibility: opencode
---

# Working with PRDs (prd-workflow)

This project uses the **prd-workflow**: a planning tree under `docs/prd/` of epics, PRDs,
and slices. **Interact with it only through the native `prd_*` tools** (and the `/…`
workflow commands) — never write your own script, never call a network API, never parse or
edit the YAML frontmatter by hand. Ad-hoc approaches drift from the schema and corrupt
workflow state.

## Answering questions — call the right tool, answer from its output

Pick the tool, call it, and answer **from its output** — don't read the prose and decide
for yourself.

| The user asks… | Call |
|---|---|
| "Is this PRD ready (to finalize)?" | `prd_finalizable` |
| "What's left / which slices are open on PRD X?" | `prd_slices` |
| "List the PRDs / epics / what's in progress?" | `prd_list` |
| "Show PRD/epic X (its frontmatter / status)." | `prd_show` |
| "What's the issue number / file path for X?" | `prd_resolve`, `prd_get` |
| "Is the epic done / what are its child PRDs?" | `prd_epic_finalizable`, `prd_epic_prds` |
| "Is the planning tree valid / any malformed docs?" | `prd_lint` |

A selector is the PRD/epic directory name (or its issue number, or a path). Call `prd_list`
first if you need to discover the slugs.

**"Is this PRD ready?" specifically:** `prd_finalizable` reports "ready to finalize" when no
slice docs survive (every slice implemented and merged), or it lists the still-open slice
numbers. **That is the answer — not your own reading of the PRD text.**

## Doing work — run the matching command, don't free-hand it

Creating or changing artifacts is driven by dedicated slash-commands (each injects the exact
steps and provider-correct git commands). Run the command; don't reconstruct its steps:

- coordinated multi-PRD outcome → `/create-epic` → `/epic-to-prds`
- user-facing feature → `/create-feature-prd` → `/feature-prd-to-issues`
- foundational / no-UI capability → `/create-capability-prd` → `/capability-prd-to-issues`
- plan a slice's tests → `/analyse-issue`; build a slice (strict TDD) → `/implement-issue`
- close out a PRD → `/finalize-prd`; close out an epic → `/finalize-epic`
- backfill a legacy planning doc → `/adopt-prd`; stress-test a plan → `/grill-me`
- set up / upgrade the workflow in this repo → `/init-prd-workflow` / `/update-prd-workflow`

## Rules

- The `prd_*` tools and the `/…` commands are the **only** interface to the planning tree —
  no ad-hoc scripts, no invented or remote APIs, no hand-editing frontmatter.
- Answer read-only questions from tool output; for actions, run the matching command rather
  than improvising its steps.
- The provider (GitHub / Forgejo / local) is auto-detected and the commands emit the correct
  calls — you never choose it or call a host API yourself.
