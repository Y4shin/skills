---
name: summarize-task
description: >
  Write a changelog entry for a completed task before its directory is archived.
  Called by finalize-task. Appends a 3–5 line summary to
  docs/tasks/CHANGELOG.md.
---

# Summarize Task — Changelog entry

## Steps

1. Read `docs/tasks/<slug>/task.md` — title, user stories, implementation notes.

2. Draft summary: date, title, slices shipped, key decisions, outcome.

3. Append to `docs/tasks/CHANGELOG.md`:
   ```markdown
   ## <YYYY-MM-DD> — <title> (`<slug>`)

   <Slices: <n>-<slug>, ...>. <Key decisions>. <Outcome in one sentence>.
   ```

4. Return to `finalize-task`.