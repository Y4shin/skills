---
description: "Interview the user to produce a capability PRD (foundational work
  with no UI) committed to docs/prd/<slug>/prd.md with `kind: capability`
  frontmatter. Use when introducing a foundational capability, API surface, or
  infra primitive. Don't use it for user-facing behaviour (use
  create-feature-prd), or to break an existing PRD into issues (use
  capability-prd-to-issues). Hands off to /capability-prd-to-issues."
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


# Create Capability PRD

Wherever a command below is written as `prd_tool`, run it as the absolute command printed
here (the bundled CLI) — `prd_tool` is shorthand, not a binary on your PATH:

!`node ".opencode/scripts/prd-tool.js" toolpath`

!`node ".opencode/scripts/prd-tool.js" workflow-gate`

Phase 0 of the **capability** track. Run the relentless `grill-me` interview, then
crystallise it into a committed PRD that `/capability-prd-to-issues` will slice. A
*capability* is foundational work others build on — an API surface, a shared library/macro, a
host or platform capability, an infra primitive — with no UI to demo (see the project profile's
"Architecture layers → Capability"). For user-facing behaviour, use
`/create-feature-prd` instead.

The PRD/artifact reference below is loaded via **dynamic context injection** (frontmatter
schema + `docs/prd/<slug>/` layout + lifecycle):

!`node ".opencode/scripts/prd-tool.js" reference`

`prd_tool` is the bundled helper that reads/writes this frontmatter — invoke it as
`prd_tool <subcommand>` (`--help` for the full
surface). The existing planning-tree inventory is injected here — **check it before choosing
`<slug>`** (avoid collisions) and, in epic context, to confirm the parent epic exists:

!`node ".opencode/scripts/prd-tool.js" list`

The project profile (project description, orientation docs, architecture layers) is injected
below when available — if empty, explore the codebase for project-specific context:

!`node ".opencode/scripts/prd-tool.js" profile`

## Step 1 — Load context

Read the project profile's "Orientation docs" (especially anything describing the interfaces
and layering this capability sits in) and the existing surface this capability extends — the
library, host module, or shared package it lives in. If no profile exists, explore the
codebase to find those yourself. Answer your own questions from the code/docs before asking
the user.

## Step 2 — Grill (one question at a time)

Use the `grill-me` discipline. Always give your recommended answer + reasoning first, then
ask. Drive toward, in dependency order:

1. **API surface** — the exact shape (types, functions, interfaces, macro input/output). What
   does a consumer write?
2. **First real consumer** — which downstream code (a consumer module/service) uses it first?
   (an unconsumed capability is speculative).
3. **Encapsulation** — what must NOT leak to consumers; what stays internal, per the project
   profile's layering rules.
4. **Compatibility / versioning** — is this additive? Does it break existing consumers? Migration path?
5. **Boundaries** — out of scope; future extension points deliberately deferred.
6. **Acceptance** — how is each unit proven? (a test in the owning module/package plus a
   downstream consumer exercising it — see the profile's test infrastructure).

If a question is answerable from the code/docs, answer it yourself and move on.

## Step 3 — Write the PRD

Write to `docs/prd/<slug>/prd.md` (`<slug>` = 3–5 word kebab of the title). Frontmatter per
`references/artifacts.md` with `kind: capability` and `status: draft`. **If you were invoked
with epic context** (e.g. handed off from `/epic-to-prds` with an `epic: <epic-slug>`),
set the `epic:` field to that slug; otherwise omit it (standalone PRD). Body:

```markdown
# <title>

## Problem / why
## API surface
## First consumer
## Encapsulation & layering
## Compatibility / versioning
## Out of scope
## Open questions

## Implementation notes
<!-- appended by implement-issue as slices land; empty for now -->
```

Leave `prd_issue:` / `slices:` empty — `/capability-prd-to-issues` fills them.
Sanity-check the written frontmatter (it must parse and read `kind: capability`):

```bash
prd_tool show <slug>
```

## Step 4 — Hand off

Tell the user the PRD path and that it's ready for `/capability-prd-to-issues`. Don't
create issues here.

## Error handling

- If the injected `references/artifacts.md` is empty/missing, the repo isn't set up for this PRD
  workflow — stop and tell the user rather than inventing a frontmatter schema or directory layout.

## Constraints

- **English**; **no speculative scope** — every surface must name a consumer or it's
  deferred to "Open questions".
- The PRD describes the surface + behaviour, not implementation file paths.
