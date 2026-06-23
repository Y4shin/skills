---
description: Initialize the prd-workflow in this repo by creating the version
  file (docs/prd/.workflow-version). Every other prd-workflow skill refuses to
  run until this exists, so run this once first. Use when starting the
  prd-workflow in a repo for the first time, or when another skill reports the
  workflow is uninitialized. For a repo with pre-versioning artifacts it stamps
  the v0 baseline and points you at update-prd-workflow. If already initialized
  it's a no-op.
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


# Initialize the prd-workflow

The prd-workflow's convention version for this repo lives in the dotfile
`docs/prd/.workflow-version`. The exact action for this repo's current state is injected
below — it tells you precisely what to run, and nothing more. **Do only what it says.** If it
reports a no-op, take no action and tell the user there is nothing to do.

!`node ".opencode/scripts/prd-tool.js" workflow-init-instructions`
