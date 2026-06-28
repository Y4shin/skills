---
description: Interview the user relentlessly about a plan or design until
  reaching shared understanding, resolving each branch of the decision tree. Use
  when the user wants to stress-test a plan, get grilled on their design, or
  mentions "grill me". Don't use it to produce a committed PRD or create issues
  — that's create-feature-prd / create-capability-prd.
model: openrouter/deepseek/deepseek-v4-pro
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer first, with reasoning.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead of asking. The project profile below (its "Project" description and "Orientation docs") tells you what this repo is and where to orient when the design touches existing structure — if it's empty, explore the codebase yourself to build that context:

!`node ".opencode/scripts/prd-tool.js" profile`

This is the shared interview discipline behind `create-feature-prd` and `create-capability-prd`; on its own it just stress-tests a plan and produces no artifact.
