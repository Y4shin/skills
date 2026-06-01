---
name: create-epic
description: Interview the user to produce an epic — a coordinated outcome spanning several PRDs ("a set of plugins that do X") — committed to docs/prd/epics/<slug>/epic.md with `kind: epic` frontmatter. Use when the goal is bigger than one plugin/capability and needs to fan out into multiple PRDs. Don't use it for a single plugin feature (use create-feature-prd) or one foundational capability (use create-capability-prd). Hands off to /prd-workflow:epic-to-prds.
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Create Epic

Phase −1 of the workflow: the tier **above** a PRD. Run the relentless `grill-me` interview,
then crystallise a higher-level outcome into a committed `epic.md` that `/prd-workflow:epic-to-prds`
will decompose into ordered child PRDs. An *epic* is a coordinated set of plugins / cross-cutting
work delivering one outcome ("a set of plugins that do X"). For a single plugin feature use
`/prd-workflow:create-feature-prd`; for one foundational capability use
`/prd-workflow:create-capability-prd`.

The PRD/artifact reference below is loaded via **dynamic context injection** (the three tiers,
frontmatter schema, `docs/prd/<slug>/` layout, tracker shape, lifecycle):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The existing planning-tree inventory is injected here — **check it before choosing
`<slug>`** so the new epic doesn't collide with an existing artifact:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

## Step 1 — Load context

Read `docs/design/02-architecture.md`, `docs/design/06-plugin-shape.md`,
`docs/design/08-cross-plugin-composition.md`, the `plugins/` trees that already exist, and any
related `docs/impl/` milestones. An epic almost always spans plugin boundaries and shared host
/ SDK work — understand the existing composition seams before asking the user.

## Step 2 — Grill (one question at a time)

Use the `grill-me` discipline. Always give your recommended answer + reasoning first, then ask.
Drive toward, in dependency order:

1. **Outcome** — the one-sentence result the whole epic delivers; who benefits.
2. **Constituent plugins & surfaces** — which plugins (new or extended) and host/SDK surfaces
   participate? Name each and its role in the outcome.
3. **Shared / foundational work** — what cross-cutting capability work (SDK, macro, host,
   manifest, navigation) must land **first** so the per-plugin features can build on it?
4. **Per-plugin features** — the user-facing behaviour each plugin contributes.
5. **Dependency ordering** — which pieces block which (capabilities before their consumers;
   plugin B depends on plugin A's exposed table/component).
6. **Boundaries** — what's explicitly out of scope; what must NOT change.

If a question is answerable from the code/docs, answer it yourself and move on.

## Step 3 — Write the epic

Write to `docs/prd/epics/<slug>/epic.md` (`<slug>` = 3–5 word kebab of the title). Frontmatter per
`references/artifacts.md` with `kind: epic` and `status: draft`. Body:

```markdown
# <title>

## Problem / outcome
## Constituent plugins & surfaces
## Shared / foundational work
## Per-plugin features
## Dependency ordering
## Out of scope
## Open questions

## Decomposition
<!-- filled by epic-to-prds: the ordered child-PRD plan -->
```

Leave `epic_issue:` / `prds:` empty — `/prd-workflow:epic-to-prds` fills them. Sanity-check the
written frontmatter (it must parse and read `kind: epic`):

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" show <slug>
```

## Step 4 — Hand off

Tell the user the epic path and that it's ready for `/prd-workflow:epic-to-prds`. Don't create
issues or child PRDs here.

## Error handling

- If the injected `references/artifacts.md` is empty/missing, the repo isn't set up for this PRD
  workflow — stop and tell the user rather than inventing a frontmatter schema or directory layout.

## Constraints

- **English**; **no speculative scope** — anything not justified goes to "Open questions".
- The epic describes the outcome and the shape of its decomposition, not implementation file
  paths (those go stale and belong in the child PRDs / slices).
- An epic is optional sugar: if the outcome is genuinely one PRD, say so and point the user at
  `/prd-workflow:create-feature-prd` or `/prd-workflow:create-capability-prd` instead.
