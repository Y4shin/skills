---
description: Backfill YAML frontmatter onto existing planning docs (PRDs, epics, and slice docs) that predate this workflow. Lints the docs/prd tree, then for each non-conforming artifact infers its fields from the prose and writes the frontmatter block. Use to bring legacy docs under management. Don't use it to author new PRDs (use /create-prd).
---


# Adopt PRD

Bring **existing** planning documents under prd-workflow management.

**Use `prd_lint` to find non-conforming artifacts.**

**Use `prd_list` to see the existing tree (avoid collisions).**

**Use `prd_reference` for the frontmatter schema.**

**Use `prd_profile` for architecture context (kind inference).**

## Step 0 — Scope the worklist

```bash
prd_lint     # shows violations
```

Each line is a file to fix. Route by location:
- `prd.md` → Steps 1–5
- `epic.md` → follow "Adopting an epic" branch
- `slices/<n>-<slug>.md` → follow "Adopting a slice doc" branch

## Step 1 — Read the source doc

Read the whole file. Note any partial frontmatter, the H1/title, references to issue numbers or milestones, and existing `slices/` dirs.

## Step 2 — Infer the frontmatter

For a PRD (`prd.md`):

- **`kind`**: `prd` (single kind — no feature/capability split)
- **`title`**: from the H1
- **`slug`**: kebab of the title; prefer existing dir name
- **`epic`** (optional): only if the prose ties it to an existing epic
- **`status`**: `draft` if no issues referenced; `issues-created` if it references issue numbers

For an epic (`epic.md`):
- **`kind`**: `epic`
- **`title`**, **`slug`**, **`status`** from the doc

For a slice doc (`slices/<n>-<slug>.md`):
- **`kind`**: `prd`
- **`title`**, **`slug`**, **`issue`**, **`prd`** (`../prd.md`), **`mode`** (`hitl` default), **`analysed`** (true if `## Test plan` exists)

## Step 3 — File at canonical path

Move the doc to `docs/prd/<slug>/prd.md` or `docs/prd/epics/<slug>/epic.md` (preserving `slices/`). Use `git mv`.

## Step 4 — Write frontmatter + de-duplicate

Prepend the inferred `---` frontmatter block. Remove metadata lines now carried by frontmatter (Status, Kind, Slug, etc.). Keep all substantive prose.

Ensure a trailing `## Implementation notes` section exists for PRDs.

## Step 5 — Verify

```bash
prd_lint <slug-dir>   # expect clean
prd_show <slug>        # verify kind: prd
```

## Step 6 — Hand off

Report the adopted docs. Each PRD is ready for `/slice-prd`. Slices need no hand-off.

## Constraints

- **No new scope.** You normalise an existing spec; you don't author one.
- **Don't lose content** when de-duplicating — only metadata now in frontmatter may be deleted.