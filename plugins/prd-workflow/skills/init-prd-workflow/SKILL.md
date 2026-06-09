---
name: init-prd-workflow
description: Initialize the prd-workflow in this repo by creating the version file (docs/prd/.workflow-version). Every other prd-workflow skill refuses to run until this exists, so run this once first. Use when starting the prd-workflow in a repo for the first time, or when another skill reports the workflow is uninitialized. For a repo with pre-versioning artifacts it stamps the v0 baseline and points you at update-prd-workflow. If already initialized it's a no-op.
allowed-tools: Bash(python3 *)
---

# Initialize the prd-workflow

The prd-workflow's convention version for this repo lives in the dotfile
`docs/prd/.workflow-version`. The exact action for this repo's current state is injected
below — it tells you precisely what to run, and nothing more. **Do only what it says.** If it
reports a no-op, take no action and tell the user there is nothing to do.

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" workflow-init-instructions`
