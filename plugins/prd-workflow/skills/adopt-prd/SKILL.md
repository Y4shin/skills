---
name: adopt-prd
description: Backfill the prd-workflow YAML frontmatter onto one or many existing PRD docs that predate this workflow (or were hand-written without it). Lints the docs/prd tree with prd_tool list-bad-files / show-violations to find every non-conforming artifact, then for each infers kind (feature|capability), title, slug and status from the prose, writes the frontmatter block, relocates the file to docs/prd/<slug>/prd.md, and trims body text that merely duplicates those fields. Use to bring a single legacy PRD — or a whole directory of them — under management. Don't use it to author a brand-new PRD (use create-feature-prd / create-capability-prd) or to slice one into issues (use *-prd-to-issues). Hands off to the matching /prd-workflow:*-prd-to-issues.
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*), Bash(mkdir:*), Bash(git mv:*), Bash(mv:*)
---

# Adopt PRD

Bring **existing** PRD documents — written before this workflow, or by hand without the
structured header — under prd-workflow management, **one doc or a whole directory at once**. You
do **not** interview the user or invent scope here: the specs already exist. Your job is to *read*
each one, **infer** the frontmatter the workflow expects, write that header, file the doc at its
canonical path, and **trim prose that now merely restates the frontmatter**. For authoring a PRD
from scratch, use `/prd-workflow:create-feature-prd` or `/prd-workflow:create-capability-prd`
instead.

The PRD/artifact reference below is loaded via **dynamic context injection** (the frontmatter
schema you must produce, the `docs/prd/<slug>/` layout, and the lifecycle / status values):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). Two subcommands drive the batch worklist: **`list-bad-files`** prints the path of every
artifact whose frontmatter violates the schema, and **`show-violations [path]`** prints, per file,
a concise list of exactly what's missing or wrong (both take `--json`). Note `prd_tool` can only
`show`/`resolve` a doc **once** it carries a valid `---` fence — so read each source with the plain
file tools first, and use `show-violations` to confirm the result at the end. The existing
planning-tree inventory is injected here — **check it before choosing each `<slug>`** (avoid
collisions) and to spot the parent epic if a doc belongs to one:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

## Step 0 — Scope the worklist

