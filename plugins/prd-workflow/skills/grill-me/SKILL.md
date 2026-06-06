---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when the user wants to stress-test a plan, get grilled on their design, or mentions "grill me". Don't use it to produce a committed PRD or create issues — that's create-feature-prd / create-capability-prd.
allowed-tools: Bash(python3 "*/scripts/prd_tool.pyz":*), Bash(python3 */scripts/prd_tool.pyz:*)
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer first, with reasoning.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead of asking. The project profile below (its "Project" description and "Orientation docs") tells you what this repo is and where to orient when the design touches existing structure — if it's empty, explore the codebase yourself to build that context:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" profile`

This is the shared interview discipline behind `create-feature-prd` and `create-capability-prd`; on its own it just stress-tests a plan and produces no artifact.
