---
description: Migrate this repo's prd-workflow up to the version this plugin
  expects, running each version's migration steps in order and recording the new
  version. Use when another skill reports the workflow is at an older version,
  or after updating the prd-workflow plugin. Migrations are provider-aware (e.g.
  v0→v1 converts epic issues into milestones and reassigns their PRD issues). If
  the repo is already current it's a no-op; if it has no version file it treats
  it as v0 and migrates forward.
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


# Update / migrate the prd-workflow

The ordered, provider-aware migration steps for this repo are injected below — they carry you
from the repo's stored version up to the version this plugin expects, and end by recording the
new version. **Perform each step in order, then run the final `workflow-version set` command.**
If it reports a no-op, take no action and tell the user there is nothing to do.

!`node ".opencode/scripts/prd-tool.js" workflow-migrate-instructions`
