---
name: update-prd-workflow
description: Migrate this repo's prd-workflow up to the version this plugin expects, running each version's migration steps in order and recording the new version. Use when another skill reports the workflow is at an older version, or after updating the prd-workflow plugin. Migrations are provider-aware (e.g. v0→v1 converts epic issues into milestones and reassigns their PRD issues). If the repo is already current it's a no-op; if it has no version file it treats it as v0 and migrates forward.
allowed-tools: Bash(python3 *)
---

# Update / migrate the prd-workflow

The ordered, provider-aware migration steps for this repo are injected below — they carry you
from the repo's stored version up to the version this plugin expects, and end by recording the
new version. **Perform each step in order, then run the final `workflow-version set` command.**
If it reports a no-op, take no action and tell the user there is nothing to do.

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" workflow-migrate-instructions`