If the user named a single doc, that's your worklist. If they pointed at a **directory** (or said
"fix up `docs/prd`"), enumerate the non-conforming artifacts and read the specifics:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list-bad-files     # the files to fix
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" show-violations    # what's wrong with each
```

A file already absent from `list-bad-files` conforms — leave it untouched. Then run **Steps 1–5
once per flagged file**; do the whole batch before the single hand-off in Step 6. Note
`list-bad-files` only sees docs already under `docs/prd/<slug>/prd.md` or
`docs/prd/epics/<slug>/epic.md`; a legacy doc sitting elsewhere won't appear until you relocate it
(Step 3), so also handle any out-of-tree path the user explicitly points you at.

## Step 1 — Read the source doc

For the doc you're adopting, read the **whole** file (the matching `show-violations` line tells you
which fields are missing or wrong). Note:

- any **partial/non-conforming frontmatter** already present (reconcile it — don't discard data);
- the **H1 / title**, and any leading metadata block, table, or `Key: value` lines;
- references to **issue numbers**, a **milestone** (`docs/impl/MNN`), or a parent **epic**;
- whether a sibling `slices/` directory already exists next to the doc.

## Step 2 — Infer the frontmatter

Produce the fields `references/artifacts.md` defines for a PRD. Infer from evidence; never
fabricate scope to fill a field — omit an optional field rather than guess.

1. **`kind`** — the one real decision. **`feature`** = user-facing plugin behaviour that cuts
   through the stack (proto/RPC → migration → plugin → frontend → test). **`capability`** =
   foundational SDK/macro/host/infra work with no UI to demo. Decide from what the doc *delivers*.
   If the prose is genuinely ambiguous, ask the user — this drives which `*-prd-to-issues`
   consumes it.
2. **`title`** — the short human title (from the H1, cleaned up).
3. **`slug`** — 3–5 word kebab of the title. If the doc already lives under `docs/prd/<dir>/`,
   prefer that dir name unless it's poor. Cross-check the injected `list` for collisions.
4. **`epic`** *(optional)* — set **only** if the prose clearly ties it to an epic that exists in
   the injected `list`; otherwise omit (standalone PRD).
5. **`milestone`** *(optional)* — set only if the doc references a real `docs/impl/` milestone.
6. **`status`** — infer from lifecycle evidence, per the lifecycle in `artifacts.md`:
   - no issue numbers referenced and no `slices/` dir ⇒ `draft`;
   - it already references a PRD issue and/or slice issues ⇒ `issues-created`, and capture
     `prd_issue:` / `slices:` from those references. When in doubt, prefer `draft` and leave
     `prd_issue:` / `slices:` empty for the `*-prd-to-issues` step to fill.

## Step 3 — File it at the canonical path

The doc must end up at `docs/prd/<slug>/prd.md` so `prd_tool` (which globs `docs/prd/*/prd.md`)
can find it. If it isn't there already, `mkdir -p docs/prd/<slug>/` and `git mv` it into place,
**preserving any existing `slices/` directory** alongside it. If a different artifact already
owns that dir, stop and reconcile with the user rather than overwriting.

## Step 4 — Write frontmatter & de-duplicate the body

Prepend the inferred `---` frontmatter block (fields in the order `artifacts.md` lists for the
PRD). Then make the body stop repeating it — this is the **rewrite** the user asked for:

- **Keep** a single `# <title>` H1 as the first body line (that's the document title, not
  duplication) — but **remove** a separate leading **metadata block / table / `Key: value`
  lines** (Status, Kind, Slug, Owner, Epic, Milestone, issue numbers, dates) now carried by the
  frontmatter.
- Delete stray in-prose restatements like "*This is a feature PRD…*" or "*Status: Draft*" where
  they exist only to convey a field.
- **Light touch otherwise.** Preserve all substantive prose. You may align section headings to
  the canonical template for the inferred `kind` (feature: Problem / User stories / End-to-end
  behaviour / Layers touched / Out of scope / Open questions; capability: Problem / API surface /
  First consumer / Encapsulation & layering / Compatibility / Out of scope / Open questions)
  **only when the mapping is unambiguous** — never drop content to fit, and route genuine gaps
  to an "## Open questions" section rather than inventing answers.
- Ensure a trailing `## Implementation notes` section exists (empty) for `implement-issue` to
  append to, if the doc doesn't already have one.

## Step 5 — Verify

Confirm the rewritten doc now conforms — it should report no violations and `show` the inferred
kind:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" show-violations <slug-dir>   # expect clean
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" show <slug>                  # kind: feature|capability
```

When working a directory, after the last file run `list-bad-files` once more — it should print
nothing (or only out-of-scope items you deliberately left). Any remaining line is a doc you still
need to fix.

## Step 6 — Hand off

Once the batch is clean, report a short summary: for each adopted doc its canonical path and the
inferred `kind`/`status`, and that each is ready for the matching
`/prd-workflow:feature-prd-to-issues` or `/prd-workflow:capability-prd-to-issues`. Don't create
issues here. Wherever you had to guess on `kind`, `epic`, or scope gaps, call it out so the user
can correct it before slicing.

## Adopting an epic instead

If the source doc is actually an **epic** (it coordinates several PRDs rather than describing one
feature/capability), infer `kind: epic` and the epic schema from `artifacts.md`, file it at
`docs/prd/epics/<slug>/epic.md`, and hand off to `/prd-workflow:epic-to-prds`. Leave
`epic_issue:` / `prds:` for that step unless the prose already enumerates them.

## Error handling

- If the injected `references/artifacts.md` is empty/missing, the repo isn't set up for this PRD
  workflow — stop and tell the user rather than inventing a frontmatter schema or directory layout.
- If the source doc carries frontmatter that already conforms, there's nothing to adopt — say so
  and stop instead of churning the file.

## Constraints

- **No new scope.** You normalise an existing spec; you don't author one. Anything unclear goes to
  "Open questions", not into invented prose.
- **Don't lose content** when de-duplicating or re-heading — only metadata that the frontmatter
  now carries may be deleted.
- The PRD describes behaviour/surface, not file paths or code (those go stale).
