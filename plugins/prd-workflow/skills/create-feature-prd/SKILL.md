---
name: create-feature-prd
description: Interview the user to produce a feature PRD (user-facing behaviour) committed to docs/prd/<slug>/prd.md with `kind: feature` frontmatter. Use when starting a new user-facing feature, turning an idea into a spec, or when the user says "let's spec a feature" / "write a PRD for this feature". Don't use it for foundational capability work with no UI (use create-capability-prd), or to break an existing PRD into issues (use feature-prd-to-issues). Hands off to /prd-workflow:feature-prd-to-issues.
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Create Feature PRD

Phase 0 of the **feature** track. Run the relentless `grill-me` interview, then crystallise
it into a committed PRD that `/prd-workflow:feature-prd-to-issues` will slice. A *feature* is
user-facing behaviour that cuts end-to-end through every relevant layer of the stack (see the
project profile's "Architecture layers → Feature" for what a vertical slice means here). For
foundational work with no UI, use `/prd-workflow:create-capability-prd` instead.

The PRD/artifact reference below is loaded via **dynamic context injection** (frontmatter
schema + `docs/prd/<slug>/` layout + lifecycle):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The existing planning-tree inventory is injected here — **check it before choosing
`<slug>`** (avoid collisions) and, in epic context, to confirm the parent epic exists:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

The project profile (project description, orientation docs, architecture layers) is injected
below when available — if empty, explore the codebase for project-specific context:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`

## Step 1 — Load context

Read the project profile's "Orientation docs" and the part of the codebase this feature
touches (the target module/component, or the relevant design doc if it's a new area). If no
profile exists, explore the codebase to find the architecture and frontend docs yourself.
Answer your own questions from the code/docs before asking the user.

## Step 2 — Grill (one question at a time)

Use the `grill-me` discipline. Always give your recommended answer + reasoning first, then
ask. Drive toward, in dependency order:

1. **Who** is the user and **what** outcome do they get? (user stories)
2. **End-to-end behaviour** — the demoable path, not layer-by-layer implementation.
3. **Layers touched** — which of the project profile's architecture layers does this cut
   through (data, API/RPC, business logic, UI, background work)?
4. **Permissions / ownership** — who may do this; what authorization model applies.
5. **Boundaries** — what's explicitly out of scope; what must NOT change.
6. **Acceptance** — how do we know each piece works? (feeds the per-slice test strategy)

If a question is answerable from the code/docs, answer it yourself and move on.

## Step 3 — Write the PRD

Write to `docs/prd/<slug>/prd.md` (`<slug>` = 3–5 word kebab of the title). Frontmatter per
`references/artifacts.md` with `kind: feature` and `status: draft`. **If you were invoked
with epic context** (e.g. handed off from `/prd-workflow:epic-to-prds` with an `epic: <epic-slug>`),
set the `epic:` field to that slug; otherwise omit it (standalone PRD). Body:

```markdown
# <title>

## Problem / why
## User stories
## End-to-end behaviour
## Layers touched
## Out of scope
## Open questions

## Implementation notes
<!-- appended by implement-issue as slices land; empty for now -->
```

Leave `prd_issue:` / `slices:` empty — `/prd-workflow:feature-prd-to-issues` fills them.
Sanity-check the written frontmatter (it must parse and read `kind: feature`):

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" show <slug>
```

## Step 4 — Hand off

Tell the user the PRD path and that it's ready for `/prd-workflow:feature-prd-to-issues`. Don't create
issues here.

## Error handling

- If the injected `references/artifacts.md` is empty/missing, the repo isn't set up for this PRD
  workflow — stop and tell the user rather than inventing a frontmatter schema or directory layout.

## Constraints

- **English**; **no speculative scope** — anything not justified goes to "Open questions".
- The PRD describes behaviour, not file paths or code (those go stale).
