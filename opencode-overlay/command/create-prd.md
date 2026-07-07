---
description: Interview the user to produce a PRD (or an epic) committed to docs/prd/<slug>/prd.md (or docs/prd/epics/<slug>/epic.md). Use when starting a new feature, capability, or multi-PRD outcome. If the scope fits one PRD, produce a PRD; if it needs multiple coordinated PRDs, produce an epic and decompose it. Hands off to /slice-prd.
---


# Create PRD (or Epic)

Phase 0: interview the user relentlessly, then crystallise into a committed spec.

Check the planning tree first to avoid slug collisions:

**Use the prd_tool `prd_list` tool to see existing artifacts.**

Load the project profile for context (architecture, orientation docs):

**Use the prd_tool `prd_profile` tool.**

Load the artifact schema reference:

**Use the prd_tool `prd_reference` tool.**

## Step 1 — Determine scope

Is this a single PRD (one feature or foundational piece) or an epic (multi-PRD outcome)?
- **Single PRD** → proceed with Step 2, producing a PRD
- **Epic** → skip to Step 5

## Step 2 — Grill (one question at a time)

Use the relentless interview discipline. Always give your recommended answer + reasoning first, then ask. Drive toward, in dependency order:

1. **Who** is the user and **what** outcome do they get? (user stories)
2. **End-to-end behaviour** (for a feature) or **API surface + first consumer** (for a foundational capability)
3. **Layers / surfaces touched** — which parts of the system does this cut through?
4. **Boundaries** — what's explicitly out of scope; what must NOT change.
5. **Slice breakdown** — what are the independently-mergeable tracer bullets? Each is HITL (needs a design decision) or AFK (autonomous).

If a question is answerable from the code/docs, answer it yourself and move on.

## Step 3 — Write the PRD

Write to `docs/prd/<slug>/prd.md` (<slug> = 3–5 word kebab of the title). Frontmatter:

```yaml
---
kind: prd
title: <short human title>
slug: <kebab-slug>
epic: <epic-slug>       # OPTIONAL — omit if standalone
milestone: M<NN>        # OPTIONAL — plain text docs pointer
prd_issue:              # filled by slice-prd
slices: []              # filled by slice-prd
status: draft
---
```

Body (use the canonical sections):

```markdown
# <title>

## Problem / why
## User stories / behaviour
## End-to-end behaviour
## Layers touched
## Out of scope
## Slice breakdown
## Open questions

## Implementation notes
<!-- appended by implement-issue as slices land -->
```

Sanity-check with: `prd_show <slug>` (it must parse and read `kind: prd`).

## Step 4 — Hand off

Tell the user the PRD path and that it's ready for `/slice-prd`. Don't create issues here.

## Step 5 — (Epic branch) Plan and decompose

If this is an epic (multi-PRD outcome), write `docs/prd/epics/<slug>/epic.md`:

```yaml
---
kind: epic
title: <short human title>
slug: <kebab-slug>
epic_milestone:         # filled by epic-to-prds
prds: []                # filled by epic-to-prds
status: draft
---
```

Break the epic into the **fewest coherent PRDs** that each stand alone. Present the decomposition:
per child: slug, one-line scope, blocked_by. Quiz the user. Once approved:

1. **Detect the forge** — use `prd_forge git_type` to learn the provider.
2. **Create the epic milestone** — use `prd_forge cmd_create_milestone` for the provider-correct command.
3. Record as `epic_milestone:` using `prd_set <slug> epic_milestone <#>`.
4. Fill `prds:` in `epic.md` with the ordered plan.
5. Set status to `prds-planned` with `prd_set <slug> status prds-planned`.

Then hand off each child PRD to `/create-prd` serially, seeding `epic: <epic-slug>`.

## Error handling

- If the project has no `docs/prd/` directory, run `/init-prd-workflow` first.
- If the codebase holds orientation docs, read them before writing.

## Constraints

- **English**; **no speculative scope** — anything not justified goes to "Open questions".
- The artifact describes behaviour/surface, not file paths.
- An epic is optional sugar: if the outcome is genuinely one PRD, produce a PRD.