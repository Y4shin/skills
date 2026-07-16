---
name: size-slices
description: >
  Assign t-shirt sizes to a task's slices. Uses grill-me to iterate through
  each slice one at a time. Called by slice-task. Can also be invoked
  independently to re-size slices.
---

# Size Slices — T-shirt sizing

## Prerequisites

Slice docs exist under `docs/tasks/<task-slug>/slices/`.

## Steps

1. Read the task's slice list from `task_slices <task-slug>`.

2. For each slice (in dependency order):
   a. Present: title, mode (HITL/AFK), blocked_by, acceptance criteria count.
   b. Via `grill-me`: "Size estimate? S (≤1h) / M (≤4h) / L (≤1d) / XL (>1d)"
   c. Give recommended answer with reasoning ("This touches one module with two
      acceptance criteria → S").
   d. After confirmation, `task_set <slice-path> size s|m|l|xl`.

3. Report a summary table: slice slug | mode | size | blocked_by.

**Handoff:** Returns to `slice-task`.