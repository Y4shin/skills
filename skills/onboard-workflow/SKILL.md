---
name: onboard-workflow
description: >
  Initialize a repository for task-workflow. Creates docs/tasks/ directory
  structure, state.yaml, and CHANGELOG.md. Use on a fresh repo that has never
  used prd-workflow or task-workflow before. For repos migrating from the old
  prd-workflow, use /skill:migrate-workflow instead.
---

# Onboard Workflow — Initialize a fresh repo

## Steps

0. **Remote sync check.**

   ```
   git fetch origin
   ```

   If remote has commits ahead (`git rev-list --count HEAD..@{u}` > 0),
   **stop and ask** before proceeding:

   ```
   const ahead = parseInt(bash("git rev-list --count HEAD..@{u}"))
   if (ahead > 0) {
     const action = await ask_user_question({
       header: "Remote ahead",
       question: `Remote origin/main has ${ahead} new commit(s) not in
your local branch. Pull before continuing?`,
       options: [
         { label: "Pull now",
           description: "Run git pull --rebase to sync." },
         { label: "Skip — continue anyway",
           description: "Proceed without pulling." }
       ]
     })
     if (action === "Pull now") bash("git pull --rebase")
   }
   ```

   If pull fails with conflicts, stop — resolve manually.

1. **Check gate.** Run `task_workflow_gate`. If `docs/tasks/` already exists,
   stop and report:
   "This repo is already initialized. If you need to migrate from the old
   prd-workflow (docs/prd/), use `/skill:migrate-workflow`."

2. **Create directory structure:**

   ```bash
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/epics/archive
   ```

3. **Create `docs/tasks/state.yaml`:**

   ```yaml
   active:
     task: null
     slice: null
     epic: null
   last_action: onboard-workflow initialized repo
   next_action: create-task
   ```

4. **Create `docs/tasks/CHANGELOG.md`:**

   ```markdown
   # Task Changelog
   ```

5. **Create `docs/testing.md` (project test conventions):**

   Write a starter file at the project root that the team can fill in:

   ```markdown
   # Testing conventions

   > Project-level test infrastructure and conventions.
   > Fill in the sections below for your project.

   ## Framework(s)

   <!-- e.g. vitest, pytest, jest, go test, rsync … -->

   ## Test types available

   <!-- Which of these apply? Delete the rest. -->
   - Unit tests
   - Integration tests
   - End-to-end tests
   - Property-based / fuzz tests
   - Snapshot tests

   ## Running tests

   <!-- Exact commands -->
   - **Single file:**
   - **Watch mode:**
   - **Full suite:**
   - **Coverage:**

   ## File conventions

   <!-- e.g. `*.test.ts` co-located with source, `tests/` directory, etc. -->

   ## Mocking / faking / fixtures

   <!-- Conventions for test doubles, fixture factories, seed data. -->

   ## CI integration

   <!-- How tests run in CI, any required secrets or services. -->
   ```

6. **Commit:** `chore: initialize task-workflow`.

7. **Report:** "Ready. Run `/skill:create-task` to start your first task."

**Handoff:** → `create-task`
