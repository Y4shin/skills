---
name: resume-workflow
description: >
  Resume work after interruption. Reads docs/tasks/state.yaml and artifact
  frontmatter to determine where you are and what to do next. Use when returning
  to a project after a break, or when the agent is unsure of current workflow
  state.
---

# Resume Workflow

## Steps

1. Check if `docs/tasks/state.yaml` exists. If not: "No active workflow. Run
   `/skill:onboard-workflow` to initialize, or `/skill:migrate-workflow` if
   migrating from prd-workflow."

2. Read state with `task_state`. Extract `active`, `last_action`, `next_action`.

3. If `active.task` is set, read `docs/tasks/<slug>/task.md` frontmatter via
   `task_show <slug>`. Report task title, status, remaining slices (via
   `task_slices <slug>`).

4. If `active.slice` is set, resolve and read the slice doc. Report status,
   test plan, size estimate.

5. Report a clean summary:
   ```
   Active: task "<title>" (<slug>) — status: <status>
   Active slice: #<n> "<title>" (<slug>) — status: <status>, size: <size>
   Last action: <last_action>
   Next: <next_action>
   ```

6. If `next_action` names a skill, suggest exactly: "Run
   `/skill:<next_action>` to continue."

**Handoff:** None — this is a read-only diagnostic. The agent decides what to
do with the information.